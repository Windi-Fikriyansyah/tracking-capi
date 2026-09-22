-- ==============================================================
-- TRACKCAPI SUPABASE DATABASE SCHEMA
-- Jalankan query ini di: Supabase Dashboard -> SQL Editor
-- ==============================================================

-- 1. TABEL APP_SETTINGS (Pengaturan WhatsApp & CAPI per User)
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

alter table public.app_settings enable row level security;

drop policy if exists "Allow users to view own app_settings" on public.app_settings;
create policy "Allow users to view own app_settings"
on public.app_settings for select to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

drop policy if exists "Allow users to insert/update own app_settings" on public.app_settings;
create policy "Allow users to insert/update own app_settings"
on public.app_settings for all to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
)
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 2. TABEL CTWA_LEADS (Log Event Percakapan & Funnel Leads)
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
  event_1_name text default 'LeadSubmitted',
  event_1_status text default 'pending',
  event_1_trace_id text,
  event_1_sent_at timestamp with time zone,
  event_2_name text,
  event_2_status text default 'pending',
  event_2_trace_id text,
  event_2_sent_at timestamp with time zone,
  event_3_name text,
  event_3_status text default 'pending',
  event_3_trace_id text,
  event_3_sent_at timestamp with time zone,
  event_4_name text,
  event_4_status text default 'pending',
  event_4_trace_id text,
  event_4_sent_at timestamp with time zone,
  event_4_value numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.ctwa_leads enable row level security;

drop policy if exists "Allow users to manage own ctwa_leads" on public.ctwa_leads;
create policy "Allow users to manage own ctwa_leads"
on public.ctwa_leads for all to authenticated, anon
using (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
)
with check (
  (auth.uid() is not null and auth.uid()::text = user_id)
  or (auth.uid() is null and user_id is not null)
);

-- 3. TABEL ORDERS (Riwayat Transaksi Langganan & Webhook Pakasir)
create table if not exists public.orders (
  order_id text primary key,
  txn_id text,
  plan_id text not null,
  plan_name text not null,
  amount numeric not null,
  fee numeric default 0,
  total_payment numeric not null,
  payment_method text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text default 'pending',
  login_password text,
  email_sent boolean default false,
  email_sent_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  paid_at timestamp with time zone,
  expires_at timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Pastikan kolom expires_at ada jika tabel sudah dibuat sebelumnya
alter table public.orders add column if not exists expires_at timestamp with time zone;

alter table public.orders enable row level security;

drop policy if exists "Allow public and authenticated to insert and query orders" on public.orders;
create policy "Allow public and authenticated to insert and query orders"
on public.orders for all to authenticated, anon
using (true)
with check (true);
