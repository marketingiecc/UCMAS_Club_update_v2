-- RPC Update V3: Advanced Stats (Level, Filtered Training Days, Cups)
--
-- Changes:
-- 1. Returns `level_symbol` from profiles.
-- 2. `training_completed_days` now respects `p_from` and `p_to` filters.
-- 3. Retains `cups_count` and existing `attempts` filtering.

-- Drop first to allow return type change
drop function if exists public.rpc_get_students_progress_summary(uuid, uuid, text, timestamptz, timestamptz, int, int);

create or replace function public.rpc_get_students_progress_summary(
  p_class_id uuid default null,
  p_teacher_id uuid default null,
  p_search text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  student_id uuid,
  full_name text,
  email text,
  student_code text,
  phone text,
  level_symbol text, -- Added
  class_names text,
  attempts_count int,
  accuracy_pct numeric,
  total_time_seconds int,
  last_attempt_at timestamptz,
  training_completed_days int,
  learning_paths_count int,
  learning_path_max_level int,
  cups_count int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := public.is_admin();
begin
  -- Security: Teacher can only see their own scope (unless admin)
  if p_teacher_id is not null and (not caller_is_admin) and p_teacher_id <> caller_id then
    raise exception 'forbidden';
  end if;

  return query
  with
  roster as (
    select distinct p.id as student_id
    from public.profiles p
    where coalesce(p.role, 'student') <> 'admin'
  ),
  scoped as (
    select r.student_id
    from roster r
    where
      (
        p_class_id is null
        or exists (
          select 1 from public.class_students cs
          where cs.student_id = r.student_id
            and cs.class_id = p_class_id
            and cs.left_at is null
        )
      )
      and
      (
        p_teacher_id is null
        or exists (
          select 1
          from public.teacher_classes tc
          join public.class_students cs
            on cs.class_id = tc.class_id
            and cs.left_at is null
          where tc.teacher_id = p_teacher_id
            and tc.unassigned_at is null
            and cs.student_id = r.student_id
        )
      )
  ),
  filtered_profiles as (
    select p.*
    from public.profiles p
    join scoped s on s.student_id = p.id
    where
      (p_search is null or p_search = '' or (
        coalesce(p.full_name, '') ilike ('%' || p_search || '%')
        or coalesce(p.student_code, '') ilike ('%' || p_search || '%')
        or coalesce(p.phone, '') ilike ('%' || p_search || '%')
      ))
  ),
  attempts_agg as (
    select
      a.user_id as student_id,
      count(*)::int as attempts_count,
      sum(coalesce(a.score_correct, 0))::int as correct_sum,
      sum(coalesce(a.score_total, 0))::int as total_sum,
      sum(coalesce(a.duration_seconds, 0))::int as time_sum,
      max(a.created_at) as last_attempt_at
    from public.attempts a
    where
      (p_from is null or a.created_at >= p_from)
      and (p_to is null or a.created_at <= p_to)
    group by a.user_id
  ),
  training_agg as (
    select
      r.user_id as student_id,
      count(*) filter (where r.is_completed = true)::int as training_completed_days
    from public.training_day_results r
    where
       -- Filter training days by date range too
      (p_from is null or r.created_at >= p_from)
      and (p_to is null or r.created_at <= p_to)
    group by r.user_id
  ),
  lp_agg as (
    select
      e.user_id as student_id,
      count(*)::int as learning_paths_count,
      max(coalesce(e.current_level, 0))::int as learning_path_max_level
    from public.learning_path_enrollments e
    group by e.user_id
  ),
  class_agg as (
    select
      cs.student_id,
      string_agg(distinct c.name, ', ' order by c.name) as class_names
    from public.class_students cs
    join public.classes c on c.id = cs.class_id
    where cs.left_at is null
    group by cs.student_id
  ),
  cups_agg as (
      select 
          c.user_id as student_id,
          count(*)::int as cups_count
      from public.user_collected_cups c
      group by c.user_id
  )
  select
    p.id as student_id,
    p.full_name,
    p.email,
    p.student_code,
    p.phone,
    p.level_symbol, -- Returned
    ca.class_names,
    coalesce(aa.attempts_count, 0) as attempts_count,
    case
      when coalesce(aa.total_sum, 0) > 0
        then round((aa.correct_sum::numeric / aa.total_sum::numeric) * 100, 1)
      else 0
    end as accuracy_pct,
    coalesce(aa.time_sum, 0) as total_time_seconds,
    aa.last_attempt_at,
    coalesce(ta.training_completed_days, 0) as training_completed_days,
    coalesce(lp.learning_paths_count, 0) as learning_paths_count,
    coalesce(lp.learning_path_max_level, 0) as learning_path_max_level,
    coalesce(cu.cups_count, 0) as cups_count
  from filtered_profiles p
  left join attempts_agg aa on aa.student_id = p.id
  left join training_agg ta on ta.student_id = p.id
  left join lp_agg lp on lp.student_id = p.id
  left join class_agg ca on ca.student_id = p.id
  left join cups_agg cu on cu.student_id = p.id
  order by coalesce(aa.last_attempt_at, p.created_at) desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$$;
