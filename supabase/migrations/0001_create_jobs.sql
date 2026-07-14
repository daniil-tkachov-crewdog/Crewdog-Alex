-- ─────────────────────────────────────────────────────────────────────────
-- jobs — every job listing Alex can search, scoped per tenant by client_id.
--
-- One shared table for all clients (NOT a table per account): rows are isolated
-- by client_id + Row Level Security, mirroring how `profiles` already works.
-- The dashboard writes/edits rows for the logged-in user's own client_id; the
-- Alex widget reads them.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.jobs (
  -- Internal surrogate key. The source "ID" (source_id) is user-editable and
  -- only unique *within* a client, so it can't be the primary key.
  row_id      uuid primary key default gen_random_uuid(),

  -- Tenant this row belongs to. FK to profiles.client_id (which is unique).
  client_id   text not null references public.profiles(client_id) on delete cascade,

  -- The "ID" column from the client's CSV. Editable; unique per client.
  source_id   text not null,

  title       text not null default '',
  description text not null default '',
  location    text not null default '',
  salary      text not null default '',

  -- Link to the original job posting on the board's site. Optional on import.
  job_link    text not null default '',

  -- Disabled jobs stay in the table but are excluded from Alex's search.
  disabled    boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.jobs is
  'Job listings Alex searches over. One row per job, isolated per tenant by client_id + RLS.';

-- Upsert-by-ID target and the guarantee behind the dashboard''s "duplicate ID"
-- flag: a given source_id appears at most once per client.
create unique index if not exists jobs_client_source_id_key
  on public.jobs (client_id, source_id);

-- Widget/dashboard read path: "all jobs for this client".
create index if not exists jobs_client_id_idx on public.jobs (client_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.jobs enable row level security;

-- A logged-in user may only touch rows whose client_id matches the client_id
-- on their own profile. Covers SELECT/INSERT/UPDATE/DELETE from the dashboard.
create policy "jobs_owner_select" on public.jobs
  for select to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "jobs_owner_insert" on public.jobs
  for insert to authenticated
  with check (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "jobs_owner_update" on public.jobs
  for update to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()))
  with check (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "jobs_owner_delete" on public.jobs
  for delete to authenticated
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

-- Keep updated_at fresh on every write.
create or replace function public.jobs_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.jobs_set_updated_at();
