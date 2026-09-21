import { NextResponse } from "next/server";
import { getOrder, updateOrder } from "@/lib/services/order-service";
import { sendLoginAccessEmail } from "@/lib/services/email-service";

function generateRandomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TC-${randomStr}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        { error: "Parameter order_id wajib disertakan" },
        { status: 400 }
      );
    }

    const order = await getOrder(orderId);

    if (!order) {
      return NextResponse.json(
        { status: "not_found", paid: false, message: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    // 1. Jika sudah berstatus completed (via Webhook Pakasir)
    if (order.status === "completed") {
      return NextResponse.json({
        status: "completed",
        paid: true,
        order_id: order.orderId,
        paid_at: order.paidAt,
        plan_name: order.planName,
        email_sent: order.emailSent ?? false,
      });
    }

    // 2. Jika masih pending, cek langsung ke Pakasir Status API jika API Key tersedia
    const apiKey = process.env.PAKASIR_API_KEY;
    const slug = process.env.NEXT_PUBLIC_PAKASIR_SLUG || "Trackcapi";

    if (apiKey && order.txnId && !order.txnId.startsWith("txn_test_")) {
      try {
        const checkUrl = `https://app.pakasir.com/api/v2/transaction-status/${encodeURIComponent(
          slug
        )}/${encodeURIComponent(order.txnId)}`;

        const pakasirRes = await fetch(checkUrl, {
          headers: {
            "X-Api-Key": apiKey,
            Accept: "application/json",
          },
        });

        if (pakasirRes.ok) {
          const statusData = await pakasirRes.json();
          if (statusData.status === "completed") {
            // Webhook mungkin belum sampai tapi Pakasir sudah completed
            const loginPassword = order.loginPassword || generateRandomPassword();

            const emailResult = await sendLoginAccessEmail({
              to: order.customer.email,
              customerName: order.customer.name,
              planName: order.planName,
              orderId: order.orderId,
              loginPassword,
            });

            await updateOrder(order.orderId, {
              status: "completed",
              paidAt: statusData.completed_at || new Date().toISOString(),
              loginPassword,
              emailSent: emailResult.success,
              emailSentAt: new Date().toISOString(),
            });

            return NextResponse.json({
              status: "completed",
              paid: true,
              order_id: order.orderId,
              paid_at: statusData.completed_at,
              plan_name: order.planName,
              email_sent: emailResult.success,
            });
          }
        }
      } catch (checkErr) {
        console.warn("Error polling Pakasir status API:", checkErr);
      }
    }

    // 3. Masih pending (menunggu pembayaran / webhook)
    return NextResponse.json({
      status: "pending",
      paid: false,
      order_id: order.orderId,
      message: "Menunggu pembayaran dan konfirmasi webhook dari Pakasir",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal mengecek status transaksi: " + (err.message || err) },
      { status: 500 }
    );
  }
}
