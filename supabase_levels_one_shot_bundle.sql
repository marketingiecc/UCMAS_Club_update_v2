begin;

-- =========================================================
-- ONE-SHOT BUNDLE
-- Includes:
--   1) split level system (study/exam + profiles backfill)
--   2) rpc_get_students_progress_summary update (with new columns)
-- Safe to re-run (idempotent where possible).
-- =========================================================

-- Temporarily drop FKs if they already exist from previous runs.
-- They will be recreated near the end after normalization/upsert/backfill.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'profiles_study_level_id_fkey'
  ) then
    alter table public.profiles drop constraint profiles_study_level_id_fkey;
  end if;

  if exists (
    select 1 from pg_constraint where conname = 'profiles_exam_level_id_fkey'
  ) then
    alter table public.profiles drop constraint profiles_exam_level_id_fkey;
  end if;
end $$;

-- =========================================================
-- 1) Catalog: study levels (16 levels)
-- =========================================================
create table if not exists public.study_levels (
  id text primary key,
  code text not null unique,
  name_vi text not null,
  sort_order int not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Normalize legacy/old ids in profiles by code (if any old catalog already exists)
do $$
begin
  if to_regclass('public.profiles') is not null and to_regclass('public.study_levels') is not null then
    update public.profiles p
    set study_level_id = case sl.code
      when 'KG1A' then 'study_kg1a'
      when 'KG1B' then 'study_kg1b'
      when 'KG2' then 'study_kg2'
      when 'KG3' then 'study_kg3'
      when 'KG4' then 'study_kg4'
      when 'ADV_A' then 'study_advanced_a'
      when 'ADV_B' then 'study_advanced_b'
      when 'BASIC' then 'study_basic'
      when 'BASIC_EXT' then 'study_basic_extended'
      when 'ENHANCED' then 'study_enhanced'
      when 'ELM_A' then 'study_elementary_a'
      when 'ELM_B' then 'study_elementary_b'
      when 'INT_A' then 'study_intermediate_a'
      when 'INT_B' then 'study_intermediate_b'
      when 'EXC_A' then 'study_excellent_a'
      when 'EXC_B' then 'study_excellent_b'
      else p.study_level_id
    end
    from public.study_levels sl
    where p.study_level_id = sl.id;

    -- Fallback remap by sort_order for old/custom rows that used canonical order slots.
    update public.profiles p
    set study_level_id = case sl.sort_order
      when 10 then 'study_kg1a'
      when 20 then 'study_kg1b'
      when 30 then 'study_kg2'
      when 40 then 'study_kg3'
      when 50 then 'study_kg4'
      when 60 then 'study_advanced_a'
      when 70 then 'study_advanced_b'
      when 80 then 'study_basic'
      when 90 then 'study_basic_extended'
      when 100 then 'study_enhanced'
      when 110 then 'study_elementary_a'
      when 120 then 'study_elementary_b'
      when 130 then 'study_intermediate_a'
      when 140 then 'study_intermediate_b'
      when 150 then 'study_excellent_a'
      when 160 then 'study_excellent_b'
      else p.study_level_id
    end
    from public.study_levels sl
    where p.study_level_id = sl.id
      and sl.sort_order in (10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160);
  end if;
end $$;

-- Remove non-canonical rows for known study level codes (safe after remap above)
delete from public.study_levels
where code in (
  'KG1A','KG1B','KG2','KG3','KG4',
  'ADV_A','ADV_B','BASIC','BASIC_EXT','ENHANCED',
  'ELM_A','ELM_B','INT_A','INT_B','EXC_A','EXC_B'
)
and id not in (
  'study_kg1a','study_kg1b','study_kg2','study_kg3','study_kg4',
  'study_advanced_a','study_advanced_b','study_basic','study_basic_extended','study_enhanced',
  'study_elementary_a','study_elementary_b','study_intermediate_a','study_intermediate_b','study_excellent_a','study_excellent_b'
);

-- Remove conflicting non-canonical rows occupying canonical sort slots.
delete from public.study_levels
where sort_order in (10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160)
and id not in (
  'study_kg1a','study_kg1b','study_kg2','study_kg3','study_kg4',
  'study_advanced_a','study_advanced_b','study_basic','study_basic_extended','study_enhanced',
  'study_elementary_a','study_elementary_b','study_intermediate_a','study_intermediate_b','study_excellent_a','study_excellent_b'
);

insert into public.study_levels (id, code, name_vi, sort_order)
values
  ('study_kg1a', 'KG1A', 'KG1A', 10),
  ('study_kg1b', 'KG1B', 'KG1B', 20),
  ('study_kg2', 'KG2', 'KG2', 30),
  ('study_kg3', 'KG3', 'KG3', 40),
  ('study_kg4', 'KG4', 'KG4', 50),
  ('study_advanced_a', 'ADV_A', 'Cao cap A', 60),
  ('study_advanced_b', 'ADV_B', 'Cao cap B', 70),
  ('study_basic', 'BASIC', 'Co ban', 80),
  ('study_basic_extended', 'BASIC_EXT', 'Co ban mo rong', 90),
  ('study_enhanced', 'ENHANCED', 'Nang cao', 100),
  ('study_elementary_a', 'ELM_A', 'So cap A', 110),
  ('study_elementary_b', 'ELM_B', 'So cap B', 120),
  ('study_intermediate_a', 'INT_A', 'Trung cap A', 130),
  ('study_intermediate_b', 'INT_B', 'Trung cap B', 140),
  ('study_excellent_a', 'EXC_A', 'Xuat sac A', 150),
  ('study_excellent_b', 'EXC_B', 'Xuat sac B', 160)
on conflict (id) do update
set
  code = excluded.code,
  name_vi = excluded.name_vi,
  sort_order = excluded.sort_order,
  is_active = true;

-- =========================================================
-- 2) Catalog: exam levels (10 levels)
-- =========================================================
create table if not exists public.exam_levels (
  id text primary key,
  symbol text not null unique,
  name_vi text not null,
  name_en text not null,
  sort_order int not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Normalize legacy/old ids in profiles by symbol (if any old catalog already exists)
do $$
begin
  if to_regclass('public.profiles') is not null and to_regclass('public.exam_levels') is not null then
    update public.profiles p
    set exam_level_id = case el.symbol
      when 'G' then 'exam_advanced_a'
      when 'H' then 'exam_advanced_b'
      when 'A' then 'exam_basic'
      when 'Z' then 'exam_basic_extended'
      when 'I' then 'exam_enhanced'
      when 'C' then 'exam_elementary_a'
      when 'D' then 'exam_elementary_b'
      when 'E' then 'exam_intermediate_a'
      when 'F' then 'exam_intermediate_b'
      when 'K' then 'exam_excellent'
      else p.exam_level_id
    end
    from public.exam_levels el
    where p.exam_level_id = el.id;

    -- Fallback remap by sort_order for old/custom rows.
    update public.profiles p
    set exam_level_id = case el.sort_order
      when 10 then 'exam_advanced_a'
      when 20 then 'exam_advanced_b'
      when 30 then 'exam_basic'
      when 40 then 'exam_basic_extended'
      when 50 then 'exam_enhanced'
      when 60 then 'exam_elementary_a'
      when 70 then 'exam_elementary_b'
      when 80 then 'exam_intermediate_a'
      when 90 then 'exam_intermediate_b'
      when 100 then 'exam_excellent'
      else p.exam_level_id
    end
    from public.exam_levels el
    where p.exam_level_id = el.id
      and el.sort_order in (10,20,30,40,50,60,70,80,90,100);
  end if;
end $$;

-- Remove non-canonical rows for known exam symbols
delete from public.exam_levels
where symbol in ('G','H','A','Z','I','C','D','E','F','K')
and id not in (
  'exam_advanced_a','exam_advanced_b','exam_basic','exam_basic_extended','exam_enhanced',
  'exam_elementary_a','exam_elementary_b','exam_intermediate_a','exam_intermediate_b','exam_excellent'
);

delete from public.exam_levels
where sort_order in (10,20,30,40,50,60,70,80,90,100)
and id not in (
  'exam_advanced_a','exam_advanced_b','exam_basic','exam_basic_extended','exam_enhanced',
  'exam_elementary_a','exam_elementary_b','exam_intermediate_a','exam_intermediate_b','exam_excellent'
);

insert into public.exam_levels (id, symbol, name_vi, name_en, sort_order)
values
  ('exam_advanced_a', 'G', 'Cao cap A', 'Advanced A', 10),
  ('exam_advanced_b', 'H', 'Cao cap B', 'Advanced B', 20),
  ('exam_basic', 'A', 'Co ban', 'Basic', 30),
  ('exam_basic_extended', 'Z', 'Co ban mo rong', 'Basic Extended', 40),
  ('exam_enhanced', 'I', 'Nang cao', 'Higher', 50),
  ('exam_elementary_a', 'C', 'So cap A', 'Elementary A', 60),
  ('exam_elementary_b', 'D', 'So cap B', 'Elementary B', 70),
  ('exam_intermediate_a', 'E', 'Trung cap A', 'Intermediate A', 80),
  ('exam_intermediate_b', 'F', 'Trung cap B', 'Intermediate B', 90),
  ('exam_excellent', 'K', 'Xuat sac', 'Excellent', 100)
on conflict (id) do update
set
  symbol = excluded.symbol,
  name_vi = excluded.name_vi,
  name_en = excluded.name_en,
  sort_order = excluded.sort_order,
  is_active = true;

-- =========================================================
-- 3) Profiles: add columns + constraints + indexes
-- =========================================================
alter table public.profiles
  add column if not exists study_level_id text,
  add column if not exists exam_level_id text;

