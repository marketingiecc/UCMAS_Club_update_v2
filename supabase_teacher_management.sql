-- Teacher management + normalized classes (UCMAS Club)
-- Safe to re-run (uses IF EXISTS / DROP POLICY IF EXISTS where possible).
--
-- Contents:
-- 1) Helper role-check functions for RLS
-- 2) Normalized class tables: classes, class_students, teacher_classes
-- 3) RLS policies for the new tables

create extension if not exists "pgcrypto";

/* ----------------------------- Helper functions ----------------------------- */

-- NOTE: SECURITY DEFINER so it can read profiles even if profiles has RLS.
-- IMPORTANT: Always set a safe search_path.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  );
$$;

create or replace function public.is_admin_or_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_teacher();
$$;

/* ------------------------------ Class tables ------------------------------ */

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  center_id uuid references public.centers(id),
  created_at timestamptz not null default now()
);

-- Enforce uniqueness even when center_id is NULL.
create unique index if not exists classes_unique_center_name
  on public.classes ((coalesce(center_id, '00000000-0000-0000-0000-000000000000'::uuid)), name);

create index if not exists classes_name_idx
  on public.classes (name);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (class_id, student_id)
);

create index if not exists class_students_class_id_idx
  on public.class_students (class_id);

create index if not exists class_students_student_id_idx
  on public.class_students (student_id);

create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  unique (class_id, teacher_id)
);

create index if not exists teacher_classes_teacher_id_idx
  on public.teacher_classes (teacher_id);

create index if not exists teacher_classes_class_id_idx
  on public.teacher_classes (class_id);

/* ---------------------------- RLS for new tables --------------------------- */

alter table if exists public.classes enable row level security;
alter table if exists public.class_students enable row level security;
alter table if exists public.teacher_classes enable row level security;

-- CLASSES
drop policy if exists classes_select_admin_teacher_student on public.classes;
create policy classes_select_admin_teacher_student
on public.classes
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.teacher_classes tc
    where tc.class_id = classes.id
      and tc.teacher_id = auth.uid()
      and tc.unassigned_at is null
  )
  or exists (
    select 1
    from public.class_students cs
    where cs.class_id = classes.id
      and cs.student_id = auth.uid()
      and cs.left_at is null
  )
);

drop policy if exists classes_admin_write on public.classes;
create policy classes_admin_write
on public.classes
for all
using (public.is_admin())
with check (public.is_admin());

-- CLASS_STUDENTS
drop policy if exists class_students_select_admin_teacher_student on public.class_students;
create policy class_students_select_admin_teacher_student
on public.class_students
for select
using (
  public.is_admin()
  or student_id = auth.uid()
  or exists (
    select 1
    from public.teacher_classes tc
    where tc.class_id = class_students.class_id
      and tc.teacher_id = auth.uid()
      and tc.unassigned_at is null
  )
);

drop policy if exists class_students_admin_write on public.class_students;
create policy class_students_admin_write
on public.class_students
for all
using (public.is_admin())
with check (public.is_admin());

-- TEACHER_CLASSES
drop policy if exists teacher_classes_select_admin_teacher on public.teacher_classes;
create policy teacher_classes_select_admin_teacher
on public.teacher_classes
for select
using (
  public.is_admin()
  or teacher_id = auth.uid()
);

drop policy if exists teacher_classes_admin_write on public.teacher_classes;
create policy teacher_classes_admin_write
on public.teacher_classes
for all
using (public.is_admin())
with check (public.is_admin());

