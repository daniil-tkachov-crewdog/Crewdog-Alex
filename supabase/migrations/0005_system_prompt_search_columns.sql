-- ─────────────────────────────────────────────────────────────────────────
-- Teach the stored system prompt about the admin-configured essential search
-- columns via a {{SearchColumns}} placeholder. The widget resolves this per
-- request from the search tool config (formatSearchColumnList), so Alex always
-- asks for exactly the columns search_jobs currently requires — no drift.
--
-- Idempotent: only touches the row that still carries the old hardcoded
-- "job title/field and a location" wording and doesn't already use the token,
-- so admin customizations and reruns are left alone.
-- ─────────────────────────────────────────────────────────────────────────
update public.admin_settings
set value = replace(
      value,
      '- You find jobs by calling the search_jobs tool. It needs at least a job title/field and a location.',
      '- You find jobs by calling the search_jobs tool. To run it you need these details from the user: {{SearchColumns}}. Ask a short, friendly clarifying question for whichever of them are missing.'
    )
where key = 'system_prompt'
  and value like '%It needs at least a job title/field and a location.%'
  and value not like '%{{SearchColumns}}%';
