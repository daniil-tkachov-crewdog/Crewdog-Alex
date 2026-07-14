# Track A — Alex widget

The job-hunter-facing chatbot: the embeddable chat UI + the server-side engine
that drives it. Lives in the same repo as the portal (Track B), separated by
folder. Everything keys off `client_id`.

## Folder structure

```
src/widget/
  llm/
    types.ts            LLMProvider interface + ChatMessage (the swappable seam)
    openai-provider.ts  OpenAI implementation (server-side key only)
    index.ts            getLLM() factory — callers never name a vendor
  system-prompt.ts      Alex persona + clarifying-questions rule (placeholder brand)

src/app/
  api/chat/route.ts     POST /api/chat — public orchestrator (system prompt → LLM)
  (widget)/embed/       The chat window UI served inside the iframe

public/
  widget.js             One-line loader: floating icon + mounts the iframe
```

Shared contracts (job schema, ClientConfig) live in `src/shared/` and are the
single source of truth both tracks meet on.

## Status

**Slice 1 (done):** chat only — real GPT replies, placeholder branding.
No job search, no DB reads, no `client_id` resolution yet.

**Next:** `search_jobs` tool-calling (hard enforcement of clarifying questions),
per-tenant branding + subscription gating from `client_id`. The `jobs` table
now exists — see the two open items below before wiring search.

## ⚠️ Open items for the widget (do these before `search_jobs`)

The portal (Track B) landed the job database: the `public.jobs` table is live
in Supabase, and the dashboard writes/edits/deletes rows scoped by `client_id`.
Two things the widget side still needs:

1. **Mirror the contract change.** `src/shared/job-schema.ts` now has a
   `job_link` field (link to the original posting) and the dashboard adds a
   `disabled` flag on rows. When `search_jobs` runs:
   - **surface `job_link`** for every matching job in Alex's reply, and
   - **exclude `disabled = true` rows** — disabled jobs must never appear in
     search results.
2. **Decide the widget's Supabase read path.** Current RLS on `public.jobs`
   only grants access to the logged-in *owner* (`client_id = the user's
   profile`). Job hunters never log in, so the widget can't read jobs under
   those policies as-is. Pick one before search works:
   - a public `SELECT` RLS policy filtered to `disabled = false` (widget reads
     with the anon key by `client_id`), **or**
   - a server-side read using the service-role key in `/api/chat` (bypasses
     RLS; keep the key server-only).

## Known caveats

- **`proxy.ts` runs `supabase.auth.getUser()` on `/embed` and `/api/chat`.**
  These are public routes (job hunters never log in), so that auth call is
  wasted work — harmless, but not needed. Left untouched to keep the widget
  diff off portal code. When touching `proxy.ts` next, exclude the widget
  paths from its matcher.
- **`Job.salary` is free text** (e.g. `"£45k–£55k"`), not numeric. A future
  `search_jobs(salary_min)` filter will need fuzzy parsing, not a `>=` compare.

## Config (Render env vars — server-side only)

- `OPENAI_API_KEY` — required. Never exposed to the browser.
- `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.
