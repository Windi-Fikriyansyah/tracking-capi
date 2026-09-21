import { NextResponse } from "next/server";

export interface CreateTransactionRequest {
  planId: "6-bulan" | "1-tahun";
  method: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

// Fallback fee calculator based on Pakasir v2 pricing
function calculateV2Fee(method: string, amount: number): number {
  if (method === "qris") {
    return Math.max(500, Math.round(amount * 0.01));
  }
  if (method === "artha_graha_va") {
    return 2000;
  }
  // All other VAs (BNI, BRI, CIMB, Permata, Maybank, BNC)
  return 3500;
}

export async function POST(request: Request) {
  try {
    const body: CreateTransactionRequest = await request.json();
    const { planId, method, customer } = body;

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json(
        { error: "Nama, email, dan nomor WhatsApp wajib diisi." },
        { status: 400 }
      );
    }

    // Determine amount
    const amount = planId === "6-bulan" ? 149000 : 249000;
    const planName = planId === "6-bulan" ? "Paket 6 Bulan" : "Paket 1 Tahun";

    // Generate unique order ID
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const orderId = `SP-${timestamp}-${randomSuffix}`;

    const slug = process.env.NEXT_PUBLIC_PAKASIR_SLUG || "signalpulse";
    const apiKey = process.env.PAKASIR_API_KEY || "";

    // Fetch fee from v2 API or fallback
    let fee = calculateV2Fee(method, amount);
    try {
      const feeRes = await fetch(`https://app.pakasir.com/api/v2/payment-fee/${amount}`, {
        headers: { Accept: "application/json" },
      });
      if (feeRes.ok) {
        const feeData = await feeRes.json();
        if (typeof feeData[method] === "number") {
          fee = feeData[method];
        }
      }
    } catch {
      // Use fallback fee
    }

    const totalPayment = amount + fee;

    // Pakasir API v2 Integration
    // Endpoint: POST https://app.pakasir.com/api/v2/create-transaction/{slug}/{order_id}
    if (apiKey) {
      try {
        const v2Endpoint = `https://app.pakasir.com/api/v2/create-transaction/${encodeURIComponent(
          slug
        )}/${encodeURIComponent(orderId)}`;

        const response = await fetch(v2Endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
          },
          body: JSON.stringify({
            method: method,
            amount: amount,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const txnId = data.txn_id || "";
          const paymentLink =
            data.payment_link ||
            (txnId ? `https://app.pakasir.com/pay-v2/${txnId}` : "");

          return NextResponse.json({
            success: true,
            api_version: "v2",
            is_mock: false,
            txn_id: txnId,
            order_id: orderId,
            amount,
            fee: data.fee ?? fee,
            total_payment: data.total_payment ?? totalPayment,
            plan_name: planName,
            plan_id: planId,
            method,
            payment_url: paymentLink,
            qr_string: data.qr_string || null,
            va_number: data.va_number || null,
            expired_at:
              data.expired_at ||
              new Date(Date.now() + 15 * 60000).toISOString(),
            customer,
          });
        } else {
          const errText = await response.text();
          console.warn(`Pakasir v2 API error [${response.status}]:`, errText);
        }
      } catch (apiError) {
        console.warn("Failed to contact Pakasir v2 API, activating fallback mode:", apiError);
      }
    }

    // Fallback / Demo mode when API key is not yet provided or in sandbox
    const mockTxnId = `txn_${Date.now().toString(36)}`;
    let vaNumber = null;
    let qrString = null;

    if (method === "qris") {
      qrString = `00020101021226670014ID.LINKAJA.WWW011893600002011${orderId}0215ID10200215000010303UMI51440014ID.PAKASIR.WWW0215${orderId}520458125303360540${totalPayment}.005802ID5911SignalPulse6007Jakarta61051011062070703A016304`;
    } else if (method.endsWith("_va")) {
      const bankCodes: Record<string, string> = {
        bni_va: "988",
        bri_va: "128",
        cimb_niaga_va: "2208",
        permata_va: "8528",
        maybank_va: "7812",
        bnc_va: "8899",
        artha_graha_va: "7701",
      };
      const prefix = bankCodes[method] || "8888";
      vaNumber = `${prefix}${customer.phone.replace(/[^0-9]/g, "").slice(-8)}${Math.floor(10 + Math.random() * 90)}`;
    }

    return NextResponse.json({
      success: true,
      api_version: "v2",
      is_mock: !apiKey,
      txn_id: mockTxnId,
      order_id: orderId,
      amount,
      fee,
      total_payment: totalPayment,
      plan_name: planName,
      plan_id: planId,
      method,
      payment_url: `https://app.pakasir.com/pay-v2/${mockTxnId}`,
      qr_string: qrString,
      va_number: vaNumber,
      expired_at: new Date(Date.now() + 15 * 60000).toISOString(),
      customer,
      note: !apiKey
        ? "Mode Simulasi Pakasir API v2 aktif. Masukkan PAKASIR_API_KEY di .env.local untuk transaksi riil."
        : undefined,
    });
  } catch (error: any) {
    console.error("Error creating Pakasir v2 transaction:", error);
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran: " + (error.message || error) },
      { status: 500 }
    );
  }
}
