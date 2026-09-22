import { NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/services/order-service";

const SUPPORTED_CTWA_EVENTS = [
  "LeadSubmitted",
  "Purchase",
  "AddToCart",
  "InitiateCheckout",
  "ViewContent",
];

/**
 * Resolves the true 24-character Zernio Account ID for WhatsApp
 * (in case the user/settings provided the 16-digit Meta WABA ID instead)
 */
async function resolveWhatsAppAccountId(key: string, providedId?: string): Promise<string | null> {
  try {
    const accRes = await fetch("https://zernio.com/api/v1/accounts", {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    if (!accRes.ok) return null;
    const accData = await accRes.json().catch(() => ({}));
    if (!Array.isArray(accData.accounts)) return null;

    // 1. Try matching provided ID against _id, id, metadata.wabaId, or platformUserId
    if (providedId) {
      const match = accData.accounts.find(
        (a: { _id?: string; id?: string; metadata?: { wabaId?: string }; platformUserId?: string }) =>
          a._id === providedId ||
          a.id === providedId ||
          a.metadata?.wabaId === providedId ||
          (typeof a.platformUserId === "string" && a.platformUserId.includes(providedId))
      );
      if (match) return match._id || match.id || null;
    }

    // 2. Otherwise find the first WhatsApp account
    const wa = accData.accounts.find(
      (a: { platform?: string; _id?: string; id?: string }) => a.platform === "whatsapp"
    );
    return wa ? wa._id || wa.id || null : null;
  } catch {
    return null;
  }
}

/**
 * Ensures Meta CAPI dataset is provisioned for this WhatsApp account
 */
async function ensureDatasetProvisioned(key: string, accountId: string): Promise<boolean> {
  try {
    const res = await fetch("https://zernio.com/api/v1/whatsapp/dataset", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ accountId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      apiKey,
      accountId,
      eventName,
      phoneE164,
      conversationId,
      eventId,
      value,
      currency,
      testCode,
      userEmail,
      userId,
    } = body;

    // Cek batas masa aktif langganan jika identitas user disertakan
    const targetUser = userEmail || userId;
    if (targetUser) {
      const sub = await getUserSubscription(targetUser);
      if (sub.isExpired) {
        return NextResponse.json(
          {
            success: false,
            message: `Masa aktif langganan Anda (${sub.planName}) telah berakhir pada ${sub.formattedExpiresAt}. Silakan perpanjang paket Anda untuk melanjutkan pengiriman event CAPI.`,
            isExpired: true,
          },
          { status: 403 }
        );
      }
    }

    if (!apiKey || typeof apiKey !== "string") {
      return NextResponse.json(
        { success: false, message: "API Key Zernio tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!accountId || typeof accountId !== "string") {
      return NextResponse.json(
        { success: false, message: "Account ID WhatsApp Zernio tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (!eventName || !SUPPORTED_CTWA_EVENTS.includes(eventName)) {
      return NextResponse.json(
        {
          success: false,
          message: `Nama event '${eventName}' tidak didukung oleh Meta CTWA. Gunakan salah satu dari: ${SUPPORTED_CTWA_EVENTS.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    if (!phoneE164 && !conversationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Harus menyertakan phoneE164 atau conversationId untuk atribusi CTWA.",
        },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();
    let targetAccountId = accountId.trim();

    // If accountId is not a 24-character hex MongoDB ID (e.g. numeric Meta WABA ID), resolve it!
    if (!/^[a-f\d]{24}$/i.test(targetAccountId)) {
      const resolved = await resolveWhatsAppAccountId(cleanKey, targetAccountId);
      if (resolved) {
        targetAccountId = resolved;
      }
    }

    // Clean phoneE164 to digits only, without plus
    const cleanPhone = phoneE164 ? String(phoneE164).replace(/\D/g, "") : undefined;
    const cleanEventId = eventId || `ctwa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Only pass conversationId if it is a valid 24-character hexadecimal MongoDB ObjectId
    const isValidConvId =
      Boolean(conversationId) && /^[a-f\d]{24}$/i.test(String(conversationId).trim());

    const sendPayload = (accId: string, includeConv = true) => {
      const payload: Record<string, unknown> = {
        accountId: accId,
        eventName,
        eventId: cleanEventId,
      };

      if (includeConv && isValidConvId) {
        payload.conversationId = String(conversationId).trim();
      }
      if (cleanPhone) payload.phoneE164 = cleanPhone;
      if (typeof value === "number" && !isNaN(value)) payload.value = value;
      if (currency) payload.currency = currency;
      if (testCode && String(testCode).trim().length > 0) {
        payload.testCode = String(testCode).trim();
      }
      return payload;
    };

    // First attempt to send conversion
    let res = await fetch("https://zernio.com/api/v1/whatsapp/conversions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(sendPayload(targetAccountId, true)),
    });

    let data = await res.json().catch(() => ({}));

    // If conversationId format error, retry immediately without conversationId
    let errString = String(data.error || data.message || "");
    if (!res.ok && (errString.toLowerCase().includes("conversationid") || res.status === 400)) {
      res = await fetch("https://zernio.com/api/v1/whatsapp/conversions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(sendPayload(targetAccountId, false)),
      });
      data = await res.json().catch(() => ({}));
      errString = String(data.error || data.message || "");
    }

    // If account not found error, try resolving account and retry
    if (!res.ok && (res.status === 404 || errString.toLowerCase().includes("account not found"))) {
      const reResolved = await resolveWhatsAppAccountId(cleanKey);
      if (reResolved && reResolved !== targetAccountId) {
        targetAccountId = reResolved;
        res = await fetch("https://zernio.com/api/v1/whatsapp/conversions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(sendPayload(targetAccountId, isValidConvId)),
        });
        data = await res.json().catch(() => ({}));
        errString = String(data.error || data.message || "");
      }
    }

    // If dataset ID not configured error, auto-provision and retry
    if (!res.ok && res.status === 422 && errString.toLowerCase().includes("dataset id is not configured")) {
      await ensureDatasetProvisioned(cleanKey, targetAccountId);
      res = await fetch("https://zernio.com/api/v1/whatsapp/conversions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(sendPayload(targetAccountId)),
      });
      data = await res.json().catch(() => ({}));
    }

    if (res.ok) {
      return NextResponse.json({
        success: true,
        eventsReceived: data.eventsReceived ?? 1,
        eventsFailed: data.eventsFailed ?? 0,
        failures: data.failures || [],
        traceId: data.traceId || null,
        platform: data.platform || "metaads",
        message: `Event '${eventName}' berhasil dikirim ke Meta CAPI via Zernio.`,
        raw: data,
      });
    } else {
      let friendlyMessage = data.error || data.message || `Gagal mengirim event (Status ${res.status})`;

      // Translate common Meta CAPI rejection reasons into clear actionable Indonesian explanations
      if (
        friendlyMessage.includes("no captured ctwa_clid") ||
        friendlyMessage.includes("did not originate from a Click-to-WhatsApp ad")
      ) {
        friendlyMessage =
          "Kontak ini merupakan pesan organik (tanpa Click ID iklan Meta). Meta CAPI hanya menerima event konversi untuk kontak yang berasal dari iklan Click-to-WhatsApp.";
      } else if (friendlyMessage.includes("No CTWA-attributed conversation found")) {
        friendlyMessage =
          "Tidak ditemukan percakapan iklan CTWA untuk nomor ini di WhatsApp Zernio. Nomor ini belum memiliki percakapan aktif yang dimulai dari klik iklan Meta Ads.";
      } else if (friendlyMessage.includes("account not found")) {
        friendlyMessage =
          "Akun WhatsApp tidak ditemukan di Zernio. Pastikan akun WhatsApp sudah terhubung di menu Connect WhatsApp.";
      } else if (friendlyMessage.includes("Invalid conversationId format")) {
        friendlyMessage =
          "Format ID percakapan tidak valid untuk Zernio (harus 24 karakter hex).";
      }

      return NextResponse.json(
        {
          success: false,
          status: res.status,
          message: friendlyMessage,
          raw: data,
        },
        { status: res.status }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json(
      { success: false, message: `Gagal mengirim event CTWA: ${msg}` },
      { status: 500 }
    );
  }
}
