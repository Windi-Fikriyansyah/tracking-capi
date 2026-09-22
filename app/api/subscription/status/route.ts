import { NextResponse } from "next/server";
import { getUserSubscription } from "@/lib/services/order-service";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * GET /api/subscription/status
 * Cek status aktif dan tanggal kedaluwarsa paket langganan pengguna saat ini.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let email = searchParams.get("email");
    const userId = searchParams.get("userId");

    // 1. Jika email tidak disediakan di query, coba ambil dari session Supabase Auth
    if (!email && isSupabaseConfigured) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          email = user.email;
        }
      } catch {
        // ignore
      }
    }

    // 2. Jika tetap tidak ada email, fallback ke userId jika ada
    const targetKey = email || userId || "";

    if (!targetKey) {
      return NextResponse.json({
        success: true,
        hasSubscription: false,
        isExpired: true,
        planId: "6-bulan",
        planName: "Belum Berlangganan",
        daysLeft: 0,
        formattedExpiresAt: "-",
        message: "Email atau user ID tidak disertakan.",
      });
    }

    const sub = await getUserSubscription(targetKey);

    return NextResponse.json({
      success: true,
      ...sub,
    });
  } catch (error: any) {
    console.error("[Subscription Status Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Gagal mengambil status langganan",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscription/status
 * Cek status langganan via JSON body (untuk pemanggilan internal / server-side)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body.email || body.userEmail || body.userId;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          hasSubscription: false,
          isExpired: true,
          message: "Email wajib disertakan.",
        },
        { status: 400 }
      );
    }

    const sub = await getUserSubscription(email);

    return NextResponse.json({
      success: true,
      ...sub,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error" },
      { status: 500 }
    );
  }
}
