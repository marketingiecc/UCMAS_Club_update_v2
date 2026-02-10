-- RPC + RLS policies for teacher/admin progress dashboards
-- Safe to re-run.
--
-- Requires: `supabase_teacher_management.sql` (for is_admin/is_teacher helpers).

create extension if not exists "pgcrypto";

/* ----------------------------- Helper functions ----------------------------- */

create or replace function public.teacher_has_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_classes tc
    join public.class_students cs
      on cs.class_id = tc.class_id
     and cs.left_at is null
    where tc.teacher_id = auth.uid()
      and tc.unassigned_at is null
      and cs.student_id = p_student_id
  );
$$;

create or replace function public.teacher_has_enrollment(p_enrollment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.learning_path_enrollments e
    where e.id = p_enrollment_id
      and public.teacher_has_student(e.user_id)
  );
$$;

create or replace function public.teacher_has_training_result(p_result_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.training_day_results r
    where r.id = p_result_id
      and public.teacher_has_student(r.user_id)
  );
$$;

/* ------------------------------ Useful indexes ------------------------------ */

create index if not exists attempts_user_created_at_idx
  on public.attempts (user_id, created_at desc);

create index if not exists training_day_results_user_idx
  on public.training_day_results (user_id);

create index if not exists learning_path_enrollments_user_idx
  on public.learning_path_enrollments (user_id);

create index if not exists learning_path_progress_enrollment_idx
  on public.learning_path_progress (enrollment_id);

create index if not exists speed_training_sessions_user_created_at_idx
  on public.speed_training_sessions (user_id, created_at desc);

/* --------------------------------- RLS ---------------------------------- */

-- NOTE: Enabling RLS changes runtime behavior; these policies preserve:
-- - Students: can read/write their own rows
-- - Admins: can read everything
-- - Teachers: can read rows for students in their roster (via teacher_has_student)

alter table if exists public.attempts enable row level security;
drop policy if exists attempts_select_admin_teacher_owner on public.attempts;
create policy attempts_select_admin_teacher_owner
on public.attempts
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.teacher_has_student(user_id)
);

drop policy if exists attempts_insert_owner on public.attempts;
create policy attempts_insert_owner
on public.attempts
for insert
with check (user_id = auth.uid());

-- practice_history (used for elite / other modes)
alter table if exists public.practice_history enable row level security;
drop policy if exists practice_history_select_admin_teacher_owner on public.practice_history;
create policy practice_history_select_admin_teacher_owner
on public.practice_history
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.teacher_has_student(user_id)
);

drop policy if exists practice_history_insert_owner on public.practice_history;
create policy practice_history_insert_owner
on public.practice_history
for insert
with check (user_id = auth.uid());

-- training_day_results
alter table if exists public.training_day_results enable row level security;
drop policy if exists training_day_results_select_admin_teacher_owner on public.training_day_results;
create policy training_day_results_select_admin_teacher_owner
on public.training_day_results
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.teacher_has_student(user_id)
);

drop policy if exists training_day_results_insert_owner on public.training_day_results;
create policy training_day_results_insert_owner
on public.training_day_results
for insert
with check (user_id = auth.uid());

-- training_day_exercise_attempts (scoped via training_day_results)
alter table if exists public.training_day_exercise_attempts enable row level security;
drop policy if exists training_day_exercise_attempts_select_admin_teacher_owner on public.training_day_exercise_attempts;
create policy training_day_exercise_attempts_select_admin_teacher_owner
on public.training_day_exercise_attempts
for select
using (
  public.is_admin()
  or public.teacher_has_training_result(result_id)
  or exists (
    select 1
    from public.training_day_results r
    where r.id = training_day_exercise_attempts.result_id
      and r.user_id = auth.uid()
  )
);

drop policy if exists training_day_exercise_attempts_insert_owner on public.training_day_exercise_attempts;
create policy training_day_exercise_attempts_insert_owner
on public.training_day_exercise_attempts
for insert
with check (
  exists (
    select 1
    from public.training_day_results r
    where r.id = result_id
      and r.user_id = auth.uid()
  )
);

