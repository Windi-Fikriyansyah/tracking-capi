import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = body.apiKey;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Koneksi Gagal: API Key Zernio tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();

    // Check minimum length
    if (cleanKey.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Koneksi Gagal: Format API Key terlalu pendek (minimal 8 karakter).",
        },
        { status: 400 }
      );
    }

    // Call official Zernio API endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const zernioRes = await fetch("https://zernio.com/api/v1/profiles", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (zernioRes.ok) {
        return NextResponse.json({
          success: true,
          message: "Koneksi Berhasil! API Key Zernio valid dan terhubung (Status 200 OK).",
          status: zernioRes.status,
        });
      } else if (zernioRes.status === 401) {
        return NextResponse.json(
          {
            success: false,
            message: "Koneksi Gagal: Kunci API Zernio salah atau tidak valid (401 Unauthorized). Silakan periksa kembali API Key dari dashboard Zernio Anda.",
          },
          { status: 401 }
        );
      } else if (zernioRes.status === 403) {
        return NextResponse.json(
          {
            success: false,
            message: "Koneksi Gagal: Kunci API Zernio tidak memiliki hak akses yang cukup (403 Forbidden).",
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Koneksi Gagal: Server Zernio mengembalikan status ${zernioRes.status} (${zernioRes.statusText}).`,
          },
          { status: zernioRes.status }
        );
      }
    } catch (networkError: unknown) {
      const msg = networkError instanceof Error ? networkError.message : "Network error";
      return NextResponse.json(
        {
          success: false,
          message: `Koneksi Gagal: Tidak dapat menjangkau server Zernio (${msg}). Pastikan koneksi internet Anda aktif.`,
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json(
      { success: false, message: `Koneksi Gagal: ${errorMsg}` },
      { status: 500 }
    );
  }
}
