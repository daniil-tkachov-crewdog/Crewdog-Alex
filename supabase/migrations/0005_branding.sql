-- ─────────────────────────────────────────────────────────────────────────
-- Branding persistence.
--
-- The Branding tab (assistant name, board name, logo, custom instructions) was
-- UI-only. Add the columns it writes to `profiles` and a public Storage bucket
-- for the logo. The widget reads these to brand the launcher button, the chat
-- header, and the system prompt ({{UserInstructions}}).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists assistant_name text,
  add column if not exists logo_url       text,
  add column if not exists instructions   text;

comment on column public.profiles.assistant_name is
  'Display name of the tenant''s assistant (defaults to "Alex" when null).';
comment on column public.profiles.logo_url is
  'Public URL of the tenant''s chatbot logo (Supabase Storage), or null.';
comment on column public.profiles.instructions is
  'Tenant custom system-prompt instructions, injected as a secondary layer.';

-- Public bucket for tenant logos. Public read (the widget loads them on the
-- customer''s own site); writes happen server-side via the service-role key.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;
