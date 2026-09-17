import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project.supabase.co")
);

// If not configured, use a fallback client so it doesn't crash on initial render
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey! : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