-- learning_path_enrollments
alter table if exists public.learning_path_enrollments enable row level security;
drop policy if exists learning_path_enrollments_select_admin_teacher_owner on public.learning_path_enrollments;
create policy learning_path_enrollments_select_admin_teacher_owner
on public.learning_path_enrollments
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.teacher_has_student(user_id)
);

drop policy if exists learning_path_enrollments_insert_owner on public.learning_path_enrollments;
create policy learning_path_enrollments_insert_owner
on public.learning_path_enrollments
for insert
with check (user_id = auth.uid());

-- learning_path_progress
alter table if exists public.learning_path_progress enable row level security;
drop policy if exists learning_path_progress_select_admin_teacher_owner on public.learning_path_progress;
create policy learning_path_progress_select_admin_teacher_owner
on public.learning_path_progress
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.learning_path_enrollments e
    where e.id = learning_path_progress.enrollment_id
      and e.user_id = auth.uid()
  )
  or public.teacher_has_enrollment(enrollment_id)
);

drop policy if exists learning_path_progress_insert_owner on public.learning_path_progress;
create policy learning_path_progress_insert_owner
on public.learning_path_progress
for insert
with check (
  exists (
    select 1
    from public.learning_path_enrollments e
    where e.id = enrollment_id
      and e.user_id = auth.uid()
  )
);

-- speed_training_sessions
alter table if exists public.speed_training_sessions enable row level security;
drop policy if exists speed_training_sessions_select_admin_teacher_owner on public.speed_training_sessions;
create policy speed_training_sessions_select_admin_teacher_owner
on public.speed_training_sessions
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or public.teacher_has_student(user_id)
);

drop policy if exists speed_training_sessions_insert_owner on public.speed_training_sessions;
create policy speed_training_sessions_insert_owner
on public.speed_training_sessions
for insert
with check (user_id = auth.uid());

/* --------------------------------- RPC ---------------------------------- */

-- Summary per student for dashboard lists (admin or teacher-scoped).
-- Teachers are only allowed to pass their own teacher_id (auth.uid()).
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
  level_symbol text,
  cups_count int,
  class_names text,
  attempts_count int,
  accuracy_pct numeric,
  total_time_seconds int,
  last_attempt_at timestamptz,
  nhin_tinh_attempts_count int,
  nhin_tinh_accuracy_pct numeric,
  nghe_tinh_attempts_count int,
  nghe_tinh_accuracy_pct numeric,
  flash_attempts_count int,
  flash_accuracy_pct numeric,
  training_completed_days int,
  learning_paths_count int,
  learning_path_max_level int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_is_admin boolean := public.is_admin();
  attempts_union_sql text;
