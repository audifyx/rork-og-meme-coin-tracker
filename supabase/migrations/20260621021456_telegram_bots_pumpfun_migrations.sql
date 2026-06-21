create table if not exists public.telegram_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  bot_id bigint unique,
  bot_username text,
  bot_token text not null,
  webhook_secret text not null,
  alerts_migrations boolean not null default true,
  ai_enabled boolean not null default true,
  min_marketcap numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tg_bots_user on public.telegram_bots(user_id);

create table if not exists public.telegram_alert_chats (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid references public.telegram_bots(id) on delete cascade,
  chat_id bigint not null,
  chat_title text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (bot_id, chat_id)
);

create table if not exists public.pumpfun_migrations (
  signature text primary key,
  mint text not null,
  symbol text, name text,
  price_usd numeric, market_cap numeric, liquidity_usd numeric,
  image text, dex_url text,
  migrated_at timestamptz,
  alerted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_pf_mig_time on public.pumpfun_migrations(migrated_at desc);

create table if not exists public.app_state (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

alter table public.telegram_bots enable row level security;
alter table public.telegram_alert_chats enable row level security;
alter table public.pumpfun_migrations enable row level security;

drop policy if exists "own bots" on public.telegram_bots;
create policy "own bots" on public.telegram_bots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own bot chats" on public.telegram_alert_chats;
create policy "own bot chats" on public.telegram_alert_chats for all
  using (exists (select 1 from public.telegram_bots b where b.id = telegram_alert_chats.bot_id and b.user_id = auth.uid()))
  with check (exists (select 1 from public.telegram_bots b where b.id = telegram_alert_chats.bot_id and b.user_id = auth.uid()));

drop policy if exists "public read migrations" on public.pumpfun_migrations;
create policy "public read migrations" on public.pumpfun_migrations for select using (true);
