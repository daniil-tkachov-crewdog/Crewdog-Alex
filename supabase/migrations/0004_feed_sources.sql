-- ─────────────────────────────────────────────────────────────────────────
-- feed_sources — a tenant's pinned RSS/Atom feed for scheduled auto-updates.
--
-- CSV upload is a one-time import; a feed link can be re-pulled on a cadence so
-- the job database stays fresh. One row per client_id (a tenant pins at most
-- one auto-update feed). A scheduled job (pg_cron, below) hits the app's
-- /api/feeds/refresh endpoint hourly; the endpoint re-pulls every source whose
-- interval has elapsed since last_run_at. Everything is scoped by client_id.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.feed_sources (
  -- One auto-update feed per tenant. FK to profiles.client_id (unique).
  client_id      text primary key references public.profiles(client_id) on delete cascade,

  -- The feed URL and the tenant's column mapping (same shape the import UI uses).
  url            text not null,
  mapping        jsonb not null default '{}'::jsonb,

  -- Re-pull cadence in hours. UI offers 6 / 12 / 24 / 48.
  interval_hours integer not null check (interval_hours in (6, 12, 24, 48)),

  -- Auto-update on/off. Off keeps the config but pauses re-pulls.
  enabled        boolean not null default true,

  -- When the scheduler last successfully re-pulled this feed. NULL = never yet.
  last_run_at    timestamptz,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.feed_sources is
  'Per-tenant pinned RSS/Atom feed for scheduled auto-updates. One row per client_id.';

-- ── Row Level Security ─────────────────────────────────────────────────────
-- Same owner-only rule as jobs: a user only touches the row for their own
-- client_id. The scheduled refresh runs with the service-role key (bypasses
-- RLS) and isolates by client_id in code.
alter table public.feed_sources enable row level security;

create policy "feed_sources_owner_select" on public.feed_sources
  for select to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "feed_sources_owner_insert" on public.feed_sources
  for insert to authenticated
  with check (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "feed_sources_owner_update" on public.feed_sources
  for update to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()))
  with check (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "feed_sources_owner_delete" on public.feed_sources
  for delete to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

-- Keep updated_at fresh on every write (reuses the jobs trigger function).
create trigger feed_sources_set_updated_at
  before update on public.feed_sources
  for each row execute function public.jobs_set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Scheduling: pg_cron fires hourly and asks the app to refresh due feeds.
--
-- Cron granularity is hourly; the 6/12/24/48h cadence is enforced in the route
-- (it re-pulls a source only once its interval has elapsed since last_run_at),
-- so one hourly job covers every interval.
--
-- The app base URL and the shared secret are NOT hardcoded — set them once per
-- environment in private.feed_refresh_settings after this migration runs:
--
--   insert into private.feed_refresh_settings (base_url, secret)
--   values ('https://your-app.example.com', '<same value as FEED_REFRESH_SECRET>')
--   on conflict (id) do update
--     set base_url = excluded.base_url, secret = excluded.secret;
-- ─────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists private;

create table if not exists private.feed_refresh_settings (
  id       boolean primary key default true check (id),  -- single-row table
  base_url text not null,
  secret   text not null
);

-- Posts to the app's refresh endpoint with the shared secret. No-op (and warns)
-- until the settings row is populated, so this migration is safe to run early.
create or replace function private.run_feed_refresh()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cfg private.feed_refresh_settings;
begin
  select * into cfg from private.feed_refresh_settings limit 1;
  if cfg is null then
    raise notice 'feed refresh skipped: private.feed_refresh_settings is empty';
    return;
  end if;

  perform net.http_post(
    url     := cfg.base_url || '/api/feeds/refresh',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-feed-refresh-secret', cfg.secret
    ),
    body    := '{}'::jsonb
  );
end;
$$;

-- Schedule (idempotent): unschedule any prior job of this name, then schedule.
do $$
begin
  perform cron.unschedule('feed-refresh-hourly');
exception when others then
  null; -- not scheduled yet
end;
$$;

select cron.schedule('feed-refresh-hourly', '0 * * * *', $$ select private.run_feed_refresh(); $$);
