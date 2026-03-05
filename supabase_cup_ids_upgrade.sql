begin;

-- =========================================================
-- CUP ID UPGRADE
-- - Track cups are independent by study_level_id + week
-- - Every cup has a unique ID; each student can claim each cup_id once
-- - Supports future bonus cups by inserting more rows into cup_catalog
-- =========================================================

create table if not exists public.cup_catalog (
  id text primary key,
  cup_type text not null check (cup_type in ('track_week', 'bonus')),
  title text not null,
  study_level_id text references public.study_levels(id),
  week_index int check (week_index between 0 and 15),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint cup_catalog_track_shape check (
    (cup_type = 'track_week' and study_level_id is not null and week_index is not null)
    or (cup_type = 'bonus')
  )
);

alter table public.user_collected_cups
  add column if not exists cup_id text,
  add column if not exists cup_type text,
  add column if not exists study_level_id text;

create index if not exists idx_user_collected_cups_user_id on public.user_collected_cups(user_id);
create index if not exists idx_user_collected_cups_cup_id on public.user_collected_cups(cup_id);
create index if not exists idx_user_collected_cups_study_level_id on public.user_collected_cups(study_level_id);

-- Fill 256 track cups: 16 levels x 16 weeks
insert into public.cup_catalog (id, cup_type, title, study_level_id, week_index)
select
  format('track:%s:week:%s', sl.id, lpad((w + 1)::text, 2, '0')) as id,
  'track_week' as cup_type,
  format('%s - Tuan %s', sl.name_vi, w + 1) as title,
  sl.id as study_level_id,
  w as week_index
from public.study_levels sl
cross join generate_series(0, 15) as w
on conflict (id) do update
set
  cup_type = excluded.cup_type,
  title = excluded.title,
  study_level_id = excluded.study_level_id,
  week_index = excluded.week_index,
  is_active = true;

-- Try to keep old claims by converting to "legacy bonus" cup IDs
-- (avoids ambiguity because old rows had only week_index and no level).
insert into public.cup_catalog (id, cup_type, title)
select distinct
  format('legacy:week:%s', lpad((coalesce(uc.week_index, 0) + 1)::text, 2, '0')) as id,
  'bonus' as cup_type,
  format('Legacy cup week %s', coalesce(uc.week_index, 0) + 1) as title
from public.user_collected_cups uc
where uc.cup_id is null
on conflict (id) do nothing;

update public.user_collected_cups uc
set
  cup_id = format('legacy:week:%s', lpad((coalesce(uc.week_index, 0) + 1)::text, 2, '0')),
  cup_type = coalesce(uc.cup_type, 'bonus')
where uc.cup_id is null;

-- Add FK after data is normalized
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_collected_cups_cup_id_fkey'
  ) then
    alter table public.user_collected_cups
      add constraint user_collected_cups_cup_id_fkey
      foreign key (cup_id) references public.cup_catalog(id);
  end if;
end $$;

-- Replace old uniqueness (user_id, week_index) with (user_id, cup_id)
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'user_collected_cups_user_week_unique'
  ) then
    alter table public.user_collected_cups
      drop constraint user_collected_cups_user_week_unique;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_collected_cups_user_cup_unique'
  ) then
    alter table public.user_collected_cups
      add constraint user_collected_cups_user_cup_unique unique (user_id, cup_id);
  end if;
end $$;

commit;
