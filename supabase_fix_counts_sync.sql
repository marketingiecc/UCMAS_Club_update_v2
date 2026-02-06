-- Fix Counts: Sync `profiles.class_name` (legacy) <-> `class_students` (relational)
-- 1. Migrates existing class names to the classes table.
-- 2. Enrolls students into those classes (populates class_students).
-- 3. Adds a Trigger to keep them in sync automatically when Profile is updated.

create extension if not exists "pgcrypto";

-- 1. Ensure all class names from profiles exist in `classes` table
insert into public.classes (name, center_id)
select distinct
  trim(p.class_name) as name,
  p.center_id
from public.profiles p
where p.class_name is not null
  and trim(p.class_name) <> ''
  and coalesce(p.role, 'student') <> 'admin'
on conflict do nothing;

-- 2. Populate `class_students` for existing profiles
insert into public.class_students (class_id, student_id, joined_at)
select
  c.id as class_id,
  p.id as student_id,
  now() as joined_at
from public.profiles p
join public.classes c
  on c.name = trim(p.class_name)
 -- Match center if possible, otherwise looser match on name (names should be unique-ish)
 -- We use coalesce to handle null center_ids
 and coalesce(c.center_id, '00000000-0000-0000-0000-000000000000'::uuid)
     = coalesce(p.center_id, '00000000-0000-0000-0000-000000000000'::uuid)
where p.class_name is not null
  and trim(p.class_name) <> ''
  and coalesce(p.role, 'student') <> 'admin'
on conflict (class_id, student_id) do nothing;

-- 3. Create Trigger Function to sync future changes
create or replace function public.sync_profile_class_to_roster()
returns trigger
language plpgsql
security definer
as $$
declare
  v_class_id uuid;
begin
  -- Only care if class_name changed
  if NEW.class_name is distinct from OLD.class_name or NEW.center_id is distinct from OLD.center_id then
    
    -- If user removed class name -> remove active enrollments
    if NEW.class_name is null or trim(NEW.class_name) = '' then
      update public.class_students
      set left_at = now()
      where student_id = NEW.id
        and left_at is null;
      return NEW;
    end if;

    -- Find or Create Class
    select id into v_class_id
    from public.classes
    where name = trim(NEW.class_name)
      and coalesce(center_id, '00000000-0000-0000-0000-000000000000'::uuid) 
          = coalesce(NEW.center_id, '00000000-0000-0000-0000-000000000000'::uuid)
    limit 1;

    if v_class_id is null then
      insert into public.classes (name, center_id)
      values (trim(NEW.class_name), NEW.center_id)
      returning id into v_class_id;
    end if;

    -- Mark OLD active enrollments as left (if different class)
    update public.class_students
    set left_at = now()
    where student_id = NEW.id
      and class_id <> v_class_id
      and left_at is null;

    -- Insert NEW enrollment if not exists (or re-activate?)
    -- Simplest: Insert on conflict do nothing. 
    -- If re-joining, we might want to clear left_at, but creating a new row is cleaner history.
    if not exists (
      select 1 from public.class_students 
      where class_id = v_class_id and student_id = NEW.id and left_at is null
    ) then
      insert into public.class_students (class_id, student_id, joined_at)
      values (v_class_id, NEW.id, now());
    end if;

  end if;
  return NEW;
end;
$$;

-- 4. Attach Trigger
drop trigger if exists on_profile_class_change on public.profiles;
create trigger on_profile_class_change
after insert or update
on public.profiles
for each row
execute function public.sync_profile_class_to_roster();
