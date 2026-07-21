-- ─────────────────────────────────────────────────────────────────────────
-- Configurable search columns.
--
-- Replaces the old fixed "fuzzy title + hard location ILIKE" search with one
-- that matches over whatever set of columns the admin marks ESSENTIAL (Search
-- tool card → "Essential search columns"). Every essential column with a value
-- must match (AND), and every column is matched the SAME tolerant way —
-- full-text (stemming/word-order) plus optional trigram typo-tolerance — so a
-- board can, say, drop `location` from the essential set instead of having
-- location act as a brittle exact-substring gate that zeroes out good matches.
--
-- search_jobs_ranked (0003) is left in place; the widget now calls this instead.
-- Additive & non-breaking.
-- ─────────────────────────────────────────────────────────────────────────

-- Per-column trigram indexes for the columns that can be searched. title is
-- already indexed by 0003; add the rest so trigram matching stays cheap.
create index if not exists jobs_description_trgm_idx
  on public.jobs using gin (description extensions.gin_trgm_ops);
create index if not exists jobs_location_trgm_idx
  on public.jobs using gin (location extensions.gin_trgm_ops);
create index if not exists jobs_salary_trgm_idx
  on public.jobs using gin (salary extensions.gin_trgm_ops);
create index if not exists jobs_category_trgm_idx
  on public.jobs using gin (category extensions.gin_trgm_ops);

-- Ranked search over an admin-chosen set of columns.
--
--   p_criteria  jsonb map of { column_name: user_value }. Only whitelisted keys
--               with a non-blank value are used; everything else is ignored.
--   p_use_trgm  layer trigram similarity on top of full-text (typo tolerance).
--
-- A row is returned only if EVERY supplied criterion matches its column. Score
-- is the sum of each column's full-text rank (+ trigram similarity when on),
-- so the more/closer the columns match, the higher the row ranks.
create or replace function public.search_jobs_flex(
  p_client_id text,
  p_criteria jsonb,
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
language plpgsql
stable
set search_path = ''
as $$
declare
  -- Whitelist. MUST mirror SEARCHABLE_JOB_COLUMNS in src/shared/job-schema.ts.
  allowed constant text[] := array['title','description','location','salary','category'];
  col text;
  val text;
  where_sql text := '';
  score_sql text := '0::real';
  sql text;
begin
  -- Build one match clause + one score term per valid, non-blank criterion.
  -- Columns are whitelist-checked and emitted via %I, so no injection surface.
  for col, val in
    select key, value from jsonb_each_text(coalesce(p_criteria, '{}'::jsonb))
  loop
    if not (col = any(allowed)) or coalesce(btrim(val), '') = '' then
      continue;
    end if;

    where_sql := where_sql || format(
      ' and ( to_tsvector(''english'', coalesce(j.%1$I, '''')) @@ '
      || 'websearch_to_tsquery(''english'', %2$L) '
      || 'or ($1 and extensions.similarity(j.%1$I, %2$L) > 0.2) )',
      col, val
    );

    score_sql := score_sql || format(
      ' + coalesce(ts_rank(to_tsvector(''english'', coalesce(j.%1$I, '''')), '
      || 'websearch_to_tsquery(''english'', %2$L)), 0) '
      || '+ case when $1 then extensions.similarity(j.%1$I, %2$L) else 0 end',
      col, val
    );
  end loop;

  sql := format($f$
    select r.title, r.location, r.salary, r.job_link, r.score
    from (
      select j.title, j.location, j.salary, j.job_link, (%s)::real as score
      from public.jobs j
      where j.client_id = $2
        and ($3 or j.disabled = false)
        and j.job_link <> ''
        %s
    ) r
    where r.score >= $4
    order by r.score desc, r.title
    limit greatest($5, 1)
  $f$, score_sql, where_sql);

  return query execute sql
    using p_use_trgm, p_client_id, p_include_disabled, p_min_score, p_limit;
end;
$$;

comment on function public.search_jobs_flex is
  'Tenant-scoped ranked job search over an admin-configured set of essential '
  'columns (full-text + optional trigram fuzz). Used by the Alex widget''s '
  'search_jobs tool. Column whitelist mirrors SEARCHABLE_JOB_COLUMNS in code.';

-- Extend the stored search config with the essential-columns list (default:
-- the classic title + location). Existing rows are patched in place; the widget
-- normalizer fills the default when the key is still absent, so this is safe
-- even if the merge below no-ops.
update public.admin_settings
set value = (
      (value::jsonb) || jsonb_build_object('searchColumns', jsonb_build_array('title','location'))
    )::text
where key = 'search_tool_config'
  and (value::jsonb ? 'searchColumns') = false;
