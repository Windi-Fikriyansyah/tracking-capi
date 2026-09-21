import { NextResponse } from "next/server";

// Fallback fee table based on Pakasir v2 official pricing
// QRIS: 1% (min 500), VA Artha Graha: 2000, other VA: 3500
function getFallbackFees(amount: number): Record<string, number> {
  const qrisFee = Math.max(500, Math.round(amount * 0.01));
  return {
    qris: qrisFee,
    bni_va: 3500,
    bri_va: 3500,
    cimb_niaga_va: 3500,
    permata_va: 3500,
    maybank_va: 3500,
    bnc_va: 3500,
    artha_graha_va: 2000,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get("amount");
    const amount = amountStr ? parseInt(amountStr, 10) : 149000;

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Parameter amount tidak valid" },
        { status: 400 }
      );
    }

    try {
      // Official Pakasir v2 Fee Calculator API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `https://app.pakasir.com/api/v2/payment-fee/${amount}`,
        {
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const fees = await response.json();
        return NextResponse.json({
          success: true,
          amount,
          source: "pakasir_v2_live",
          fees,
        });
      }
    } catch (fetchErr) {
      console.warn("Could not reach Pakasir fee API directly, using v2 standard fallback:", fetchErr);
    }

    // Fallback if external API times out
    return NextResponse.json({
      success: true,
      amount,
      source: "v2_calculated_fallback",
      fees: getFallbackFees(amount),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Gagal mengambil rincian biaya" },
      { status: 500 }
    );
  }
}
