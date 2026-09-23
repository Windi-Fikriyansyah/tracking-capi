import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@supabase/supabase-js";

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
}

export interface OrderRecord {
  orderId: string;
  txnId?: string;
  planId: "6-bulan" | "1-tahun";
  planName: string;
  amount: number;
  fee: number;
  totalPayment: number;
  method: string;
  customer: CustomerData;
  loginPassword?: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
  emailSent?: boolean;
  emailSentAt?: string;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  isExpired: boolean;
  planId: "6-bulan" | "1-tahun" | string;
  planName: string;
  paidAt?: string;
  expiresAt?: string;
  daysLeft: number;
  formattedExpiresAt: string;
}

/**
 * Hitung tanggal kedaluwarsa paket berdasarkan paket yang dibeli:
 * - 6-bulan: +6 bulan dari tanggal pembayaran (atau tanggal pembuatan)
 * - 1-tahun: +12 bulan (1 tahun) dari tanggal pembayaran
 */
export function calculateExpirationDate(
  planId: "6-bulan" | "1-tahun" | string,
  startDateIso?: string
): string {
  const baseDate = startDateIso ? new Date(startDateIso) : new Date();
  const date = isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate.getTime());

  if (planId === "1-tahun") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    // default 6-bulan
    date.setMonth(date.getMonth() + 6);
  }
  return date.toISOString();
}

/**
 * Helper untuk memetakan baris database Supabase ke OrderRecord
 */
function mapRowToOrderRecord(data: any): OrderRecord {
  return {
    orderId: data.order_id,
    txnId: data.txn_id,
    planId: data.plan_id,
    planName: data.plan_name,
    amount: data.amount,
    fee: data.fee,
    totalPayment: data.total_payment,
    method: data.payment_method,
    customer: {
      name: data.customer_name,
      email: data.customer_email,
      phone: data.customer_phone,
    },
    status: data.status,
    createdAt: data.created_at,
    paidAt: data.paid_at,
    expiresAt:
      data.expires_at ||
      (data.status === "completed"
        ? calculateExpirationDate(data.plan_id, data.paid_at || data.created_at)
        : undefined),
    loginPassword: data.login_password,
    emailSent: data.email_sent,
    emailSentAt: data.email_sent_at,
  };
}

/**
 * Simpan data order baru saat checkout / transaksi dibuat (100% Supabase).
 */
export async function saveOrder(order: OrderRecord): Promise<void> {
  // Hitung expiresAt jika status completed dan belum dihitung
  if (order.status === "completed" && !order.expiresAt) {
    order.expiresAt = calculateExpirationDate(order.planId, order.paidAt || order.createdAt);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from("orders").upsert({
        order_id: order.orderId,
        txn_id: order.txnId,
        plan_id: order.planId,
        plan_name: order.planName,
        amount: order.amount,
        fee: order.fee,
        total_payment: order.totalPayment,
        payment_method: order.method,
        customer_name: order.customer.name,
        customer_email: order.customer.email,
        customer_phone: order.customer.phone,
        status: order.status,
        login_password: order.loginPassword,
        email_sent: order.emailSent ?? false,
        email_sent_at: order.emailSentAt,
        created_at: order.createdAt,
        paid_at: order.paidAt,
        expires_at: order.expiresAt,
      });
    } catch (err) {
      console.error("[Supabase saveOrder Error]:", err);
    }
  }
}

/**
 * Cari data order berdasarkan orderId (100% Supabase).
 */
export async function getOrder(orderId: string): Promise<OrderRecord | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      console.warn("[Supabase getOrder Warning]:", error.message);
      return null;
    }

    if (data) {
      return mapRowToOrderRecord(data);
    }
  } catch (err) {
    console.error("[Supabase getOrder Exception]:", err);
  }

  return null;
}

/**
 * Update order (misal status jadi 'completed', loginPassword, dsb) (100% Supabase).
 */
