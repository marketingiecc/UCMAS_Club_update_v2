-- Info management: Centers + Classes schedule
-- Safe to re-run.
--
-- Prerequisite: `supabase_teacher_management.sql` (creates classes table + is_admin()).

create extension if not exists "pgcrypto";

/* ------------------------------- Centers -------------------------------- */

alter table if exists public.centers
  add column if not exists hotline text,
  add column if not exists google_map_url text,
  add column if not exists facebook_url text;

alter table if exists public.centers enable row level security;

drop policy if exists centers_select_all on public.centers;
create policy centers_select_all
on public.centers
for select
using (true);

drop policy if exists centers_admin_write on public.centers;
create policy centers_admin_write
on public.centers
for all
using (public.is_admin())
with check (public.is_admin());

/* --------------------------- Classes date range --------------------------- */

alter table if exists public.classes
  add column if not exists start_date date,
  add column if not exists end_date date;

/* ---------------------------- Class schedules ---------------------------- */

create table if not exists public.class_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  -- 1..7 (Mon..Sun)
  day_of_week int not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (class_id, day_of_week, start_time, end_time)
);

create index if not exists class_schedules_class_id_idx
  on public.class_schedules (class_id);

alter table if exists public.class_schedules enable row level security;

drop policy if exists class_schedules_select_admin_teacher_student on public.class_schedules;
create policy class_schedules_select_admin_teacher_student
on public.class_schedules
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.teacher_classes tc
    where tc.class_id = class_schedules.class_id
      and tc.teacher_id = auth.uid()
      and tc.unassigned_at is null
  )
  or exists (
    select 1
    from public.class_students cs
    where cs.class_id = class_schedules.class_id
      and cs.student_id = auth.uid()
      and cs.left_at is null
  )
);

drop policy if exists class_schedules_admin_write on public.class_schedules;
create policy class_schedules_admin_write
on public.class_schedules
for all
using (public.is_admin())
with check (public.is_admin());

-- If you added new columns/tables, refresh PostgREST schema cache:
-- notify pgrst, 'reload schema';

