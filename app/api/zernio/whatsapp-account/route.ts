import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const apiKey = body.apiKey;
    const accountId = body.accountId;

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "API Key Zernio tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    const cleanKey = apiKey.trim();

    // Query Zernio GET /api/v1/accounts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://zernio.com/api/v1/accounts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengambil akun dari Zernio (Status ${res.status}): ${errText}`,
        },
        { status: res.status }
      );
    }

    const data = await res.json().catch(() => null);

    if (!data || !Array.isArray(data.accounts)) {
      return NextResponse.json(
        {
          success: false,
          message: "Format respons dari Zernio tidak memiliki daftar akun.",
          raw: data,
        },
        { status: 500 }
      );
    }

    // Find WhatsApp account
    // 1. First by accountId if provided
    // 2. Otherwise any account with platform === 'whatsapp'
    let waAccount = null;
    if (accountId) {
      waAccount = data.accounts.find(
        (acc: { _id?: string; id?: string }) =>
          acc._id === accountId || acc.id === accountId
      );
    }
    if (!waAccount) {
      waAccount = data.accounts.find(
        (acc: { platform?: string }) => acc.platform === "whatsapp"
      );
    }

    if (!waAccount) {
      return NextResponse.json(
        {
          success: false,
          message: "Tidak ditemukan akun WhatsApp yang terhubung di profil Zernio ini.",
          rawAccounts: data.accounts,
        },
        { status: 404 }
      );
    }

    const meta = waAccount.metadata || {};
    const phone =
      meta.displayPhoneNumber ||
      waAccount.username ||
      waAccount.phoneNumber ||
      "-";
    const name =
      meta.verifiedName ||
      waAccount.displayName ||
      waAccount.name ||
      "WhatsApp Business Account";
    const wabaId = meta.wabaId || waAccount.platformUserId?.split(":")[0] || waAccount._id;
    const phoneNumberId = meta.phoneNumberId || waAccount.platformUserId?.split(":")[1] || null;
    const qualityRating = meta.qualityRating || "GREEN";
    const zernioAccountId = waAccount._id || waAccount.id || accountId;
    const connectedAt = meta.connectedAt || waAccount.createdAt || new Date().toISOString();

    return NextResponse.json({
      success: true,
      account: {
        id: zernioAccountId,
        phone,
        wabaName: name,
        wabaId,
        phoneNumberId,
        qualityRating,
        status: waAccount.platformStatus || (waAccount.isActive ? "active" : "inactive"),
        connectedAt,
        raw: waAccount,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan internal";
    return NextResponse.json(
      {
        success: false,
        message: `Terjadi kesalahan saat memproses data akun Zernio: ${msg}`,
      },
      { status: 500 }
    );
  }
}
