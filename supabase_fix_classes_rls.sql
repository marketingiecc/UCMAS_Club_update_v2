-- Fix: Allow students to see ALL classes (to select one in Profile), 
-- instead of only seeing classes they successfully joined.

-- Drop the restrictive policy
drop policy if exists classes_select_admin_teacher_student on public.classes;

-- Create a permissive read policy for all authenticated users
create policy classes_select_all_authenticated
on public.classes
for select
using ( auth.role() = 'authenticated' );
