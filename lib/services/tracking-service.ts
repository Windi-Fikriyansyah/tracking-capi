import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CtwaLead {
  id: string;
  user_id: string;
  phone: string;
  phone_e164: string;
  contact_name: string;
  ctwa_clid: string | null;
  ctwa_source_id: string | null;
  ctwa_headline: string | null;
  conversation_id: string | null;
  event_1_name: string;
  event_1_status: "sent" | "failed" | "pending";
  event_1_trace_id: string | null;
  event_1_sent_at: string | null;
  event_2_name: string | null;
  event_2_status: "sent" | "failed" | "pending";
  event_2_trace_id: string | null;
  event_2_sent_at: string | null;
  event_3_name: string | null;
  event_3_status: "sent" | "failed" | "pending";
  event_3_trace_id: string | null;
  event_3_sent_at: string | null;
  event_4_name: string | null;
  event_4_status: "sent" | "failed" | "pending";
  event_4_trace_id: string | null;
  event_4_sent_at: string | null;
  event_4_value: number;
  created_at: string;
}

export interface CtwaSettings {
  auto_send_event_1: boolean;
  event_1_name: string;
  event_2_name: string;
  event_3_name: string;
  event_4_name: string;
  currency: string;
  purchase_value: number;
  dataset_id: string | null;
  test_code: string | null;
}

export const DEFAULT_CTWA_SETTINGS: CtwaSettings = {
  auto_send_event_1: true,
  event_1_name: "LeadSubmitted",
  event_2_name: "ViewContent",
  event_3_name: "InitiateCheckout",
  event_4_name: "Purchase",
  currency: "IDR",
  purchase_value: 150000,
  dataset_id: "1469138511709885",
  test_code: "",
};

// Supported Meta CTWA Events Allowlist
export const SUPPORTED_CTWA_EVENTS = [
  { value: "LeadSubmitted", label: "LeadSubmitted (Kontak/Lead Masuk)" },
  { value: "ViewContent", label: "ViewContent (Lihat Produk/Layanan)" },
  { value: "AddToCart", label: "AddToCart (Tambah ke Keranjang)" },
  { value: "InitiateCheckout", label: "InitiateCheckout (Mulai Checkout)" },
  { value: "Purchase", label: "Purchase (Pembelian/Deal Selesai)" },
];

/**
 * Mengambil pengaturan event CTWA
 */
export async function getCtwaSettings(userId: string): Promise<CtwaSettings> {
  if (!isSupabaseConfigured || !userId) return DEFAULT_CTWA_SETTINGS;

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return DEFAULT_CTWA_SETTINGS;

    return {
      auto_send_event_1: data.ctwa_auto_send !== false,
      event_1_name: data.ctwa_event_1 || DEFAULT_CTWA_SETTINGS.event_1_name,
      event_2_name: data.ctwa_event_2 || DEFAULT_CTWA_SETTINGS.event_2_name,
      event_3_name: data.ctwa_event_3 || DEFAULT_CTWA_SETTINGS.event_3_name,
      event_4_name: data.ctwa_event_4 || DEFAULT_CTWA_SETTINGS.event_4_name,
      currency: data.ctwa_currency || DEFAULT_CTWA_SETTINGS.currency,
      purchase_value: Number(data.ctwa_purchase_value) || DEFAULT_CTWA_SETTINGS.purchase_value,
      dataset_id: data.ctwa_dataset_id || DEFAULT_CTWA_SETTINGS.dataset_id,
      test_code: data.ctwa_test_code || "",
    };
  } catch {
    return DEFAULT_CTWA_SETTINGS;
  }
}

/**
 * Menyimpan pengaturan event CTWA ke Supabase
 */
export async function saveCtwaSettings(
  userId: string,
  settings: Partial<CtwaSettings>
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured || !userId) {
    return { success: false, error: "Database belum siap atau sesi tidak valid." };
  }

  try {
    const payload = {
      ctwa_auto_send: settings.auto_send_event_1,
      ctwa_event_1: settings.event_1_name,
      ctwa_event_2: settings.event_2_name,
      ctwa_event_3: settings.event_3_name,
      ctwa_event_4: settings.event_4_name,
      ctwa_currency: settings.currency,
      ctwa_purchase_value: settings.purchase_value,
      ctwa_dataset_id: settings.dataset_id,
      ctwa_test_code: settings.test_code,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("app_settings")
      .update(payload)
      .eq("user_id", userId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan pengaturan.";
    return { success: false, error: msg };
  }
}

/**
 * Mengambil daftar leads CTWA dari Supabase (murni dari database, tanpa data dummy)
 */
export async function getCtwaLeads(
  userId: string
): Promise<{ leads: CtwaLead[]; tableExists: boolean }> {
  if (!isSupabaseConfigured || !userId) {
    return { leads: [], tableExists: false };
  }

  try {
    const { data, error } = await supabase
      .from("ctwa_leads")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { leads: [], tableExists: false };
    }

    return { leads: (data || []) as CtwaLead[], tableExists: true };
  } catch {
    return { leads: [], tableExists: false };
  }
}

/**
 * Menambahkan lead baru ke Supabase
 */
export async function insertCtwaLead(lead: CtwaLead): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from("ctwa_leads").insert(lead);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Memperbarui nama event (1, 2, 3, atau 4) yang dipilih user untuk lead tertentu di database
 */
export async function updateCtwaLeadEventName(
  leadId: string,
  eventIndex: 1 | 2 | 3 | 4,
  eventName: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const updatePayload: Record<string, unknown> = {
      [`event_${eventIndex}_name`]: eventName,
    };

    const { error } = await supabase
      .from("ctwa_leads")
      .update(updatePayload)
      .eq("id", leadId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Memperbarui status event (1, 2, 3, atau 4) untuk lead tertentu
 */
export async function updateCtwaLeadEvent(
  leadId: string,
  eventIndex: 1 | 2 | 3 | 4,
  status: "sent" | "failed" | "pending",
  traceId?: string | null,
  value?: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const updatePayload: Record<string, unknown> = {
      [`event_${eventIndex}_status`]: status,
      [`event_${eventIndex}_trace_id`]: traceId || null,
      [`event_${eventIndex}_sent_at`]: status === "sent" ? new Date().toISOString() : null,
    };
    if (typeof value === "number") {
      updatePayload.event_4_value = value;
    }

    const { error } = await supabase
      .from("ctwa_leads")
      .update(updatePayload)
      .eq("id", leadId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Menghapus lead
 */
export async function deleteCtwaLead(leadId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from("ctwa_leads").delete().eq("id", leadId);
    return !error;
  } catch {
    return false;
  }
}
