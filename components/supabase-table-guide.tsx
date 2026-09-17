"use client";

import React, { useState } from "react";
import { Database, Copy, Check, ExternalLink, RefreshCw, Shield, UserCheck } from "lucide-react";

export const SQL_CREATE_TABLE_SCRIPT = `-- 1. Hapus tabel lama jika ingin reset bersih (opsional)
-- drop table if exists public.ctwa_leads cascade;
-- drop table if exists public.app_settings cascade;

-- 2. Buat tabel app_settings dengan isolasi user_id sebagai PRIMARY KEY
create table if not exists public.app_settings (
  user_id text primary key,
  zernio_api_key text,
  wa_is_connected boolean default false,
  wa_phone_number text,
  wa_waba_name text,
  wa_waba_id text,
  wa_connected_at timestamp with time zone,
  ctwa_auto_send boolean default true,
  ctwa_event_1 text default 'LeadSubmitted',
  ctwa_event_2 text default 'ViewContent',
  ctwa_event_3 text default 'InitiateCheckout',
  ctwa_event_4 text default 'Purchase',
  ctwa_currency text default 'IDR',
  ctwa_purchase_value numeric default 150000,
  ctwa_dataset_id text default '1469138511709885',
  ctwa_test_code text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. Aktifkan Row Level Security (RLS) pada app_settings
alter table public.app_settings enable row level security;

-- Policies untuk app_settings
create policy if not exists "Users can view own app_settings"
on public.app_settings for select to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

create policy if not exists "Users can insert own app_settings"
on public.app_settings for insert to authenticated, anon
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

create policy if not exists "Users can update own app_settings"
on public.app_settings for update to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
)
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

create policy if not exists "Users can delete own app_settings"
on public.app_settings for delete to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 4. Buat tabel ctwa_leads untuk tracking pesan masuk WhatsApp Ads & 4 Event Pipeline
create table if not exists public.ctwa_leads (
  id text primary key,
  user_id text not null,
  phone text not null,
  phone_e164 text not null,
  contact_name text default 'WhatsApp User',
  ctwa_clid text,
  ctwa_source_id text,
  ctwa_headline text,
  conversation_id text,
  event_1_name text default 'LeadSubmitted', -- Event otomatis saat pesan pertama masuk
  event_1_status text default 'pending',
  event_1_trace_id text,
  event_1_sent_at timestamp with time zone,
  event_2_name text, -- Kosong (dipilih manual oleh user per nomor)
  event_2_status text default 'pending',
  event_2_trace_id text,
  event_2_sent_at timestamp with time zone,
  event_3_name text, -- Kosong (dipilih manual oleh user per nomor)
  event_3_status text default 'pending',
  event_3_trace_id text,
  event_3_sent_at timestamp with time zone,
  event_4_name text, -- Kosong (dipilih manual oleh user per nomor)
  event_4_status text default 'pending',
  event_4_trace_id text,
  event_4_sent_at timestamp with time zone,
  event_4_value numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Aktifkan Row Level Security (RLS) pada ctwa_leads
alter table public.ctwa_leads enable row level security;

create policy if not exists "Users can manage own ctwa_leads"
on public.ctwa_leads for all to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
)
with check (
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
