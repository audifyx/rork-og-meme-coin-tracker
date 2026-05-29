alter table public.communities
  add column if not exists community_links jsonb not null default '[]'::jsonb;
