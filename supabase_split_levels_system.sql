begin;

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
-- 2) Catalog: exam levels (10 levels, legacy-compatible)
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
-- 3) Profiles: add new columns and FKs
-- =========================================================
alter table public.profiles
  add column if not exists study_level_id text,
  add column if not exists exam_level_id text;

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

commit;