create index if not exists idx_profiles_study_level_id on public.profiles(study_level_id);
create index if not exists idx_profiles_exam_level_id on public.profiles(exam_level_id);

-- =========================================================
-- 4) Backfill from legacy level_symbol
-- =========================================================
update public.profiles p
set study_level_id = case p.level_symbol
  when 'Z' then 'study_basic_extended'
  when 'A' then 'study_basic'
  when 'C' then 'study_elementary_a'
  when 'D' then 'study_elementary_b'
  when 'E' then 'study_intermediate_a'
  when 'F' then 'study_intermediate_b'
  when 'G' then 'study_advanced_a'
  when 'H' then 'study_advanced_b'
  when 'I' then 'study_enhanced'
  when 'K' then 'study_excellent_a'
  else p.study_level_id
end
where p.study_level_id is null;

update public.profiles p
set exam_level_id = case p.level_symbol
  when 'Z' then 'exam_basic_extended'
  when 'A' then 'exam_basic'
  when 'C' then 'exam_elementary_a'
  when 'D' then 'exam_elementary_b'
  when 'E' then 'exam_intermediate_a'
  when 'F' then 'exam_intermediate_b'
  when 'G' then 'exam_advanced_a'
  when 'H' then 'exam_advanced_b'
  when 'I' then 'exam_enhanced'
  when 'K' then 'exam_excellent'
  else p.exam_level_id
