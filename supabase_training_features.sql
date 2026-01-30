-- UCMAS Supabase sync proposal
-- Focused on activation, contests, practice history, and training paths.

create extension if not exists "pgcrypto";

/* ----------------------------- Core profiles ----------------------------- */
create table if not exists public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists student_code text,
  add column if not exists phone text,
  add column if not exists level_symbol text,
  add column if not exists class_name text,
  add column if not exists center_id uuid references public.centers(id),
  add column if not exists role text not null default 'student',
  add column if not exists avatar_url text;

/* --------------------------- Activation codes --------------------------- */
create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  code_type text not null check (code_type in ('account', 'contest')),
  contest_id uuid references public.contests(id),
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

/* ------------------------------ Contests ------------------------------- */
create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  requires_activation boolean not null default true,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.contest_registrations (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'completed')),
  registered_at timestamptz not null default now(),
  unique (contest_id, user_id)
);

/* --------------------------- Practice history --------------------------- */
create table if not exists public.practice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('visual', 'audio', 'flash')),
  practice_type text not null default 'practice'
    check (practice_type in ('practice', 'elite', 'contest')),
  level_symbol text,
  difficulty text check (difficulty in ('basic', 'advanced', 'elite')),
  question_count int not null default 0,
  digits int,
  rows int,
  speed_seconds numeric(4,2),
  language text,
  correct_count int not null default 0,
  score int not null default 0,
  duration_seconds int not null default 0,
  source text check (source in ('random', 'bank', 'json_upload')) default 'random',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

/* ------------------------ Training path (lo trinh) ------------------------ */
create table if not exists public.training_tracks (
  id uuid primary key default gen_random_uuid(),
  level_symbol text not null,
  title text not null,
  description text,
  total_days int not null default 120,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_track_days (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.training_tracks(id) on delete cascade,
  day_no int not null check (day_no between 1 and 120),
  unique (track_id, day_no)
);

create table if not exists public.training_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.training_track_days(id) on delete cascade,
  order_no int not null check (order_no between 1 and 3),
  mode text not null check (mode in ('visual', 'audio', 'flash')),
  difficulty text not null check (difficulty in ('basic', 'advanced', 'elite')),
  question_count int not null default 0,
  digits int,
  rows int,
  speed_seconds numeric(4,2),
  language text,
  source text not null default 'generated'
    check (source in ('generated', 'json_upload')),
  json_url text,
  exercise_payload jsonb,
  created_at timestamptz not null default now(),
  unique (day_id, order_no)
);

create table if not exists public.training_day_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_id uuid not null references public.training_track_days(id) on delete cascade,
  completed_at timestamptz,
  is_completed boolean not null default false,
  unique (user_id, day_id)
);

create table if not exists public.training_day_exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.training_day_results(id) on delete cascade,
  exercise_id uuid not null references public.training_day_exercises(id) on delete cascade,
  score int not null default 0,
  correct_count int not null default 0,
  duration_seconds int not null default 0,
  answers jsonb,
  completed_at timestamptz not null default now(),
  unique (result_id, exercise_id)
);

/* -------------------------- Exercise bank (elite) -------------------------- */
create table if not exists public.exercise_bank_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  mode text not null check (mode in ('visual', 'audio', 'flash')),
  level_symbol text,
  difficulty text check (difficulty in ('basic', 'advanced', 'elite')),
  payload jsonb not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
-- UCMAS Training Features Schema
-- This file adds tables for new training features and admin management.

-- 1) Progressive Training
create table if not exists public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  total_levels int not null default 10,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_path_levels (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  level_no int not null,
  mode text not null,
  settings jsonb not null default '{}'::jsonb,
  target_score int not null default 80,
  created_at timestamptz not null default now(),
  unique (path_id, level_no)
);

create table if not exists public.learning_path_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  current_level int not null default 1,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, path_id)
);

create table if not exists public.learning_path_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.learning_path_enrollments(id) on delete cascade,
  level_no int not null,
  score int not null,
  completed_at timestamptz not null default now()
);

-- 2) Daily Challenges
create table if not exists public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  challenge_date date not null,
  mode text not null,
  settings jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (challenge_date, mode)
);

create table if not exists public.daily_challenge_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null,
  duration_seconds int not null default 0,
  completed_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- 3) Guided Practice
create table if not exists public.guided_practice_modules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  mode text not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guided_practice_steps (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.guided_practice_modules(id) on delete cascade,
  step_no int not null,
  content text not null,
  example jsonb,
  created_at timestamptz not null default now(),
  unique (module_id, step_no)
);

create table if not exists public.guided_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.guided_practice_modules(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_step int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (module_id, user_id)
);

