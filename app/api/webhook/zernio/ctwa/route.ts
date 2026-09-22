import { NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { getUserSubscription } from "@/lib/services/order-service";

export async function GET() {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhook/zernio/ctwa",
    description: "Endpoint webhook penerima event pesan Click-to-WhatsApp (CTWA) dari Zernio",
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    console.log("Inbound Zernio Webhook:", JSON.stringify(payload));

    // 1. Extract message, conversation, sender, and account objects from Zernio webhook
    const message = payload.message || {};
    const sender = message.sender || {};
    const conversation = payload.conversation || {};
    const account = payload.account || {};
    const metadata = conversation.metadata || message.metadata || payload.metadata || {};
    const referral = message.referral || conversation.referral || metadata.referral || {};

    // 2. Extract Click ID (ctwa_clid) and referral details if from CTWA Ad
    const ctwa_clid =
      metadata.ctwa_clid ||
      metadata.ctwaClid ||
      referral.ctwa_clid ||
      referral.ctwaClid ||
      message.referral?.ctwa_clid ||
      message.referral?.ctwaClid ||
      conversation.referral?.ctwa_clid ||
      conversation.referral?.ctwaClid ||
      payload.ctwa_clid ||
      payload.ctwaClid ||
      payload.data?.ctwa_clid ||
      payload.data?.referral?.ctwa_clid ||
      null;

    const ctwa_source_id =
      metadata.ctwa_source_id ||
      referral.source_id ||
      referral.sourceId ||
      message.referral?.source_id ||
      null;

    const ctwa_headline =
      metadata.ctwa_headline ||
      referral.headline ||
      message.referral?.headline ||
      (ctwa_clid ? "Iklan Click to WhatsApp" : "Pesan Masuk Organik (Non-Iklan)");

    // 3. Extract phone number robustly from Zernio payload
    const phoneRaw =
      sender.phoneNumber ||
      conversation.participantUsername ||
      sender.id ||
      conversation.platformConversationId ||
      conversation.participantId ||
      payload.phone ||
      (typeof payload.sender === "string" ? payload.sender : "") ||
      "";

    const phoneE164 = String(phoneRaw).replace(/\D/g, "");
    if (!phoneE164) {
      console.warn("No valid phone number found in Zernio webhook payload:", JSON.stringify(payload));
      return NextResponse.json({
        received: true,
        message: "Payload diterima tapi tidak ada nomor telepon valid.",
      });
    }

    const formattedPhone = String(phoneRaw).startsWith("+") ? String(phoneRaw) : `+${phoneE164}`;
    const contactName =
      sender.name ||
      conversation.participantName ||
      `WhatsApp ${phoneE164.slice(-4)}`;

    const conversationId = conversation.id || message.conversationId || payload.conversationId || null;

    // 4. Find account settings in Supabase
    let userId = "75eecdf5-4f1c-4a7e-b8e2-8750e3ce7020";
    let apiKey: string | null = null;
    let accountId: string | null = account.id || null;
    let event1Name = "LeadSubmitted";
    let autoSend = true;

    if (isSupabaseConfigured) {
      // Find matching user by wa_waba_id or get the primary configured user
      let settings = null;
      if (account.id) {
        const { data: matched } = await supabase
          .from("app_settings")
          .select("*")
          .eq("wa_waba_id", account.id)
          .maybeSingle();
        settings = matched;
      }

      if (!settings) {
        const { data: anyUser } = await supabase
          .from("app_settings")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        settings = anyUser;
      }

      if (settings) {
        userId = settings.user_id || userId;
        apiKey = settings.zernio_api_key;
        accountId = settings.wa_waba_id || accountId;
        event1Name = settings.ctwa_event_1 || "LeadSubmitted";
        autoSend = settings.ctwa_auto_send !== false;
      }
    }

    let event1Status: "sent" | "pending" | "failed" = "pending";
    let event1TraceId: string | null = null;

    // 5. Cek status aktif paket langganan sebelum mengirim event CAPI
    const sub = await getUserSubscription(userId);

    if (sub.isExpired) {
      console.warn(
        `[CAPI Blocked]: Langganan akun (${userId}) telah berakhir (${sub.formattedExpiresAt}). Event CTWA tidak diteruskan ke Meta Conversions API.`
      );
      event1Status = "failed";
    } else if (ctwa_clid) {
      // Auto-dispatch Event 1 to Meta via Zernio ONLY if ctwa_clid exists and subscription is active
      if (autoSend && apiKey && accountId) {
        try {
          console.log(`Mengirim otomatis Event 1 (${event1Name}) untuk kontak iklan CTWA: ${phoneE164} (clid: ${ctwa_clid})`);
          const zernioRes = await fetch("https://zernio.com/api/v1/whatsapp/conversions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              accountId,
              phoneE164,
              conversationId: conversationId || undefined,
              eventName: event1Name,
              eventId: `ctwa_auto_${Date.now()}_${phoneE164.slice(-4)}`,
            }),
          });

          const zernioData = await zernioRes.json().catch(() => ({}));
          if (zernioRes.ok && (zernioData.eventsReceived > 0 || zernioData.traceId)) {
            event1Status = "sent";
            event1TraceId = zernioData.traceId || null;
            console.log("Auto-send Event 1 berhasil:", event1TraceId);
          } else {
            event1Status = "failed";
            console.warn("Auto-send Event 1 gagal:", zernioData);
          }
        } catch (sendErr) {
          console.error("Auto-send Event 1 error:", sendErr);
          event1Status = "failed";
        }
      } else {
        console.log(`Kontak memiliki ctwa_clid (${ctwa_clid}), tetapi auto-send Event 1 nonaktif.`);
      }
    } else {
      console.log(`Kontak ${phoneE164} masuk tanpa ctwa_clid (organik). Event 1 tidak dikirim otomatis untuk mencegah error 422 Meta.`);
    }

    // 6. Check if lead already exists in Supabase ctwa_leads
    if (isSupabaseConfigured) {
      const { data: existingLead } = await supabase
        .from("ctwa_leads")
        .select("*")
        .eq("user_id", userId)
        .eq("phone_e164", phoneE164)
        .maybeSingle();

      const leadId = existingLead?.id || `lead_${Date.now()}_${phoneE164.slice(-4)}`;

      const leadRecord = {
        id: leadId,
        user_id: userId,
        phone: formattedPhone,
        phone_e164: phoneE164,
        contact_name: contactName,
        ctwa_clid: ctwa_clid || existingLead?.ctwa_clid || null,
        ctwa_source_id: ctwa_source_id || existingLead?.ctwa_source_id || null,
        ctwa_headline: ctwa_headline || existingLead?.ctwa_headline || null,
        conversation_id: conversationId || existingLead?.conversation_id || null,
        event_1_name: existingLead?.event_1_name || event1Name,
        event_1_status: existingLead?.event_1_status === "sent" ? "sent" : event1Status,
        event_1_trace_id: existingLead?.event_1_trace_id || event1TraceId,
        event_1_sent_at:
          existingLead?.event_1_sent_at || (event1Status === "sent" ? new Date().toISOString() : null),
        event_2_name: existingLead?.event_2_name || null,
        event_2_status: existingLead?.event_2_status || "pending",
        event_2_trace_id: existingLead?.event_2_trace_id || null,
        event_2_sent_at: existingLead?.event_2_sent_at || null,
        event_3_name: existingLead?.event_3_name || null,
        event_3_status: existingLead?.event_3_status || "pending",
        event_3_trace_id: existingLead?.event_3_trace_id || null,
        event_3_sent_at: existingLead?.event_3_sent_at || null,
        event_4_name: existingLead?.event_4_name || null,
        event_4_status: existingLead?.event_4_status || "pending",
        event_4_trace_id: existingLead?.event_4_trace_id || null,
        event_4_sent_at: existingLead?.event_4_sent_at || null,
        event_4_value: existingLead?.event_4_value || 0,
        created_at: existingLead?.created_at || new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from("ctwa_leads").upsert(leadRecord);
      if (upsertError) {
        console.error("Gagal menyimpan lead ke Supabase ctwa_leads:", upsertError);
      } else {
        console.log("Berhasil menyimpan lead WhatsApp:", formattedPhone, "Clid:", ctwa_clid);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Webhook CTWA berhasil diproses.",
      lead: {
        phone: formattedPhone,
        phone_e164: phoneE164,
        contact_name: contactName,
        ctwa_clid,
        event_1_status: event1Status,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    console.error("Webhook processing error:", msg);
    return NextResponse.json(
      { success: false, message: `Webhook error: ${msg}` },
      { status: 500 }
    );
  }
}
