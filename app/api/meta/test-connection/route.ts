import { NextResponse } from "next/server";
import { testMetaPixelConnection } from "@/lib/services/meta-capi-service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { pixelId, accessToken } = body;

    if (!pixelId || typeof pixelId !== "string" || !pixelId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Pixel / Dataset ID tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    if (!accessToken || typeof accessToken !== "string" || !accessToken.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Meta CAPI Access Token tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    const result = await testMetaPixelConnection(pixelId.trim(), accessToken.trim());

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Gagal menghubungi Meta Graph API.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pixel: {
        id: result.id,
        name: result.name,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan internal server.";
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
