import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AppSettings {
  user_id: string;
  zernio_api_key: string | null;
  wa_is_connected: boolean;
  wa_phone_number: string | null;
  wa_waba_name: string | null;
  wa_waba_id: string | null;
  wa_connected_at: string | null;
  // Meta Ads CAPI fields
  meta_pixel_id?: string | null;
  meta_pixel_name?: string | null;
  meta_access_token?: string | null;
  meta_test_code?: string | null;
  is_meta_connected?: boolean;
  meta_connected_at?: string | null;
  updated_at: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  user_id: "",
  zernio_api_key: null,
  wa_is_connected: false,
  wa_phone_number: null,
  wa_waba_name: null,
  wa_waba_id: null,
  wa_connected_at: null,
  meta_pixel_id: null,
  meta_pixel_name: null,
  meta_access_token: null,
  meta_test_code: null,
  is_meta_connected: false,
  meta_connected_at: null,
  updated_at: null,
};

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("schema cache") ||
    msg.includes("Could not find the table")
  );
}

/**
 * Mengambil User ID akun yang sedang login saat ini.
 * Memeriksa Supabase Auth session terlebih dahulu, lalu demo session jika ada.
 */
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  if (isSupabaseConfigured) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return {
          id: session.user.id,
          email: session.user.email || "user@signalpulse.io",
        };
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        return {
          id: user.id,
          email: user.email || "user@signalpulse.io",
        };
      }
    } catch {
      // ignore
    }
  }

  // Cek demo session
  if (typeof window !== "undefined") {
    try {
      const demo = localStorage.getItem("signalpulse_demo_session");
      if (demo) {
        const parsed = JSON.parse(demo);
        if (parsed?.id) {
          return {
            id: parsed.id,
            email: parsed.email || "admin@signalpulse.io",
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Mengambil pengaturan aplikasi dan status WhatsApp yang TERISOLASI khusus untuk user yang sedang login
 */
export async function getAppSettings(explicitUserId?: string): Promise<{
  settings: AppSettings;
  tableExists: boolean;
  userId: string | null;
  error: string | null;
}> {
  const activeUser = await getCurrentUser();
  const userId = explicitUserId || activeUser?.id;

  if (!userId) {
    return {
      settings: DEFAULT_SETTINGS,
      tableExists: true,
      userId: null,
      error: "Sesi login tidak aktif. Silakan masuk terlebih dahulu.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      settings: { ...DEFAULT_SETTINGS, user_id: userId },
      tableExists: false,
      userId,
      error: "Supabase belum terkonfigurasi pada file .env.local",
    };
  }

  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        return {
          settings: { ...DEFAULT_SETTINGS, user_id: userId },
          tableExists: false,
          userId,
          error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
        };
      }
      return {
        settings: { ...DEFAULT_SETTINGS, user_id: userId },
        tableExists: true,
        userId,
        error: error.message,
      };
    }

    if (!data) {
      return {
        settings: { ...DEFAULT_SETTINGS, user_id: userId },
        tableExists: true,
        userId,
        error: null,
      };
    }

    return {
      settings: {
        user_id: data.user_id || userId,
        zernio_api_key: data.zernio_api_key || null,
        wa_is_connected: Boolean(data.wa_is_connected),
        wa_phone_number: data.wa_phone_number || null,
        wa_waba_name: data.wa_waba_name || null,
        wa_waba_id: data.wa_waba_id || null,
        wa_connected_at: data.wa_connected_at || null,
        meta_pixel_id: data.meta_pixel_id || null,
        meta_pixel_name: data.meta_pixel_name || null,
        meta_access_token: data.meta_access_token || null,
        meta_test_code: data.meta_test_code || null,
        is_meta_connected: Boolean(data.is_meta_connected),
        meta_connected_at: data.meta_connected_at || null,
        updated_at: data.updated_at || null,
      },
      tableExists: true,
      userId,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menghubungi database Supabase";
    return {
      settings: { ...DEFAULT_SETTINGS, user_id: userId },
      tableExists: false,
      userId,
      error: msg,
    };
  }
}

/**
 * Menyimpan atau memperbarui Zernio API Key khusus untuk user_id yang sedang login
 */
export async function saveZernioApiKeyToDatabase(
  apiKey: string,
  explicitUserId?: string
): Promise<{
  success: boolean;
  error: string | null;
  isTableMissing?: boolean;
}> {
  const activeUser = await getCurrentUser();
  const userId = explicitUserId || activeUser?.id;

  if (!userId) {
    return {
      success: false,
      error: "Sesi login tidak aktif. Silakan masuk terlebih dahulu.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Supabase belum terkonfigurasi pada file .env.local",
    };
  }

  try {
    const trimmedKey = apiKey.trim();

    // Periksa apakah row data untuk user_id ini sudah ada
    const { data: existing, error: checkError } = await supabase
      .from("app_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      if (isMissingTableError(checkError)) {
        return {
          success: false,
          error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
          isTableMissing: true,
        };
      }
      return { success: false, error: checkError.message };
    }

    if (existing) {
      // Update hanya baris milik user ini
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({
          zernio_api_key: trimmedKey,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert row baru untuk user_id ini
      const { error: insertError } = await supabase.from("app_settings").insert({
        user_id: userId,
        zernio_api_key: trimmedKey,
        wa_is_connected: false,
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        if (isMissingTableError(insertError)) {
          return {
            success: false,
            error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
            isTableMissing: true,
          };
        }
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan ke database Supabase";
    return { success: false, error: msg };
  }
}

/**
 * Menyimpan status koneksi WhatsApp Business khusus untuk user_id yang sedang login
 */
export async function saveWhatsAppConnectionToDatabase(params: {
  isConnected: boolean;
  phone?: string;
  wabaName?: string;
  wabaId?: string;
  userId?: string;
}): Promise<{ success: boolean; error: string | null; isTableMissing?: boolean }> {
  const activeUser = await getCurrentUser();
  const userId = params.userId || activeUser?.id;

  if (!userId) {
    return {
      success: false,
      error: "Sesi login tidak aktif. Silakan masuk terlebih dahulu.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Supabase belum terkonfigurasi pada file .env.local",
    };
  }

  try {
    const { data: existing, error: checkError } = await supabase
      .from("app_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      if (isMissingTableError(checkError)) {
        return {
          success: false,
          error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
          isTableMissing: true,
        };
      }
      return { success: false, error: checkError.message };
    }

    const payload = {
      user_id: userId,
      wa_is_connected: params.isConnected,
      wa_phone_number: params.phone || null,
      wa_waba_name: params.wabaName || null,
      wa_waba_id: params.wabaId || null,
      wa_connected_at: params.isConnected ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("app_settings")
        .update(payload)
        .eq("user_id", userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("app_settings").insert(payload);

      if (insertError) {
        if (isMissingTableError(insertError)) {
          return {
            success: false,
            error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
            isTableMissing: true,
          };
        }
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan koneksi WhatsApp ke database";
    return { success: false, error: msg };
  }
}

/**
 * Memutuskan koneksi WhatsApp Business khusus untuk user_id yang sedang login
 */
export async function disconnectWhatsAppFromDatabase(explicitUserId?: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  return saveWhatsAppConnectionToDatabase({
    isConnected: false,
    phone: undefined,
    wabaName: undefined,
    wabaId: undefined,
    userId: explicitUserId,
  });
}

/**
 * Menyimpan konfigurasi koneksi Meta Ads Pixel & CAPI khusus untuk user_id yang sedang login
 */
export async function saveMetaConnectionToDatabase(params: {
  pixelId: string;
  pixelName?: string;
  accessToken: string;
  testCode?: string;
  isConnected: boolean;
  userId?: string;
}): Promise<{ success: boolean; error: string | null; isTableMissing?: boolean }> {
  const activeUser = await getCurrentUser();
  const userId = params.userId || activeUser?.id;

  if (!userId) {
    return {
      success: false,
      error: "Sesi login tidak aktif. Silakan masuk terlebih dahulu.",
    };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: "Supabase belum terkonfigurasi pada file .env.local",
    };
  }

  try {
    const { data: existing, error: checkError } = await supabase
      .from("app_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) {
      if (isMissingTableError(checkError)) {
        return {
          success: false,
          error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
          isTableMissing: true,
        };
      }
      return { success: false, error: checkError.message };
    }

    const payload = {
      user_id: userId,
      meta_pixel_id: params.pixelId.trim(),
      meta_pixel_name: params.pixelName?.trim() || null,
      meta_access_token: params.accessToken.trim(),
      meta_test_code: params.testCode?.trim() || null,
      is_meta_connected: params.isConnected,
      meta_connected_at: params.isConnected ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error: updateError } = await supabase
        .from("app_settings")
        .update(payload)
        .eq("user_id", userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase.from("app_settings").insert({
        ...payload,
        wa_is_connected: false,
      });

      if (insertError) {
        if (isMissingTableError(insertError)) {
          return {
            success: false,
            error: "Tabel 'app_settings' belum dibuat di database Supabase Anda.",
            isTableMissing: true,
          };
        }
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan koneksi Meta Ads ke database";
    return { success: false, error: msg };
  }
}

/**
 * Memutuskan koneksi Meta Ads khusus untuk user_id yang sedang login
 */
export async function disconnectMetaFromDatabase(explicitUserId?: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  const activeUser = await getCurrentUser();
  const userId = explicitUserId || activeUser?.id;

  if (!userId) {
    return {
      success: false,
      error: "Sesi login tidak aktif. Silakan masuk terlebih dahulu.",
    };
  }

  try {
    const { error } = await supabase
      .from("app_settings")
      .update({
        is_meta_connected: false,
        meta_connected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memutuskan koneksi Meta Ads";
    return { success: false, error: msg };
  }
}