begin
  if p_teacher_id is not null and (not caller_is_admin) and p_teacher_id <> caller_id then
    raise exception 'forbidden';
  end if;

  attempts_union_sql := '
    select
      a.user_id,
      a.created_at,
      case
        when a.mode in (''visual'', ''elite_visual'', ''nhin_tinh'') then ''nhin_tinh''
        when a.mode in (''audio'', ''elite_audio'', ''nghe_tinh'') then ''nghe_tinh''
        when a.mode in (''flash'', ''elite_flash'') then ''flash''
        else coalesce(nullif(a.mode, ''''), ''unknown'')
      end as mode_key,
      coalesce(a.score_correct, 0)::int as score_correct,
      coalesce(a.score_total, 0)::int as score_total,
      coalesce(a.duration_seconds, 0)::int as duration_seconds
    from public.attempts a
  ';

  if to_regclass('public.practice_attempts') is not null then
    attempts_union_sql := attempts_union_sql || '
      union all
      select
        pa.user_id,
        pa.created_at,
        case
          when pa.mode in (''visual'', ''elite_visual'', ''nhin_tinh'') then ''nhin_tinh''
          when pa.mode in (''audio'', ''elite_audio'', ''nghe_tinh'') then ''nghe_tinh''
          when pa.mode in (''flash'', ''elite_flash'') then ''flash''
          else coalesce(nullif(pa.mode, ''''), ''unknown'')
        end as mode_key,
        coalesce(pa.score_correct, 0)::int as score_correct,
        coalesce(pa.score_total, 0)::int as score_total,
        coalesce(pa.duration_seconds, 0)::int as duration_seconds
      from public.practice_attempts pa
    ';
  end if;

  if to_regclass('public.practice_history') is not null then
    attempts_union_sql := attempts_union_sql || '
      union all
      select
        ph.user_id,
        ph.created_at,
        case
          when ph.mode in (''visual'', ''elite_visual'', ''nhin_tinh'') then ''nhin_tinh''
          when ph.mode in (''audio'', ''elite_audio'', ''nghe_tinh'') then ''nghe_tinh''
          when ph.mode in (''flash'', ''elite_flash'') then ''flash''
          else coalesce(nullif(ph.mode, ''''), ''unknown'')
        end as mode_key,
        coalesce(ph.correct_count, 0)::int as score_correct,
        coalesce(ph.question_count, 0)::int as score_total,
        coalesce(ph.duration_seconds, 0)::int as duration_seconds
      from public.practice_history ph
    ';
  end if;

  if to_regclass('public.contest_section_attempts') is not null and to_regclass('public.contest_sessions') is not null then
    attempts_union_sql := attempts_union_sql || '
      union all
      select
        cs.user_id,
        coalesce(csa.finished_at, csa.created_at, now()) as created_at,
        case
          when csa.mode in (''visual'', ''elite_visual'', ''nhin_tinh'') then ''nhin_tinh''
          when csa.mode in (''audio'', ''elite_audio'', ''nghe_tinh'') then ''nghe_tinh''
          when csa.mode in (''flash'', ''elite_flash'') then ''flash''
          else coalesce(nullif(csa.mode, ''''), ''unknown'')
        end as mode_key,
        coalesce(csa.score_correct, 0)::int as score_correct,
        coalesce(csa.score_total, 0)::int as score_total,
        coalesce(csa.duration_seconds, 0)::int as duration_seconds
      from public.contest_section_attempts csa
      join public.contest_sessions cs on cs.id = csa.session_id
    ';
  end if;

  return query execute format($SQL$
    with
    roster as (
      select distinct p.id as student_id
      from public.profiles p
      where coalesce(nullif(p.role, ''), 'student') in ('student', 'user')
    ),
    scoped as (
      select r.student_id
      from roster r
      where
        (
          $1 is null
          or exists (
            select 1
            from public.class_students cs
            where cs.student_id = r.student_id
              and cs.class_id = $1
              and cs.left_at is null
          )
        )
        and (
          $2 is null
          or exists (
            select 1
            from public.teacher_classes tc
            join public.class_students cs
              on cs.class_id = tc.class_id
             and cs.left_at is null
            where tc.teacher_id = $2
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
        ($3 is null or $3 = '' or (
          coalesce(p.full_name, '') ilike ('%' || $3 || '%')
          or coalesce(p.student_code, '') ilike ('%' || $3 || '%')
          or coalesce(p.phone, '') ilike ('%' || $3 || '%')
        ))
    ),
    attempts_src as (
      %s
    ),
    attempts_agg as (
      select
        a.user_id as student_id,
        count(*)::int as attempts_count,
        sum(coalesce(a.score_correct, 0))::int as correct_sum,
        sum(coalesce(a.score_total, 0))::int as total_sum,
        sum(coalesce(a.duration_seconds, 0))::int as time_sum,
        max(a.created_at) as last_attempt_at
      from attempts_src a
      where
        ($4 is null or a.created_at >= $4)
        and ($5 is null or a.created_at <= $5)
      group by a.user_id
    ),
    attempts_by_mode as (
      select
        a.user_id as student_id,
        a.mode_key,
        count(*)::int as attempts_count,
        sum(coalesce(a.score_correct, 0))::int as correct_sum,
        sum(coalesce(a.score_total, 0))::int as total_sum
      from attempts_src a
      where
        ($4 is null or a.created_at >= $4)
        and ($5 is null or a.created_at <= $5)
      group by a.user_id, a.mode_key
    ),
    mode_pivot as (
      select
        student_id,
        max(case when mode_key = 'nhin_tinh' then attempts_count end)::int as nhin_tinh_attempts_count,
        max(case when mode_key = 'nhin_tinh' and total_sum > 0 then round((correct_sum::numeric / total_sum::numeric) * 100, 1) end) as nhin_tinh_accuracy_pct,
        max(case when mode_key = 'nghe_tinh' then attempts_count end)::int as nghe_tinh_attempts_count,
        max(case when mode_key = 'nghe_tinh' and total_sum > 0 then round((correct_sum::numeric / total_sum::numeric) * 100, 1) end) as nghe_tinh_accuracy_pct,
        max(case when mode_key = 'flash' then attempts_count end)::int as flash_attempts_count,
        max(case when mode_key = 'flash' and total_sum > 0 then round((correct_sum::numeric / total_sum::numeric) * 100, 1) end) as flash_accuracy_pct
      from attempts_by_mode
      group by student_id
    ),
    training_agg as (
      select
        r.user_id as student_id,
        count(*) filter (where r.is_completed = true)::int as training_completed_days
      from public.training_day_results r
      where
        ($4 is null or r.completed_at >= $4)
        and ($5 is null or r.completed_at <= $5)
      group by r.user_id
    ),
    cups_agg as (
      select
        user_id as student_id,
        count(*)::int as total_cups
      from public.user_collected_cups
      group by user_id
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
    )
    select
      p.id as student_id,
      p.full_name,
      p.email,
      p.student_code,
      p.phone,
      p.level_symbol,
      coalesce(uca.total_cups, 0) as cups_count,
      ca.class_names,
      coalesce(aa.attempts_count, 0) as attempts_count,
      case
        when coalesce(aa.total_sum, 0) > 0
          then round((aa.correct_sum::numeric / aa.total_sum::numeric) * 100, 1)
        else 0
      end as accuracy_pct,
      coalesce(aa.time_sum, 0) as total_time_seconds,
      aa.last_attempt_at,
      coalesce(mp.nhin_tinh_attempts_count, 0) as nhin_tinh_attempts_count,
      coalesce(mp.nhin_tinh_accuracy_pct, 0) as nhin_tinh_accuracy_pct,
      coalesce(mp.nghe_tinh_attempts_count, 0) as nghe_tinh_attempts_count,
      coalesce(mp.nghe_tinh_accuracy_pct, 0) as nghe_tinh_accuracy_pct,
      coalesce(mp.flash_attempts_count, 0) as flash_attempts_count,
      coalesce(mp.flash_accuracy_pct, 0) as flash_accuracy_pct,
      coalesce(ta.training_completed_days, 0) as training_completed_days,
      coalesce(lp.learning_paths_count, 0) as learning_paths_count,
      coalesce(lp.learning_path_max_level, 0) as learning_path_max_level
    from filtered_profiles p
    left join attempts_agg aa on aa.student_id = p.id
    left join mode_pivot mp on mp.student_id = p.id
    left join training_agg ta on ta.student_id = p.id
    left join cups_agg uca on uca.student_id = p.id
    left join lp_agg lp on lp.student_id = p.id
    left join class_agg ca on ca.student_id = p.id
    order by coalesce(aa.last_attempt_at, p.created_at) desc
    limit greatest($6, 1)
    offset greatest($7, 0)
  $SQL$, attempts_union_sql)
  using p_class_id, p_teacher_id, p_search, p_from, p_to, p_limit, p_offset;
end;
$$;