export async function updateOrder(
  orderId: string,
  updates: Partial<OrderRecord>
): Promise<OrderRecord | null> {
  const existing = await getOrder(orderId);
  if (!existing) return null;

  // Jika status diubah jadi completed dan expiresAt belum ada
  let calculatedExpiresAt = updates.expiresAt || existing.expiresAt;
  if ((updates.status === "completed" || existing.status === "completed") && !calculatedExpiresAt) {
    calculatedExpiresAt = calculateExpirationDate(
      updates.planId || existing.planId,
      updates.paidAt || existing.paidAt || new Date().toISOString()
    );
  }

  const updatedPayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.status !== undefined) updatedPayload.status = updates.status;
  if (updates.paidAt !== undefined) updatedPayload.paid_at = updates.paidAt;
  if (calculatedExpiresAt !== undefined) updatedPayload.expires_at = calculatedExpiresAt;
  if (updates.txnId !== undefined) updatedPayload.txn_id = updates.txnId;
  if (updates.loginPassword !== undefined) updatedPayload.login_password = updates.loginPassword;
  if (updates.emailSent !== undefined) updatedPayload.email_sent = updates.emailSent;
  if (updates.emailSentAt !== undefined) updatedPayload.email_sent_at = updates.emailSentAt;

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase
        .from("orders")
        .update(updatedPayload)
        .eq("order_id", orderId);

      if (error) {
        console.warn("[Supabase updateOrder Warning]:", error.message);
      }
    } catch (err) {
      console.error("[Supabase updateOrder Exception]:", err);
    }
  }

  return {
    ...existing,
    ...updates,
    expiresAt: calculatedExpiresAt,
  };
}

/**
 * Cari order berdasarkan email customer (100% Supabase).
 * Memprioritaskan order berstatus 'completed' yang terbaru.
 */
export async function findOrderByEmail(email: string): Promise<OrderRecord | null> {
  if (!isSupabaseConfigured) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .ilike("customer_email", cleanEmail)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Supabase findOrderByEmail Warning]:", error.message);
      return null;
    }

    if (data && data.length > 0) {
      const matchedOrders: OrderRecord[] = data.map(mapRowToOrderRecord);

      // Prioritaskan order yang 'completed' dan urutkan dari yang paling baru
      matchedOrders.sort((a, b) => {
        if (a.status === "completed" && b.status !== "completed") return -1;
        if (b.status === "completed" && a.status !== "completed") return 1;
        const timeA = new Date(a.paidAt || a.createdAt).getTime();
        const timeB = new Date(b.paidAt || b.createdAt).getTime();
        return timeB - timeA;
      });

      return matchedOrders[0];
    }
  } catch (err) {
    console.error("[Supabase findOrderByEmail Exception]:", err);
  }

  return null;
}

/**
 * Mendapatkan status langganan lengkap (aktif / expired, sisa hari) untuk suatu email pengguna (100% Supabase).
 * MENDUKUNG MULTI-ORDER & PERPANJANGAN (STACKING):
 * Jika user memiliki lebih dari 1 order berstatus 'completed' (misal perpanjang paket atau beli lagi karena lupa),
 * masa aktif diakumulasikan secara otomatis sehingga hari aktif tidak pernah hangus atau tumpang tindih.
 */
