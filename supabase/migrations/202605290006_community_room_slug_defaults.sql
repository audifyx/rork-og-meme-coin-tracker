begin;

create or replace function public.ensure_community_room_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 2;
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  if new.name is null or btrim(new.name) = '' then
    new.name := coalesce(nullif(new.slug, ''), 'room');
  end if;

  base_slug := lower(coalesce(nullif(new.slug, ''), nullif(new.name, ''), 'room'));
  base_slug := regexp_replace(base_slug, '[^a-z0-9 -]', '', 'g');
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := regexp_replace(base_slug, '(^-+|-+$)', '', 'g');
  base_slug := left(coalesce(nullif(base_slug, ''), 'room'), 48);
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.community_rooms room
    where room.slug = candidate_slug
      and room.id <> new.id
  ) loop
    candidate_slug := left(base_slug, greatest(1, 48 - length('-' || suffix::text))) || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate_slug;
  return new;
end;
$$;

drop trigger if exists trg_ensure_community_room_slug on public.community_rooms;
create trigger trg_ensure_community_room_slug
before insert or update of name, slug on public.community_rooms
for each row
execute function public.ensure_community_room_slug();

update public.community_rooms
set slug = slug
where slug is null or btrim(slug) = '';

notify pgrst, 'reload schema';

commit;
