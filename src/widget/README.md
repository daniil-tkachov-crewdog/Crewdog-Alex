# Track A — Alex widget

The job-hunter-facing chatbot: the embeddable chat UI + the server-side engine
that drives it. Lives in the same repo as the portal (Track B), separated by
folder. Everything keys off `client_id`.

## Folder structure

```
src/widget/
  llm/
    types.ts            LLMProvider interface, ChatMessage, ToolSpec/ToolHandler
    openai-provider.ts  OpenAI implementation + tool loop (server-side key only)
    index.ts            getLLM() factory — callers never name a vendor
  data/
    client-config.ts    getClientConfigById() — resolve tenant + gate from client_id
    search-jobs.ts       plain filtered query over the jobs table (tenant-scoped)
  search-tool.ts        the search_jobs tool spec (required params) + handler
  system-prompt.ts      Alex persona + clarifying-questions rule (branded)

src/lib/supabase/
  service.ts            server-only service-role client (bypasses RLS)

src/app/
  api/chat/route.ts     POST /api/chat — resolve → gate → LLM + search tool
  (widget)/embed/       The chat window UI served inside the iframe

public/
  widget.js             One-line loader: floating icon + mounts the iframe
```

Shared contracts (job schema, ClientConfig) live in `src/shared/` and are the
single source of truth both tracks meet on.

## Status

**Slice 1 (done):** chat only — real GPT replies.

**Slice 2 (done):** `search_jobs` tool-calling (required `title`/`location` =
hard enforcement of clarifying questions), plain tenant-scoped job search over
the real `jobs` table (surfaces `job_link`, excludes `disabled` rows), branding
+ subscription gating resolved from `client_id`. Read path: **server-side
service-role** key in `/api/chat` (bypasses RLS; key stays server-only).

**Next:** per-tenant logo/colour branding (needs portal-stored branding
columns), account-level `is_live` gating, usage/token metering.

## Gating (v1)

A widget serves only when the account's subscription tier is paid (not
`free`). The live DB has no account-level `is_live` column yet, so that half
of the contract's `isWidgetActive` is deferred. **Comped/admin accounts are
comped by setting a paid tier** on their `profiles` row.

## Known caveats

- **`proxy.ts` runs `supabase.auth.getUser()` on `/embed` and `/api/chat`.**
  These are public routes, so that auth call is wasted work — harmless, but
  not needed. Left untouched to keep the widget diff off portal code. When
  touching `proxy.ts` next, exclude the widget paths from its matcher.
- **`salary` is free text** (e.g. `"£45k–£55k"`), not numeric, so search does
  not filter on it in v1 — a future `salary_min` filter needs fuzzy parsing.
- **Tenant isolation is enforced in code, not RLS**: the widget reads with the
  service-role key (bypasses RLS), so every query MUST filter by `client_id`.

## Config (Render env vars — server-side only)

- `OPENAI_API_KEY` — required. Never exposed to the browser.
- `OPENAI_MODEL` — optional, defaults to `gpt-4o-mini`.
- `SUPABASE_SERVICE_ROLE_KEY` — required. Server-only; bypasses RLS.