export async function getUserSubscription(emailOrUserId: string): Promise<SubscriptionStatus> {
  const cleanKey = (emailOrUserId || "").trim().toLowerCase();

  // Jika input berupa UUID / user_id (bukan format email), selesaikan ke email akun pengguna
  let cleanEmail = cleanKey;
  if (cleanKey && !cleanKey.includes("@") && isSupabaseConfigured) {
    try {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceRoleKey && supabaseUrl) {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: userData } = await adminClient.auth.admin.getUserById(cleanKey);
        if (userData?.user?.email) {
          cleanEmail = userData.user.email.trim().toLowerCase();
        }
      }
    } catch {
      // ignore
    }
  }

  const completedOrders: OrderRecord[] = [];

  // Query SEMUA order completed milik user 100% dari Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`customer_email.ilike.${cleanEmail},customer_email.ilike.${cleanKey}`)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("[Supabase getUserSubscription Warning]:", error.message);
      } else if (Array.isArray(data) && data.length > 0) {
        for (const row of data) {
          completedOrders.push(mapRowToOrderRecord(row));
        }
      }
    } catch (err) {
      console.error("[Supabase getUserSubscription Exception]:", err);
    }
  }

  // Jika tidak ada order completed sama sekali (misal akun default / belum order)
  if (completedOrders.length === 0) {
    // Cek apakah akun demo / development default
    const isDemo =
      cleanKey.includes("demo") ||
      cleanKey.includes("admin") ||
      cleanKey.includes("signalpulse.io");

    if (isDemo) {
      // Berikan akses demo aktif 6 bulan untuk testing
      const fakePaid = new Date().toISOString();
      const fakeExpires = calculateExpirationDate("6-bulan", fakePaid);
      return {
        hasSubscription: true,
        isExpired: false,
        planId: "6-bulan",
        planName: "Paket 6 Bulan (Demo)",
        paidAt: fakePaid,
        expiresAt: fakeExpires,
        daysLeft: 180,
        formattedExpiresAt: formatIndonesianDate(fakeExpires),
      };
    }

    return {
      hasSubscription: false,
      isExpired: true,
      planId: "6-bulan",
      planName: "Belum Berlangganan",
      daysLeft: 0,
      formattedExpiresAt: "-",
    };
  }

  // 1. Urutkan semua order completed secara kronologis (dari yang paling awal dibayar)
  completedOrders.sort((a, b) => {
    const timeA = new Date(a.paidAt || a.createdAt).getTime();
    const timeB = new Date(b.paidAt || b.createdAt).getTime();
    return timeA - timeB;
  });

  // 2. Hitung masa aktif kumulatif (Stacking Algorithm)
  let runningExpiresAt: Date | null = null;
  const latestOrder = completedOrders[completedOrders.length - 1];
  const latestPlanName = latestOrder.planName;
  const latestPlanId = latestOrder.planId;
  const firstPaidAt = completedOrders[0].paidAt || completedOrders[0].createdAt;

  for (const ord of completedOrders) {
    const orderPaidDate = new Date(ord.paidAt || ord.createdAt);
    const validPaidDate = isNaN(orderPaidDate.getTime()) ? new Date() : orderPaidDate;

    // Jika belum ada runningExpiresAt, atau jika order baru ini dibayar SETELAH paket sebelumnya kedaluwarsa
    const baseDateToExtend: Date =
      !runningExpiresAt || validPaidDate.getTime() > runningExpiresAt.getTime()
        ? validPaidDate
        : runningExpiresAt;

    const nextExpiry = new Date(baseDateToExtend.getTime());
    if (ord.planId === "1-tahun") {
      nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);
    } else {
      nextExpiry.setMonth(nextExpiry.getMonth() + 6);
    }
    runningExpiresAt = nextExpiry;
  }

  const finalExpiresIso = runningExpiresAt ? runningExpiresAt.toISOString() : new Date().toISOString();
  const now = Date.now();
  const diffMs = new Date(finalExpiresIso).getTime() - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;

  // Berikan label perpanjangan HANYA jika ada lebih dari 1 transaksi nyata di database Supabase
  let displayName = latestPlanName;
  if (completedOrders.length > 1) {
    displayName = `${latestPlanName} (${completedOrders.length}x Perpanjangan)`;
  }

  return {
    hasSubscription: true,
    isExpired,
    planId: latestPlanId,
    planName: displayName,
    paidAt: firstPaidAt,
    expiresAt: finalExpiresIso,
    daysLeft: isExpired ? 0 : daysLeft,
    formattedExpiresAt: formatIndonesianDate(finalExpiresIso),
  };
}

function formatIndonesianDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}
