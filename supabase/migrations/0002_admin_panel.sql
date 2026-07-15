-- ─────────────────────────────────────────────────────────────────────────
-- Admin panel: role/premium flags on profiles + usage, tickets, settings.
--
-- All additive & non-breaking. Admin data access uses the service-role client
-- (server-side, after an is_admin check), so these tables intentionally expose
-- NO RLS policies to authenticated users — deny by default. Only the
-- service-role key (admin server code + the chat usage writer) may read/write.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Flags on profiles.
alter table public.profiles
  add column if not exists is_admin   boolean not null default false,
  add column if not exists is_premium boolean not null default false;

comment on column public.profiles.is_admin is
  'Grants access to the /admin panel. Only trusted internal accounts.';
comment on column public.profiles.is_premium is
  'Comped account: unlimited AI usage, no billing. Set from the admin Users tab.';

-- 2. Per-request GPT usage, one row per /api/chat call (summed across tool rounds).
create table if not exists public.usage_events (
  id                uuid primary key default gen_random_uuid(),
  client_id         text not null,
  model             text not null default '',
  prompt_tokens     integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens      integer not null default 0,
  created_at        timestamptz not null default now()
);

comment on table public.usage_events is
  'GPT API usage, one row per chat request. Powers the admin Overview usage panel and per-account meters.';

create index if not exists usage_events_created_at_idx on public.usage_events (created_at);
create index if not exists usage_events_client_id_idx  on public.usage_events (client_id);

alter table public.usage_events enable row level security;
-- No policies: only the service-role key (admin server code + chat writer) may touch it.

-- 3. Support tickets from the Contact Us flow (admin-read for now).
create table if not exists public.support_tickets (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  topic      text not null default '',
  body       text not null default '',
  created_at timestamptz not null default now()
);

comment on table public.support_tickets is
  'Contact Us submissions. Email + topic + body; no client_id (senders need not have an account).';

create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at);

alter table public.support_tickets enable row level security;
-- No policies: admin reads via the service-role client.

-- 4. Global admin-editable settings (key/value). Seeds the live system prompt.
create table if not exists public.admin_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.admin_settings is
  'Global settings editable from the admin Settings tab (e.g. the Alex system prompt template).';

alter table public.admin_settings enable row level security;
-- No policies: read/written by the service-role client only.

create or replace function public.admin_settings_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists admin_settings_set_updated_at on public.admin_settings;
create trigger admin_settings_set_updated_at
  before update on public.admin_settings
  for each row execute function public.admin_settings_set_updated_at();

-- Seed the editable system prompt from the current in-code default. The
-- {{assistantName}} / {{boardName}} placeholders are interpolated per tenant.
insert into public.admin_settings (key, value)
values ('system_prompt', $prompt$You are {{assistantName}}, a friendly hiring assistant for {{boardName}}.
You help job hunters find roles by chatting with them instead of scrolling listings.

How you work:
- You find jobs by calling the search_jobs tool. It needs at least a job title/field and a location.
- Before searching, make sure you know those. If either is missing, ask a short, friendly clarifying question to fill the gap. Ask one or two things at a time, never a long form. It's also good to ask about salary or remote preference when natural.
- Once you have enough, call search_jobs and share the returned jobs as links. Only share jobs the tool returns — never invent listings, links, titles, or salaries.
- If the search returns nothing, say so and suggest broadening the title or trying another location.
- You can also answer general job-hunting questions.

Keep replies concise, warm, and conversational.$prompt$)
on conflict (key) do nothing;

-- 5. Make the founder account the admin.
update public.profiles
  set is_admin = true
  where id = (select id from auth.users where email = 'denny.t.mail@gmail.com');
