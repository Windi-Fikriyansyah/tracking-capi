import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey, accountId, action } = body;

    if (!apiKey || !accountId) {
      return NextResponse.json(
        { success: false, message: "apiKey dan accountId diperlukan." },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();

    if (action === "create" || action === "provision") {
      // Call POST /v1/whatsapp/dataset
      const res = await fetch("https://zernio.com/api/v1/whatsapp/dataset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleanKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ accountId }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return NextResponse.json({
          success: true,
          datasetId: data.datasetId,
          created: data.created ?? false,
          message: "Dataset Meta CAPI berhasil dibuat / dihubungkan di Zernio.",
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: data.error || data.message || "Gagal membuat dataset di Meta.",
          },
          { status: res.status }
        );
      }
    } else {
      // Call GET /v1/whatsapp/dataset?accountId=...
      const res = await fetch(
        `https://zernio.com/api/v1/whatsapp/dataset?accountId=${encodeURIComponent(
          accountId
        )}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${cleanKey}`,
            Accept: "application/json",
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return NextResponse.json({
          success: true,
          datasetId: data.datasetId || null,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: data.error || data.message || "Gagal mengecek dataset.",
          },
          { status: res.status }
        );
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json(
      { success: false, message: `Gagal memproses dataset CTWA: ${msg}` },
      { status: 500 }
    );
  }
}
