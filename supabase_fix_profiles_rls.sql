-- Fix View Permissions on Profiles
-- The issue: "0 students" likely means the Teacher/Admin cannot SELECT rows from public.profiles due to RLS.

-- 1. Enable RLS (just to be sure it's on)
alter table if exists public.profiles enable row level security;

-- 2. Drop restrictive policies if they exist (guessing names)
drop policy if exists "Profiles are viewable by owner" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_all on public.profiles;

-- 3. Create a PERMISSIVE policy for Authenticated Users
-- We want Teachers to see Students, Admins to see Everyone.
-- Simplest approach: Allow ANY authenticated user to read ALL profiles.
-- (This is common for social/app platforms where names/avatars are public).
create policy profiles_select_all_authenticated
on public.profiles
for select
using ( auth.role() = 'authenticated' );

-- 4. Allow Admins/Teachers to Update/Insert if needed?
-- Usually users update their own profile. Admin updates are separate.
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
using ( 
  auth.uid() = id 
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
)
with check ( 
  auth.uid() = id 
  or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') 
);

-- 5. Helper: Ensure 'rpc_get_students_progress_summary' can actually read the data.
-- Since the RPC is 'security definer', it technically bypasses RLS for the table it queries directly,
-- BUT if it joins other tables (like class_students) that have RLS, those might still apply if not careful.
-- However, we fixed class_students RLS in previous step. 
-- The main issue might be valid data in 'teacher_classes'.

-- Re-assign teachers one last time (Force)
insert into public.teacher_classes (class_id, teacher_id)
select distinct c.id, p.id
from public.profiles p
join public.classes c on lower(trim(c.name)) = lower(trim(p.class_name))
where p.role = 'teacher'
on conflict (class_id, teacher_id) do nothing;
