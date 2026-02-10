-- Track Day Library (Kho bài luyện tập cho lộ trình)
-- 1 file JSON = cấu hình đầy đủ 1 ngày (tối đa 3 mode: visual/audio/flash)
--
-- Notes:
-- - Requires `public.profiles` table with column `role` (admin/student/teacher...)
-- - Policies below allow only admin users (profiles.role='admin') to CRUD

create extension if not exists "pgcrypto";

create table if not exists public.track_day_library (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- Optional: used for filtering/suggestions in picker UI
  -- Prefer storing human-friendly level name for filtering (e.g. "Cơ bản", "Sơ cấp A"...)
  level_name text,
  -- Backward compatible: level symbol (Z/A/C/...) if your app still uses symbols internally
  level_symbol text,
  -- Original validated JSON payload
  payload jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration for existing DBs (if table already existed before adding level_name)
alter table public.track_day_library
  add column if not exists level_name text;

-- Update updated_at automatically
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_track_day_library_set_updated_at on public.track_day_library;
create trigger trg_track_day_library_set_updated_at
before update on public.track_day_library
for each row
execute function public.set_updated_at_timestamp();

-- RLS
alter table public.track_day_library enable row level security;

-- Helper predicate in policies: admin only
-- NOTE: kept inline (no dependency on custom SQL function).
drop policy if exists "track_day_library_admin_select" on public.track_day_library;
create policy "track_day_library_admin_select"
on public.track_day_library
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "track_day_library_admin_insert" on public.track_day_library;
create policy "track_day_library_admin_insert"
on public.track_day_library
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "track_day_library_admin_update" on public.track_day_library;
create policy "track_day_library_admin_update"
on public.track_day_library
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "track_day_library_admin_delete" on public.track_day_library;
create policy "track_day_library_admin_delete"
on public.track_day_library
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

