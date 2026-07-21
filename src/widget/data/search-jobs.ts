import { createServiceClient } from "@/lib/supabase/service";
import {
  resolveSearchToolConfig,
  type SearchToolConfig,
} from "@/widget/data/tool-config";
import type { SearchableJobColumn } from "@/shared/job-schema";

/**
 * ── JOB SEARCH ───────────────────────────────────────────────────────
 *
 * The LLM never touches the DB. It only decides WHEN to search and with WHAT
 * criteria (via the search_jobs tool); this runs the actual query through the
 * `search_jobs_flex` RPC, which matches over the admin-configured set of
 * ESSENTIAL columns. Every column is matched the same tolerant way — full-text
 * (stemming, word order, stop-words) plus optional trigram typo-tolerance —
 * ranked, with all supplied columns required (AND).
 *
 * Which columns count as essential is admin config (Search tool card), so no
 * single column is a hardcoded gate: a board whose locations are all geographic
 * can drop `location` from the set instead of having it silently zero out every
 * remote-role search.
 *
 * Always:
 *   - scoped to the tenant (client_id) — the isolation boundary
 *   - only rows that HAVE a link (v1 returns just links)
 *   - live rows only, unless the admin config opts disabled rows in
 */

/** User-supplied search values, keyed by the essential column they target. */
export type JobSearchCriteria = Partial<Record<SearchableJobColumn, string>>;

export interface JobSearchResult {
  title: string;
  location: string;
  salary: string;
  job_link: string;
}

export async function searchJobs(
  clientId: string,
  criteria: JobSearchCriteria,
  config?: SearchToolConfig
): Promise<JobSearchResult[]> {
  const cfg = config ?? (await resolveSearchToolConfig());
  const supabase = createServiceClient();

  // Only pass values for the columns the admin marked essential, trimmed and
  // with blanks dropped. The RPC ignores unknown/blank keys too, but keeping
  // the payload tight makes the scoping explicit.
  const payload: Record<string, string> = {};
  for (const col of cfg.searchColumns) {
    const raw = criteria[col];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (value) payload[col] = value;
  }

  const { data, error } = await supabase.rpc("search_jobs_flex", {
    p_client_id: clientId,
    p_criteria: payload,
    p_limit: cfg.resultsPerSearch,
    p_min_score: cfg.minScore,
    p_use_trgm: cfg.matchStrategy === "fuzzy",
    p_include_disabled: cfg.includeDisabled,
  });

  if (error || !data) {
    if (error) console.error("[search-jobs] rpc error:", error.message);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((r) => ({
    title: (r.title as string) ?? "",
    location: (r.location as string) ?? "",
    salary: (r.salary as string) ?? "",
    job_link: (r.job_link as string) ?? "",
  }));
}
