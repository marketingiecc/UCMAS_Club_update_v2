-- One-time migration: create normalized classes + roster from legacy profiles.class_name
-- Safe to re-run.
--
-- Prerequisite: run `supabase_teacher_management.sql` first (creates tables + indexes).

/* -------------------------- 1) Create classes rows -------------------------- */

insert into public.classes (name, center_id)
select distinct
  trim(p.class_name) as name,
  p.center_id
from public.profiles p
where p.class_name is not null
  and trim(p.class_name) <> ''
  and coalesce(p.role, 'student') <> 'admin'
on conflict do nothing;

/* ------------------------ 2) Create class_students ------------------------- */

insert into public.class_students (class_id, student_id, joined_at)
select
  c.id as class_id,
  p.id as student_id,
  now() as joined_at
from public.profiles p
join public.classes c
  on c.name = trim(p.class_name)
 and coalesce(c.center_id, '00000000-0000-0000-0000-000000000000'::uuid)
     = coalesce(p.center_id, '00000000-0000-0000-0000-000000000000'::uuid)
where p.class_name is not null
  and trim(p.class_name) <> ''
  and coalesce(p.role, 'student') <> 'admin'
on conflict (class_id, student_id) do nothing;

