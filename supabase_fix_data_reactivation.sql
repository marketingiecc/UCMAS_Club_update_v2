-- Fix: Reactivate students in class_students if they are marked as 'left' (left_at is not null)
-- but their Profile still says they are in that class.

-- 1. Update existing rows (Re-join)
update public.class_students cs
set left_at = null
from public.profiles p, public.classes c
where cs.student_id = p.id
  and cs.class_id = c.id
  and lower(trim(c.name)) = lower(trim(p.class_name))
  and cs.left_at is not null;

-- 2. Insert new rows for anyone showing "missing" (Upsert)
insert into public.class_students (class_id, student_id, joined_at)
select distinct
  c.id,
  p.id,
  now()
from public.profiles p
join public.classes c
  on lower(trim(c.name)) = lower(trim(p.class_name))
where p.class_name is not null
  and trim(p.class_name) <> ''
on conflict (class_id, student_id) 
do update set left_at = null; 

-- 3. Verify Teachers are assigned active (just in case)
update public.teacher_classes tc
set unassigned_at = null
from public.profiles p, public.classes c
where tc.teacher_id = p.id
  and tc.class_id = c.id
  and lower(trim(c.name)) = lower(trim(p.class_name))
  and p.role = 'teacher'
  and tc.unassigned_at is not null;
