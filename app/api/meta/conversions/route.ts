import { NextResponse } from "next/server";
import { sendMetaPixelEvent } from "@/lib/services/meta-capi-service";
import { getUserSubscription } from "@/lib/services/order-service";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let {
      pixelId,
      accessToken,
      testCode,
      eventName,
      phone,
      name,
      email,
      eventId,
      eventSourceUrl,
      value,
      currency,
      userId,
      userEmail,
    } = body;

    // 1. Validasi Langganan User
    const targetUser = userEmail || userId;
    if (targetUser) {
      const sub = await getUserSubscription(targetUser);
      if (sub.isExpired) {
        return NextResponse.json(
          {
            success: false,
            error: `Masa aktif langganan Anda (${sub.planName}) telah berakhir pada ${sub.formattedExpiresAt}. Silakan perpanjang paket untuk melanjutkan pengiriman event Meta CAPI.`,
            isExpired: true,
          },
          { status: 403 }
        );
      }
    }

    // 2. Jika pixelId atau accessToken belum ada di body, ambil dari app_settings di Supabase
    if ((!pixelId || !accessToken) && userId && isSupabaseConfigured) {
      try {
        const { data: settings } = await supabase
          .from("app_settings")
          .select("meta_pixel_id, meta_access_token, meta_test_code, is_meta_connected")
          .eq("user_id", userId)
          .maybeSingle();

        if (settings) {
          if (!pixelId && settings.meta_pixel_id) {
            pixelId = settings.meta_pixel_id;
          }
          if (!accessToken && settings.meta_access_token) {
            accessToken = settings.meta_access_token;
          }
          if (!testCode && settings.meta_test_code) {
            testCode = settings.meta_test_code;
          }
        }
      } catch {
        // fallback
      }
    }

    // 3. Validasi Kelengkapan Parameter Utama
    if (!pixelId || typeof pixelId !== "string" || !pixelId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixel / Dataset ID belum diatur. Silakan hubungkan Meta Ads terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta CAPI Access Token belum diatur. Silakan periksa pengaturan Meta Ads Anda.",
        },
        { status: 400 }
      );
    }

    if (!eventName || typeof eventName !== "string" || !eventName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Nama event konversi tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Nomor WhatsApp prospek tidak boleh kosong untuk pengiriman CAPI.",
        },
        { status: 400 }
      );
    }

    // 4. Ambil Client IP & User Agent dari request headers untuk Advanced Matching
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined;
    const clientUserAgent = request.headers.get("user-agent") || undefined;

    // 5. Kirim Event ke Meta Graph API v19.0
    const result = await sendMetaPixelEvent({
      pixelId: pixelId.trim(),
      accessToken: accessToken.trim(),
      eventName: eventName.trim(),
      eventId: eventId?.trim() || undefined,
      eventSourceUrl: eventSourceUrl || undefined,
      actionSource: (body.actionSource as "website" | "chat" | "other") || "chat",
      testCode: testCode?.trim() || undefined,
      customerData: {
        phone: phone.trim(),
        name: name?.trim() || undefined,
        email: email?.trim() || undefined,
        clientIpAddress: clientIp,
        clientUserAgent,
      },
      customData:
        eventName === "Purchase"
          ? {
              value: typeof value === "number" && value > 0 ? value : 150000,
              currency: currency || "IDR",
            }
          : typeof value === "number"
          ? {
              value,
              currency: currency || "IDR",
            }
          : undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal mengirim event konversi ke Meta Graph API.",
          eventId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Event '${eventName}' berhasil dikirim ke Meta Pixel ${pixelId.trim()}.`,
      eventId,
      traceId: result.fbtraceId || eventId,
      eventsReceived: result.eventsReceived,
      fbtraceId: result.fbtraceId,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan internal pada server.";
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
