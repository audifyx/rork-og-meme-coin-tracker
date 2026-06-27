-- OG DEX Admin expansion — new tables
-- Run in Supabase SQL editor

-- Pro wallet manual grants
create table if not exists ogdex_pro_wallets (
  id          uuid primary key default gen_random_uuid(),
  address     text unique not null,
  note        text,
  granted_at  timestamptz default now(),
  granted_by  text default 'admin'
);

-- Banned wallets
create table if not exists ogdex_banned_wallets (
  id          uuid primary key default gen_random_uuid(),
  address     text unique not null,
  reason      text,
  banned_at   timestamptz default now(),
  banned_by   text default 'admin'
);

-- KOL community nominations (from /api/ogdex/kols/nominate)
create table if not exists ogdex_kol_nominations (
  id            uuid primary key default gen_random_uuid(),
  address       text unique not null,
  label         text,
  status        text default 'pending',  -- pending | approved | rejected
  votes         integer default 1,
  submitted_by  text,
  submitted_at  timestamptz default now(),
  reviewed_at   timestamptz
);

-- Site-wide config / feature flags (key-value store)
create table if not exists ogdex_config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- Seed defaults
insert into ogdex_config (key, value) values
  ('pro_gate_enabled',  'true'),
  ('pro_threshold',     '10000'),
  ('screener_enabled',  'true'),
  ('mcp_enabled',       'true'),
  ('widget_enabled',    'true'),
  ('maintenance_mode',  'false'),
  ('og_token',          '"EfnZmcFKMXofKA5V5ujvjqtSorvuQD2MzJPz3dxXpump"')
on conflict (key) do nothing;

-- Enable RLS (admin reads via service role key in _lib.js)
alter table ogdex_pro_wallets    enable row level security;
alter table ogdex_banned_wallets enable row level security;
alter table ogdex_kol_nominations enable row level security;
alter table ogdex_config          enable row level security;
