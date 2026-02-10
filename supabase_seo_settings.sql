-- Site SEO settings (singleton)
-- Safe to re-run.
--
-- This adds a single-row table keyed by `id = 'default'` for SEO metadata + SVG assets.
-- RLS:
--  - SELECT: public
--  - WRITE: admin only (public.is_admin())

create extension if not exists "pgcrypto";

create table if not exists public.site_seo_settings (
  id text primary key,
  site_name text,
  default_title text,
  default_description text,
  keywords text,
  canonical_url text,
  robots text,

  og_title text,
  og_description text,
  og_url text,
  og_image_svg text,

  twitter_site text,
  twitter_creator text,

  theme_color text,
  google_site_verification text,
  structured_data_json text,
  footer_company_name text,

  logo_svg text,
  favicon_svg text,

  updated_at timestamptz not null default now()
);

-- Safe add columns if table already exists (idempotent)
alter table if exists public.site_seo_settings add column if not exists og_url text;
alter table if exists public.site_seo_settings add column if not exists theme_color text;
alter table if exists public.site_seo_settings add column if not exists google_site_verification text;
alter table if exists public.site_seo_settings add column if not exists structured_data_json text;
alter table if exists public.site_seo_settings add column if not exists footer_company_name text;

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_site_seo_settings_updated_at on public.site_seo_settings;
create trigger trg_site_seo_settings_updated_at
before update on public.site_seo_settings
for each row execute procedure public.tg_set_updated_at();

alter table if exists public.site_seo_settings enable row level security;

drop policy if exists site_seo_settings_select_all on public.site_seo_settings;
create policy site_seo_settings_select_all
on public.site_seo_settings
for select
using (true);

drop policy if exists site_seo_settings_admin_write on public.site_seo_settings;
create policy site_seo_settings_admin_write
on public.site_seo_settings
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.site_seo_settings (id, site_name, default_title, robots)
values ('default', 'UCMAS Club', 'UCMAS Club - Luyện Tập Toán Tư Duy', 'index,follow')
on conflict (id) do nothing;

-- If you added new tables, refresh PostgREST schema cache:
-- notify pgrst, 'reload schema';

