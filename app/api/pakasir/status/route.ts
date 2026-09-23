import { NextResponse } from "next/server";
import {
  getOrder,
  updateOrder,
  calculateExpirationDate,
  getUserSubscription,
  findOrderByEmail,
} from "@/lib/services/order-service";
import { sendLoginAccessEmail } from "@/lib/services/email-service";
import { createClient } from "@supabase/supabase-js";

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
            const paidAt = statusData.completed_at || new Date().toISOString();

            // Hitung akumulasi masa aktif
            const existingSub = await getUserSubscription(order.customer.email);
            let baseStartDate = paidAt;
            if (existingSub.hasSubscription && !existingSub.isExpired && existingSub.expiresAt) {
              baseStartDate = existingSub.expiresAt;
            }
            const expiresAt = calculateExpirationDate(order.planId, baseStartDate);

            // Jika pembeli lama, tetap gunakan password lama
            const previousOrder = await findOrderByEmail(order.customer.email);
            const existingPassword =
              previousOrder && previousOrder.status === "completed" && previousOrder.loginPassword
                ? previousOrder.loginPassword
                : undefined;

            const loginPassword = existingPassword || order.loginPassword || generateRandomPassword();

            // Provision Supabase Auth
            let isExistingUser = false;
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            if (supabaseUrl && serviceRoleKey) {
              try {
                const adminClient = createClient(supabaseUrl, serviceRoleKey, {
                  auth: { autoRefreshToken: false, persistSession: false },
                });
                const { data: usersList } = await adminClient.auth.admin.listUsers();
                const existingUser = usersList?.users?.find(
                  (u) => u.email?.toLowerCase() === order.customer.email.toLowerCase()
                );
                if (existingUser) {
                  isExistingUser = true;
                  await adminClient.auth.admin.updateUserById(existingUser.id, {
                    email_confirm: true,
                    user_metadata: {
                      ...existingUser.user_metadata,
                      name: order.customer.name || existingUser.user_metadata?.name,
                      plan_id: order.planId,
                      plan_name: order.planName,
                      expires_at: expiresAt,
                      last_renewed_at: new Date().toISOString(),
                    },
                  });
                } else {
                  await adminClient.auth.admin.createUser({
                    email: order.customer.email,
                    password: loginPassword,
                    email_confirm: true,
                    user_metadata: {
                      name: order.customer.name,
                      role: "customer",
                      plan_id: order.planId,
                      plan_name: order.planName,
                      expires_at: expiresAt,
                    },
                  });
                }
              } catch (e: any) {
                console.warn("[Status Polling] Supabase provision exception:", e.message);
              }
            }

            let formattedExpiresAt: string | undefined;
            try {
              formattedExpiresAt = new Date(expiresAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            } catch {
              // ignore
            }

            const emailResult = await sendLoginAccessEmail({
              to: order.customer.email,
              customerName: order.customer.name,
              planName: order.planName,
              orderId: order.orderId,
              loginPassword,
              isExistingUser,
              formattedExpiresAt,
            });

            await updateOrder(order.orderId, {
              status: "completed",
              paidAt,
              expiresAt,
              loginPassword,
              emailSent: emailResult.success,
              emailSentAt: new Date().toISOString(),
            });

            return NextResponse.json({
              status: "completed",
              paid: true,
              order_id: order.orderId,
              paid_at: paidAt,
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
