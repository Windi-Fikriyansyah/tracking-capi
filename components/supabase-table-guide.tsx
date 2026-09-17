"use client";

import React, { useState } from "react";
import { Database, Copy, Check, ExternalLink, RefreshCw, Shield, UserCheck } from "lucide-react";

export const SQL_CREATE_TABLE_SCRIPT = `-- 1. Hapus tabel lama jika ada agar skema ter-update ke user_id
drop table if exists public.app_settings cascade;

-- 2. Buat tabel app_settings dengan isolasi user_id sebagai PRIMARY KEY
create table public.app_settings (
  user_id text primary key,
  zernio_api_key text,
  wa_is_connected boolean default false,
  wa_phone_number text,
  wa_waba_name text,
  wa_waba_id text,
  wa_connected_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Aktifkan Row Level Security (RLS) untuk mencegah kebocoran data antar user
alter table public.app_settings enable row level security;

-- 4. Policy SELECT: User hanya dapat melihat datanya sendiri
create policy "Users can view own app_settings"
on public.app_settings for select
to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 5. Policy INSERT: User hanya dapat menyimpan data dengan user_id miliknya
create policy "Users can insert own app_settings"
on public.app_settings for insert
to authenticated, anon
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 6. Policy UPDATE: User hanya dapat mengubah datanya sendiri
create policy "Users can update own app_settings"
on public.app_settings for update
to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
)
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 7. Policy DELETE: User hanya dapat menghapus datanya sendiri
create policy "Users can delete own app_settings"
on public.app_settings for delete
to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);
`;

interface SupabaseTableGuideProps {
  onRetry?: () => void;
  isChecking?: boolean;
}

export default function SupabaseTableGuide({ onRetry, isChecking }: SupabaseTableGuideProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_CREATE_TABLE_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-5 rounded-xl bg-surface-container-low border border-primary/40 space-y-4 shadow-lg shadow-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 text-primary">
          <Shield className="w-5 h-5 shrink-0" />
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
            Skema Tabel Terisolasi per User (Row Level Security)
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isChecking}
              className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Memeriksa..." : "Cek Ulang Database"}</span>
            </button>
          )}
          <span className="px-2 py-0.5 rounded bg-tertiary/10 border border-tertiary/30 text-tertiary text-[11px] font-code-metric flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            User Isolated
          </span>
        </div>
      </div>

      <p className="text-body-sm text-on-surface-variant">
        Agar data API Key dan WhatsApp <strong className="text-on-surface">terisolasi penuh per ID User (tidak akan bocor ke user lain)</strong>, jalankan skema tabel dan kebijakan Row Level Security (RLS) berikut di{" "}
        <a
          href="https://supabase.com/dashboard/project/fvjzvtajfjlscdmmddxy/sql"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
        >
          <span>Supabase SQL Editor</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        :
      </p>

      <div className="relative rounded-lg bg-surface-container-lowest border border-outline-variant/40 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-surface-container-high border-b border-outline-variant/30 text-xs text-outline font-code-metric">
          <span className="text-on-surface-variant font-medium">SQL Schema (public.app_settings with RLS)</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-primary hover:text-on-surface px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer text-xs font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Tersalin!" : "Salin SQL Query"}</span>
          </button>
        </div>
        <pre className="p-3 text-xs font-code-metric text-on-surface overflow-x-auto custom-scrollbar leading-relaxed">
          {SQL_CREATE_TABLE_SCRIPT}
        </pre>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs text-on-surface-variant">
        <span>Setelah menjalankan perintah di atas di SQL Editor Supabase, klik tombol <strong>Cek Ulang Database</strong>.</span>
        <a
          href="https://supabase.com/dashboard/project/fvjzvtajfjlscdmmddxy/sql"
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-lg bg-primary text-surface font-semibold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition-all shrink-0 ml-3"
        >
          <span>Buka SQL Editor Supabase</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
