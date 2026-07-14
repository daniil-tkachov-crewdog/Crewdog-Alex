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
the `jobs` table, per-tenant branding + subscription gating from `client_id`.

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