-- 4) Topic-Based Practice
create table if not exists public.practice_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  mode text not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.topic_practice_sets (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.practice_topics(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.topic_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.practice_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null,
  duration_seconds int not null default 0,
  completed_at timestamptz not null default now()
);

-- 5) Speed Training
create table if not exists public.speed_training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  speed_target numeric(5,2) not null,
  score int not null default 0,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);

-- 6) Skill-Based Practice
create table if not exists public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_practice_sets (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skill_categories(id) on delete cascade,
  mode text not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skill_categories(id) on delete cascade,
  score int not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

-- 7) Virtual Abacus
create table if not exists public.virtual_abacus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);

-- 8) Group Practice
create table if not exists public.group_practice_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.group_practice_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_practice_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_practice_groups(id) on delete cascade,
  mode text not null,
  settings jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now()
);

create table if not exists public.group_practice_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.group_practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score int not null default 0,
  completed_at timestamptz not null default now()
);

-- 9) Badges & Achievements
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

-- 10) Progress Reports
create table if not exists public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_range text not null, -- day/week/month
  summary jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  unique (user_id, report_range)
);

-- Seed skill categories (optional)
insert into public.skill_categories (name, description)
values
  ('Tập trung', 'Rèn luyện khả năng tập trung cao độ'),
  ('Ghi nhớ', 'Phát triển trí nhớ siêu việt'),
  ('Tư duy logic', 'Nâng cao tư duy phản biện và logic'),
  ('Tính toán siêu tốc', 'Tăng tốc độ tính toán'),
  ('Quan sát', 'Nâng cao khả năng quan sát')
on conflict do nothing;

-- 11) Account Profile Extensions (student profile fields)
alter table if exists public.profiles
  add column if not exists full_name text,
  add column if not exists student_code text,
  add column if not exists phone text,
  add column if not exists level_symbol text,
  add column if not exists class_name text,
  add column if not exists center_name text,
  add column if not exists avatar_url text;

-- 12) Activation Codes (account / contest)
create table if not exists public.activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  code_type text not null check (code_type in ('account', 'contest')),
  contest_id uuid references public.contests(id),
  is_used boolean not null default false,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- 13) Contests (listing and registrations)
create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  requires_activation boolean not null default true,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.contest_registrations (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'completed')),
  registered_at timestamptz not null default now(),
  unique (contest_id, user_id)
);

-- 14) Practice History (random practice / contest practice)
create table if not exists public.practice_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('visual', 'audio', 'flash', 'elite_visual', 'elite_audio', 'elite_flash')),
  level_symbol text,
  difficulty text check (difficulty in ('basic', 'advanced', 'elite')),
  question_count int not null default 0,
  correct_count int not null default 0,
  score int not null default 0,
  duration_seconds int not null default 0,
  source text check (source in ('random', 'bank', 'json_upload')) default 'random',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 15) Training Track (lo trinh luyen tap theo cap do)
create table if not exists public.training_tracks (
  id uuid primary key default gen_random_uuid(),
  level_symbol text not null,
  title text not null,
  description text,
  total_days int not null default 120,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_track_days (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.training_tracks(id) on delete cascade,
  day_no int not null check (day_no between 1 and 120),
  unique (track_id, day_no)
);

create table if not exists public.training_day_exercises (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.training_track_days(id) on delete cascade,
  order_no int not null check (order_no between 1 and 3),
  mode text not null check (mode in ('visual', 'audio', 'flash')),
  difficulty text check (difficulty in ('basic', 'advanced', 'elite')),
  question_count int not null default 0,
  digits int,
  rows int,
  speed_seconds numeric(4,2),
  language text,
  source text check (source in ('generated', 'json_upload')) default 'generated',
  exercise_payload jsonb,
  created_at timestamptz not null default now(),
  unique (day_id, order_no)
);

create table if not exists public.training_day_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_id uuid not null references public.training_track_days(id) on delete cascade,
  completed_at timestamptz,
  is_completed boolean not null default false,
  unique (user_id, day_id)
);

create table if not exists public.training_day_exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.training_day_results(id) on delete cascade,
  exercise_id uuid not null references public.training_day_exercises(id) on delete cascade,
  score int not null default 0,
  correct_count int not null default 0,
  duration_seconds int not null default 0,
  answers jsonb,
  completed_at timestamptz not null default now(),
  unique (result_id, exercise_id)
);

-- 16) Exercise Bank (for elite practice and admin upload)
create table if not exists public.exercise_bank_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  mode text not null check (mode in ('visual', 'audio', 'flash')),
  level_symbol text,
  difficulty text check (difficulty in ('basic', 'advanced', 'elite')),
  payload jsonb not null,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

