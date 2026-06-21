alter table public.telegram_bots
  add column if not exists digest_enabled boolean not null default true;
