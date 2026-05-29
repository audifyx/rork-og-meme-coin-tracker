-- Backfill the production community chat schema to match the V2 frontend.
-- This is intentionally tolerant of mixed live states where community_rooms
-- already exists with a different column set than older migrations expected.

begin;

alter table public.community_rooms add column if not exists community_id uuid references public.communities(id) on delete cascade;
alter table public.community_rooms add column if not exists category text;
alter table public.community_rooms add column if not exists room_type text not null default 'public';
alter table public.community_rooms add column if not exists is_private boolean not null default false;
alter table public.community_rooms add column if not exists is_locked boolean not null default false;
alter table public.community_rooms add column if not exists is_read_only boolean not null default false;
alter table public.community_rooms add column if not exists is_hidden boolean not null default false;
alter table public.community_rooms add column if not exists is_archived boolean not null default false;
alter table public.community_rooms add column if not exists is_pinned boolean not null default false;
alter table public.community_rooms add column if not exists sort_order integer not null default 0;
alter table public.community_rooms add column if not exists avatar_url text;
alter table public.community_rooms add column if not exists rules text;
alter table public.community_rooms add column if not exists pinned_announcement text;
alter table public.community_rooms add column if not exists shared_links jsonb not null default '[]'::jsonb;
alter table public.community_rooms add column if not exists media_gallery jsonb not null default '[]'::jsonb;
alter table public.community_rooms add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.community_rooms add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.community_rooms add column if not exists last_message text;
alter table public.community_rooms add column if not exists last_message_at timestamptz;
alter table public.community_rooms add column if not exists unread_count integer not null default 0;

update public.community_rooms
set created_by = coalesce(created_by, host_id),
    is_private = coalesce(is_private, not coalesce(is_public, true)),
    room_type = coalesce(nullif(room_type, ''), case when coalesce(is_public, true) then 'public' else 'private' end),
    updated_at = coalesce(updated_at, created_at, now())
where true;

create index if not exists community_rooms_category_idx on public.community_rooms(category);
create index if not exists community_rooms_sort_idx on public.community_rooms(is_pinned, sort_order, updated_at desc);
create index if not exists community_rooms_room_type_idx on public.community_rooms(room_type);
create index if not exists community_rooms_community_idx on public.community_rooms(community_id);

create table if not exists public.community_room_roles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  name text not null,
  color text,
  permissions jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(room_id, name)
);

alter table public.community_room_members add column if not exists warning_count integer not null default 0;
alter table public.community_room_members add column if not exists reputation_score integer not null default 0;
alter table public.community_room_members add column if not exists activity_score integer not null default 0;
alter table public.community_room_members add column if not exists muted_until timestamptz;
alter table public.community_room_members add column if not exists banned_until timestamptz;
alter table public.community_room_members add column if not exists is_banned boolean not null default false;
alter table public.community_room_members add column if not exists custom_role_id uuid references public.community_room_roles(id) on delete set null;

do $$
begin
  alter table public.community_room_members drop constraint if exists community_room_members_role_check;
  alter table public.community_room_members add constraint community_room_members_role_check check (role in ('owner', 'admin', 'moderator', 'helper', 'verified', 'member'));
exception when duplicate_object then null;
end $$;

alter table public.community_room_messages add column if not exists message_type text not null default 'text';
alter table public.community_room_messages add column if not exists file_url text;
alter table public.community_room_messages add column if not exists link_preview jsonb not null default '{}'::jsonb;
alter table public.community_room_messages add column if not exists quote_message_id uuid references public.community_room_messages(id) on delete set null;
alter table public.community_room_messages add column if not exists deleted_at timestamptz;

create table if not exists public.community_room_reports (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  message_id uuid references public.community_room_messages(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete set null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);

create table if not exists public.community_room_warnings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.community_room_mutes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.community_room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  appeal_text text,
  appeal_status text default 'none',
  created_at timestamptz not null default now()
);

create table if not exists public.community_room_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.community_rooms(id) on delete cascade,
  moderator_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  message_id uuid references public.community_room_messages(id) on delete set null,
  action_type text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists community_room_reports_room_idx on public.community_room_reports(room_id, status, created_at desc);
create index if not exists community_room_actions_room_idx on public.community_room_moderation_actions(room_id, created_at desc);
create index if not exists community_room_mutes_user_idx on public.community_room_mutes(room_id, user_id, expires_at desc);
create index if not exists community_room_bans_user_idx on public.community_room_bans(room_id, user_id, created_at desc);

create or replace function public.is_room_moderator(room_uuid uuid)
returns boolean as $$
  select exists (
    select 1
    from public.community_room_members m
    where m.room_id = room_uuid
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'moderator')
      and coalesce(m.is_banned, false) = false
  )
  or exists (
    select 1 from public.community_rooms r
    where r.id = room_uuid and coalesce(r.created_by, r.host_id) = auth.uid()
  );
$$ language sql stable;

create or replace function public.can_send_room_message(room_uuid uuid)
returns boolean as $$
  select exists (
    select 1
    from public.community_rooms r
    left join public.community_room_members m on m.room_id = r.id and m.user_id = auth.uid()
    where r.id = room_uuid
      and auth.uid() is not null
      and coalesce(r.is_archived, false) = false
      and coalesce(r.is_locked, false) = false
      and (coalesce(r.is_read_only, false) = false or public.is_room_moderator(room_uuid))
      and coalesce(m.is_banned, false) = false
      and (m.muted_until is null or m.muted_until < now())
      and not exists (
        select 1 from public.community_room_mutes mu
        where mu.room_id = room_uuid and mu.user_id = auth.uid() and mu.expires_at > now()
      )
      and not exists (
        select 1 from public.community_room_bans b
        where b.room_id = room_uuid and b.user_id = auth.uid() and (b.expires_at is null or b.expires_at > now())
      )
  );
$$ language sql stable;

grant select, insert, update on public.community_room_reports to authenticated;
grant select, insert on public.community_room_warnings to authenticated;
grant select, insert on public.community_room_mutes to authenticated;
grant select, insert, update on public.community_room_bans to authenticated;
grant select, insert on public.community_room_moderation_actions to authenticated;
grant select, insert, update, delete on public.community_room_roles to authenticated;

notify pgrst, 'reload schema';

commit;
