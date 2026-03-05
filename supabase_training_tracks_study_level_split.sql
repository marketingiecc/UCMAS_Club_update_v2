begin;

-- Make training track data independent by study_level_id.
alter table public.training_tracks
  add column if not exists study_level_id text;

create index if not exists idx_training_tracks_study_level_id
  on public.training_tracks(study_level_id);

-- Backfill old rows from legacy level_symbol.
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

commit;
