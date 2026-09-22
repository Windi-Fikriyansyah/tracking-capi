import { NextResponse } from "next/server";
import {
  getOrder,
  updateOrder,
  calculateExpirationDate,
  getUserSubscription,
} from "@/lib/services/order-service";
import { sendLoginAccessEmail } from "@/lib/services/email-service";
import { createClient } from "@supabase/supabase-js";

export interface PakasirWebhookPayload {
  txn_id?: string;
  order_id: string;
  amount: number;
  is_sandbox?: boolean;
  status: string; // "completed"
  completed_at?: string;
  // Optional customer data if supplied in test payloads
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

/**
 * Generate a random, readable password for new customer access.
 * Example: TC-7k9p2m8x
 */
function generateRandomPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let randomStr = "";
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TC-${randomStr}`;
}

/**
 * Mendaftarkan akun user ke Supabase Auth jika belum terdaftar.
 */
async function provisionSupabaseUser(
  email: string,
  password: string,
  name: string,
  planId?: string,
  planName?: string,
  expiresAt?: string
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseUrl.startsWith("http")) {
    return { success: false, reason: "Supabase URL not configured" };
  }

  // 1. If service role key is present, use admin API (auto-confirm email)
  if (serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role: "customer",
          created_via: "pakasir_webhook",
          plan_id: planId || "6-bulan",
          plan_name: planName || "Paket 6 Bulan",
          expires_at: expiresAt,
        },
      });

      if (error) {
        // Jika user sudah terdaftar sebelumnya (misal perpanjangan paket / beli ulang)
        if (error.message?.toLowerCase().includes("already") || (error as any).status === 422) {
          try {
            const { data: usersList } = await adminClient.auth.admin.listUsers();
            const existingUser = usersList?.users?.find(
              (u) => u.email?.toLowerCase() === email.toLowerCase()
            );
            if (existingUser) {
              await adminClient.auth.admin.updateUserById(existingUser.id, {
                user_metadata: {
                  ...existingUser.user_metadata,
                  plan_id: planId || existingUser.user_metadata?.plan_id || "6-bulan",
                  plan_name: planName || existingUser.user_metadata?.plan_name || "Paket 6 Bulan",
                  expires_at: expiresAt,
                  last_renewed_at: new Date().toISOString(),
                },
              });
              console.log("[Supabase Provision]: Akun lama berhasil diperbarui dengan masa aktif baru.");
              return { success: true, user: existingUser, isExisting: true };
            }
          } catch (updateErr: any) {
            console.warn("[Supabase Provision Update Warning]:", updateErr.message);
          }
        }
        console.warn("[Supabase Admin Provision Warning]:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      console.warn("[Supabase Admin Exception]:", err.message);
    }
  }

  // 2. Fallback using client signUp with anon key
  if (anonKey) {
    try {
      const client = createClient(supabaseUrl, anonKey);
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { name, role: "customer" },
        },
      });

      if (error) {
        console.warn("[Supabase SignUp Warning]:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err: any) {
      console.warn("[Supabase SignUp Exception]:", err.message);
    }
  }

  return { success: false, reason: "No valid Supabase keys" };
}

/**
 * POST /api/pakasir/webhook
 * Menerima notifikasi pembayaran berhasil dari Pakasir (HTTP POST)
 * Otomatis mengirim email akses login ke email pengguna via Resend.
 */
export async function POST(request: Request) {
  try {
    // 1. Verifikasi Header X-Secret (jika PAKASIR_WEBHOOK_SECRET dikonfigurasi)
    const webhookSecret = process.env.PAKASIR_WEBHOOK_SECRET;
    const incomingSecret =
      request.headers.get("x-secret") ||
      request.headers.get("X-Secret") ||
      request.headers.get("authorization");

    if (webhookSecret && incomingSecret !== webhookSecret) {
      console.warn("[Pakasir Webhook] Ditolak: Secret tidak cocok.");
      return NextResponse.json(
        { error: "Unauthorized: Invalid X-Secret header" },
        { status: 401 }
      );
    }

    // 2. Parse Body JSON
    const body: PakasirWebhookPayload = await request.json();
    console.log("[Pakasir Webhook Received]:", body);

    const { order_id, txn_id, status, completed_at } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: "order_id wajib disertakan dalam payload webhook" },
        { status: 400 }
      );
    }

    const isCompleted =
      status?.toLowerCase() === "completed" ||
      status?.toLowerCase() === "success" ||
      status?.toLowerCase() === "paid";

    if (!isCompleted) {
      console.log(`[Pakasir Webhook] Status pembayaran bukan completed (${status}). Mengabaikan pengiriman email.`);
      return NextResponse.json(
        { success: true, message: `Status is ${status}, no action taken.` },
        { status: 200 }
      );
    }

    // 3. Cari data Order berdasarkan order_id
    let order = await getOrder(order_id);

    // Jika tidak ditemukan di database namun customer info disertakan di body
    if (!order && body.customer?.email) {
      order = {
        orderId: order_id,
        txnId: txn_id,
        planId: body.amount >= 200000 ? "1-tahun" : "6-bulan",
        planName: body.amount >= 200000 ? "Paket 1 Tahun" : "Paket 6 Bulan",
        amount: body.amount,
        fee: 0,
        totalPayment: body.amount,
        method: "qris",
        customer: {
          name: body.customer.name || "Customer TrackCapi",
          email: body.customer.email,
          phone: body.customer.phone || "-",
        },
        status: "pending",
        createdAt: new Date().toISOString(),
      };
    }

    if (!order) {
      console.warn(`[Pakasir Webhook] Order #${order_id} tidak ditemukan.`);
      // Sesuai standar webhook, tetap return 200 agar gateway tidak terus retry jika order ID memang tidak terdaftar
      return NextResponse.json(
        {
          success: false,
          message: `Order with ID ${order_id} not found in database.`,
        },
        { status: 200 }
      );
    }

    // 4. Siapkan password akses login dan hitung masa aktif paket
    const loginPassword = order.loginPassword || generateRandomPassword();
    const paidAt = completed_at || new Date().toISOString();

    // Periksa apakah customer sudah memiliki langganan aktif sebelumnya (stacking / akumulasi)
    const existingSub = await getUserSubscription(order.customer.email);
    let baseStartDate = paidAt;
    if (existingSub.hasSubscription && !existingSub.isExpired && existingSub.expiresAt) {
      baseStartDate = existingSub.expiresAt;
      console.log(
        `[Pakasir Webhook Stacking]: Customer ${order.customer.email} memperpanjang langganan aktif. Diakumulasikan dari ${existingSub.expiresAt}`
      );
    }
    const expiresAt = calculateExpirationDate(order.planId, baseStartDate);

    // 5. Daftarkan / Provision user di Supabase Auth (jika aktif)
    const provisionResult = await provisionSupabaseUser(
      order.customer.email,
      loginPassword,
      order.customer.name,
      order.planId,
      order.planName,
      expiresAt
    );
    const isExistingUser = Boolean((provisionResult as any)?.isExisting);
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

    // 6. Kirim Email Kredensial Akses / Konfirmasi Perpanjangan via Resend
    const emailResult = await sendLoginAccessEmail({
      to: order.customer.email,
      customerName: order.customer.name,
      planName: order.planName,
      orderId: order.orderId,
      loginPassword,
      isExistingUser,
      formattedExpiresAt,
    });

    console.log("[Resend Email Result]:", emailResult);

    // 7. Perbarui status order menjadi 'completed' dengan expiresAt
    await updateOrder(order_id, {
      status: "completed",
      paidAt,
      expiresAt,
      txnId: txn_id || order.txnId,
      loginPassword,
      emailSent: emailResult.success,
      emailSentAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Pembayaran berhasil diproses. Email akses login telah dikirimkan ke ${order.customer.email}.`,
      order_id,
      email_sent: emailResult.success,
      is_mock_email: emailResult.isMock || false,
      message_id: emailResult.messageId,
    });
  } catch (error: any) {
    console.error("[Pakasir Webhook Processing Error]:", error);
    return NextResponse.json(
      { error: "Gagal memproses webhook: " + (error.message || error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pakasir/webhook
 * Info endpoint untuk panduan konfigurasi Webhook Pakasir.
 */
export async function GET() {
  const isResendConfigured = Boolean(process.env.RESEND_API_KEY);
  const isSecretConfigured = Boolean(process.env.PAKASIR_WEBHOOK_SECRET);

  return NextResponse.json({
    status: "active",
    endpoint: "/api/pakasir/webhook",
    description:
      "Endpoint Webhook Pakasir untuk menerima notifikasi pembayaran sukses dan mengirim email akses login via Resend.",
    configuration: {
      resend_configured: isResendConfigured,
      webhook_secret_configured: isSecretConfigured,
      from_email:
        process.env.RESEND_FROM_EMAIL || "TrackCapi <onboarding@resend.dev>",
    },
    usage: {
      method: "POST",
      header: isSecretConfigured ? "X-Secret: [PAKASIR_WEBHOOK_SECRET]" : "Optional X-Secret",
      expected_payload: {
        txn_id: "string",
        order_id: "SP-XXXXXX-XXX",
        amount: 149000,
        status: "completed",
        completed_at: "2026-09-21T08:00:00.000Z",
      },
    },
  });
}
