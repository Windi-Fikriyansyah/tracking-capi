import fs from "fs";
import path from "path";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

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
  emailSent?: boolean;
  emailSentAt?: string;
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

  const updated: OrderRecord = {
    ...existing,
    ...updates,
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
 * Cari order berdasarkan email customer
 */
export async function findOrderByEmail(email: string): Promise<OrderRecord | null> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Search in memory
  for (const order of ordersCache.values()) {
    if (order.customer.email.trim().toLowerCase() === cleanEmail) {
      return order;
    }
  }

  // 2. Search in file
  const allOrders = loadOrdersFromFile();
  for (const order of Object.values(allOrders)) {
    if (order.customer.email.trim().toLowerCase() === cleanEmail) {
      return order;
    }
  }

  // 3. Search in Supabase
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .ilike("customer_email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const order: OrderRecord = {
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
          loginPassword: data.login_password,
          emailSent: data.email_sent,
          emailSentAt: data.email_sent_at,
        };
        ordersCache.set(order.orderId, order);
        return order;
      }
    } catch {
      // Ignore
    }
  }

  return null;
}
