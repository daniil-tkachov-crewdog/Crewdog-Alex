-- ─────────────────────────────────────────────────────────────────────────
-- Search + summary upgrade.
--
-- Adds to public.jobs:
--   * category        — coarse job family (e.g. "Healthcare"), AI-derived at
--                       import/edit, editable by the tenant. Powers the
--                       summary tool's ≥threshold branch.
--   * search_tsvector — GENERATED lexeme index over title/description/location,
--                       so Alex's search understands grammar (stemming, word
--                       order, stop-words) instead of raw substring matching.
--
-- Plus pg_trgm (typo tolerance) and two RPCs the widget calls:
--   * search_jobs_ranked  — FTS + optional trigram, ranked, tenant-scoped.
--   * summarize_jobs       — aggregate digest (counts, locations, titles or
--                            categories) so Alex knows what the board holds
--                            WITHOUT pulling rows.
--
-- All additive & non-breaking.
-- ─────────────────────────────────────────────────────────────────────────

-- Trigram matching for fuzzy/typo-tolerant title search. Installed into the
-- `extensions` schema (Supabase convention); functions/opclasses are referenced
-- schema-qualified below because the RPCs run with an empty search_path.
create extension if not exists pg_trgm with schema extensions;

-- 1. New columns on jobs.
alter table public.jobs
  add column if not exists category text not null default '';

comment on column public.jobs.category is
  'Coarse job family (e.g. "Healthcare", "Hospitality"). AI-derived at import '
  'and when the category field is left blank on edit; tenant-editable. Groups '
  'the summary tool''s digest once a board crosses the count threshold.';

-- Generated lexeme column: Postgres fills and maintains it on every write, so
-- search does zero per-row work. Weighted A/B/C so title matches outrank
-- description/location matches in ts_rank.
alter table public.jobs
  add column if not exists search_tsvector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C')
  ) stored;

comment on column public.jobs.search_tsvector is
  'Auto-generated full-text lexemes over title/description/location. Never '
  'written by hand — Postgres maintains it. GIN-indexed for fast @@ matching.';

-- 2. Indexes powering the two match paths.
create index if not exists jobs_search_tsvector_idx
  on public.jobs using gin (search_tsvector);

create index if not exists jobs_title_trgm_idx
  on public.jobs using gin (title extensions.gin_trgm_ops);

-- 3. Ranked search RPC. Combines FTS rank with (optional) trigram similarity
--    into one score; filters by tenant, live/disabled, link presence, and an
--    optional location ILIKE; returns the top matches. The widget passes the
--    admin-configured limit / min score / strategy through.
create or replace function public.search_jobs_ranked(
  p_client_id text,
  p_query text,
  p_location text default '',
  p_limit int default 8,
  p_min_score real default 0.0,
  p_use_trgm boolean default true,
  p_include_disabled boolean default false
)
returns table (
  title text,
  location text,
  salary text,
  job_link text,
  score real
)
language sql
stable
set search_path = ''
as $$
  with q as (
    select websearch_to_tsquery('english', nullif(p_query, '')) as tsq
  )
  select r.title, r.location, r.salary, r.job_link, r.score
  from (
    select
      j.title,
      j.location,
      j.salary,
      j.job_link,
      (
        coalesce(ts_rank(j.search_tsvector, q.tsq), 0)
        + case when p_use_trgm and p_query <> ''
               then extensions.similarity(j.title, p_query)
               else 0 end
      )::real as score
    from public.jobs j
    cross join q
    where j.client_id = p_client_id
      and (p_include_disabled or j.disabled = false)
      and j.job_link <> ''
      and (p_location = '' or j.location ilike '%' || p_location || '%')
      and (
        p_query = ''
        or (q.tsq is not null and j.search_tsvector @@ q.tsq)
        or (p_use_trgm and extensions.similarity(j.title, p_query) > 0.2)
      )
  ) r
  where p_query = '' or r.score >= p_min_score
  order by r.score desc, r.title
  limit greatest(p_limit, 1);
