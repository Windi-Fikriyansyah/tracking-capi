import fs from "fs";
import path from "path";
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

// In-memory cache for fast lookup
const ordersCache = new Map<string, OrderRecord>();

// Local persistent file fallback (data/orders.json)
const DATA_DIR = path.join(process.cwd(), ".data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

function ensureFileExists() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify({}), "utf8");
    }
  } catch (err) {
    console.warn("Failed to ensure .data directory:", err);
  }
}

function loadOrdersFromFile(): Record<string, OrderRecord> {
  try {
    ensureFileExists();
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, "utf8");
      return JSON.parse(content || "{}");
    }
  } catch (err) {
    console.warn("Could not read orders from file:", err);
  }
  return {};
}

function saveOrdersToFile(orders: Record<string, OrderRecord>) {
  try {
    ensureFileExists();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist orders to file:", err);
  }
}

/**
 * Simpan data order baru saat checkout / transaksi dibuat.
 */
export async function saveOrder(order: OrderRecord): Promise<void> {
  // Hitung expiresAt jika status completed dan belum dihitung
  if (order.status === "completed" && !order.expiresAt) {
    order.expiresAt = calculateExpirationDate(order.planId, order.paidAt || order.createdAt);
  }

  // 1. Update in-memory
  ordersCache.set(order.orderId, order);

  // 2. Persist to local JSON
  const allOrders = loadOrdersFromFile();
  allOrders[order.orderId] = order;
  saveOrdersToFile(allOrders);

  // 3. Optional: Try saving to Supabase if configured and table exists
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
    } catch {
      // Non-blocking if table doesn't exist
    }
  }
}

/**
 * Cari data order berdasarkan orderId.
 */
export async function getOrder(orderId: string): Promise<OrderRecord | null> {
  // 1. Check in-memory
  if (ordersCache.has(orderId)) {
    return ordersCache.get(orderId)!;
  }

  // 2. Check local file
  const allOrders = loadOrdersFromFile();
  if (allOrders[orderId]) {
    ordersCache.set(orderId, allOrders[orderId]);
    return allOrders[orderId];
  }

  // 3. Check Supabase
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      if (data) {
        const record: OrderRecord = {
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
        ordersCache.set(orderId, record);
        return record;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

/**
 * Update order (misal status jadi 'completed', loginPassword, dsb)
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

  const updated: OrderRecord = {
    ...existing,
    ...updates,
    expiresAt: calculatedExpiresAt,
  };

  // Update in-memory
  ordersCache.set(orderId, updated);

  // Update file
  const allOrders = loadOrdersFromFile();
  allOrders[orderId] = updated;
  saveOrdersToFile(allOrders);

  // Update Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("orders")
        .update({
          status: updated.status,
          paid_at: updated.paidAt,
          expires_at: updated.expiresAt,
          txn_id: updated.txnId,
          login_password: updated.loginPassword,
          email_sent: updated.emailSent,
          email_sent_at: updated.emailSentAt,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    } catch {
      // Ignore
    }
  }

  return updated;
}

/**
 * Cari order berdasarkan email customer.
 * Memprioritaskan order berstatus 'completed' yang terbaru.
 */
export async function findOrderByEmail(email: string): Promise<OrderRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const matchedOrders: OrderRecord[] = [];

  // 1. Search in memory
  for (const order of ordersCache.values()) {
    if (order.customer.email.trim().toLowerCase() === cleanEmail) {
      matchedOrders.push(order);
    }
  }

  // 2. Search in file
  const allOrders = loadOrdersFromFile();
  for (const order of Object.values(allOrders)) {
    if (order.customer.email.trim().toLowerCase() === cleanEmail) {
      if (!matchedOrders.some((m) => m.orderId === order.orderId)) {
        matchedOrders.push(order);
      }
    }
  }

  // 3. Search in Supabase
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .ilike("customer_email", cleanEmail)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        for (const row of data) {
          if (!matchedOrders.some((m) => m.orderId === row.order_id)) {
            matchedOrders.push({
              orderId: row.order_id,
              txnId: row.txn_id,
              planId: row.plan_id,
              planName: row.plan_name,
              amount: row.amount,
              fee: row.fee,
              totalPayment: row.total_payment,
              method: row.payment_method,
              customer: {
                name: row.customer_name,
                email: row.customer_email,
                phone: row.customer_phone,
              },
              status: row.status,
              createdAt: row.created_at,
              paidAt: row.paid_at,
              expiresAt:
                row.expires_at ||
                (row.status === "completed"
                  ? calculateExpirationDate(row.plan_id, row.paid_at || row.created_at)
                  : undefined),
              loginPassword: row.login_password,
              emailSent: row.email_sent,
              emailSentAt: row.email_sent_at,
            });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (matchedOrders.length === 0) return null;

  // Prioritaskan order yang 'completed' dan urutkan dari yang paling baru
  matchedOrders.sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return -1;
    if (b.status === "completed" && a.status !== "completed") return 1;
    const timeA = new Date(a.paidAt || a.createdAt).getTime();
    const timeB = new Date(b.paidAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  const bestMatch = matchedOrders[0];
  ordersCache.set(bestMatch.orderId, bestMatch);
  return bestMatch;
}

/**
 * Mendapatkan status langganan lengkap (aktif / expired, sisa hari) untuk suatu email pengguna.
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

  // Kumpulkan semua order berstatus completed untuk user ini
  const completedOrdersMap = new Map<string, OrderRecord>();

  // 1. Cek memory & local file
  const allOrders = loadOrdersFromFile();
  const localCandidates: OrderRecord[] = [
    ...Array.from(ordersCache.values()),
    ...Object.values(allOrders),
  ].filter(
    (o) =>
      o.status === "completed" &&
      (o.customer.email.toLowerCase() === cleanEmail ||
        o.customer.email.toLowerCase() === cleanKey ||
        o.orderId.toLowerCase() === cleanKey)
  );

  for (const ord of localCandidates) {
    completedOrdersMap.set(ord.orderId, ord);
  }

  // 2. Cek di Supabase untuk mengambil SEMUA order completed milik user
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .or(`customer_email.ilike.${cleanEmail},customer_email.ilike.${cleanKey}`)
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (Array.isArray(data)) {
        for (const row of data) {
          const rec: OrderRecord = {
            orderId: row.order_id,
            txnId: row.txn_id,
            planId: row.plan_id,
            planName: row.plan_name,
            amount: row.amount,
            fee: row.fee,
            totalPayment: row.total_payment,
            method: row.payment_method,
            customer: {
              name: row.customer_name,
              email: row.customer_email,
              phone: row.customer_phone,
            },
            status: row.status,
            createdAt: row.created_at,
            paidAt: row.paid_at,
            expiresAt: row.expires_at,
            loginPassword: row.login_password,
          };
          completedOrdersMap.set(row.order_id, rec);
        }
      }
    } catch {
      // ignore
    }
  }

  const completedOrders = Array.from(completedOrdersMap.values());

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

  // 3. Urutkan semua order completed secara kronologis (dari yang paling awal dibayar)
  completedOrders.sort((a, b) => {
    const timeA = new Date(a.paidAt || a.createdAt).getTime();
    const timeB = new Date(b.paidAt || b.createdAt).getTime();
    return timeA - timeB;
  });

  // 4. Hitung masa aktif kumulatif (Stacking Algorithm)
  let runningExpiresAt: Date | null = null;
  let latestPlanName = completedOrders[completedOrders.length - 1].planName;
  let latestPlanId = completedOrders[completedOrders.length - 1].planId;
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

  // Berikan label khusus jika user memiliki lebih dari 1 transaksi aktif
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