end
where p.exam_level_id is null;

alter table public.profiles
  alter column study_level_id set default 'study_basic',
  alter column exam_level_id set default 'exam_basic';

-- =========================================================
-- 5) Training tracks: split by study_level_id (independent)
-- =========================================================
alter table public.training_tracks
  add column if not exists study_level_id text;

create index if not exists idx_training_tracks_study_level_id
  on public.training_tracks(study_level_id);

-- Backfill existing tracks from legacy level_symbol
update public.training_tracks t
set study_level_id = case t.level_symbol
  when 'Z' then 'study_basic_extended'
  when 'A' then 'study_basic'
  when 'C' then 'study_elementary_a'
  when 'D' then 'study_elementary_b'
  when 'E' then 'study_intermediate_a'
  when 'F' then 'study_intermediate_b'
  when 'G' then 'study_advanced_a'
  when 'H' then 'study_advanced_b'
  when 'I' then 'study_enhanced'
  when 'K' then 'study_excellent_a'
  else t.study_level_id
end
where t.study_level_id is null;

-- Add FK for track->study level once data is backfilled.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'training_tracks_study_level_id_fkey'
  ) then
    alter table public.training_tracks
      add constraint training_tracks_study_level_id_fkey
      foreign key (study_level_id) references public.study_levels(id);
  end if;
end $$;

-- Recreate FKs after all normalization/backfill is complete.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_study_level_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_study_level_id_fkey
      foreign key (study_level_id) references public.study_levels(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_exam_level_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_exam_level_id_fkey
      foreign key (exam_level_id) references public.exam_levels(id);
  end if;
end $$;

-- =========================================================
-- 6) Ensure cups RLS policy exists (if table exists)
-- =========================================================
do $$
begin
  if to_regclass('public.user_collected_cups') is not null then
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'user_collected_cups'
        and policyname = 'Admins and Teachers can view all cups'
    ) then
      create policy "Admins and Teachers can view all cups"
      on public.user_collected_cups
      for select
      using (
        public.is_admin()
        or public.teacher_has_student(user_id)
      );
    end if;
  end if;
end $$;

-- =========================================================
-- 7) Recreate RPC with study_level_id + exam_level_id
-- =========================================================
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
  study_level_id text,
  exam_level_id text,
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
      p.study_level_id,
      p.exam_level_id,
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

commit;