$$;

comment on function public.search_jobs_ranked is
  'Tenant-scoped ranked job search (full-text + optional trigram fuzz). Used by '
  'the Alex widget''s search_jobs tool.';

-- 4. Summary RPC. Returns a compact JSON digest that scales to any board size,
--    because the DB does the counting and only a capped digest crosses the
--    wire. Branches on a configurable count threshold: small boards summarize
--    by title, large boards by category.
create or replace function public.summarize_jobs(
  p_client_id text,
  p_threshold int default 100,
  p_max_items int default 20,
  p_location text default ''
)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_total bigint;
  v_facet text;
  v_items jsonb;
  v_locations jsonb;
begin
  select count(*) into v_total
  from public.jobs
  where client_id = p_client_id
    and disabled = false
    and (p_location = '' or location ilike '%' || p_location || '%');

  -- Location breakdown is always useful and cheap.
  select coalesce(
           jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc),
           '[]'::jsonb)
    into v_locations
  from (
    select nullif(trim(location), '') as label, count(*) as n
    from public.jobs
    where client_id = p_client_id
      and disabled = false
      and (p_location = '' or location ilike '%' || p_location || '%')
    group by 1
    having nullif(trim(location), '') is not null
    order by n desc
    limit greatest(p_max_items, 1)
  ) loc;

  if v_total < p_threshold then
    v_facet := 'title';
    select coalesce(
             jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc),
             '[]'::jsonb)
      into v_items
    from (
      select nullif(trim(title), '') as label, count(*) as n
      from public.jobs
      where client_id = p_client_id
        and disabled = false
        and (p_location = '' or location ilike '%' || p_location || '%')
      group by 1
      having nullif(trim(title), '') is not null
      order by n desc
      limit greatest(p_max_items, 1)
    ) t;
  else
    v_facet := 'category';
    select coalesce(
             jsonb_agg(jsonb_build_object('label', label, 'count', n) order by n desc),
             '[]'::jsonb)
      into v_items
    from (
      select coalesce(nullif(trim(category), ''), 'Uncategorized') as label,
             count(*) as n
      from public.jobs
      where client_id = p_client_id
        and disabled = false
        and (p_location = '' or location ilike '%' || p_location || '%')
      group by 1
      order by n desc
      limit greatest(p_max_items, 1)
    ) c;
  end if;

  return jsonb_build_object(
    'total', v_total,
    'facet', v_facet,
    'items', v_items,
    'locations', v_locations
  );
end;
$$;

comment on function public.summarize_jobs is
  'Tenant-scoped aggregate digest for the Alex widget''s summarize_jobs tool. '
  'Branches by count threshold: titles for small boards, categories for large.';

-- 5. Seed default tool config into the existing admin_settings key/value store.
--    JSON blobs the admin Settings tab edits and the widget reads per request.
insert into public.admin_settings (key, value)
values
  ('search_tool_config',
   '{"matchStrategy":"fuzzy","resultsPerSearch":8,"minScore":0,"includeDisabled":false}'),
  ('summary_tool_config',
   '{"enabled":true,"countThreshold":100,"maxItems":20}')
on conflict (key) do nothing;

-- 6. Teach the live system prompt about summarize_jobs. Idempotent: only rows
--    that don't already mention the tool are touched, so admin edits and reruns
--    are safe. Inserted right after the search_jobs line.
update public.admin_settings
set value = replace(
      value,
      '- You find jobs by calling the search_jobs tool. It needs at least a job title/field and a location.',
      '- You find jobs by calling the search_jobs tool. It needs at least a job title/field and a location.' || E'\n' ||
      '- If the user is unsure what they want, or asks what''s available, call the summarize_jobs tool first. It gives you an overview of the board (counts, main job types/categories, main locations) so you can suggest directions. Never present that overview as a list of real jobs.'
    )
where key = 'system_prompt'
  and value like '%search_jobs tool%'
  and value not like '%summarize_jobs%';
