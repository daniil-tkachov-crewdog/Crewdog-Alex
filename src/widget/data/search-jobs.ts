import { createServiceClient } from "@/lib/supabase/service";
import {
  resolveSearchToolConfig,
  type SearchToolConfig,
} from "@/widget/data/tool-config";

/**
 * ── JOB SEARCH ───────────────────────────────────────────────────────
 *
 * The LLM never touches the DB. It only decides WHEN to search and with WHAT
 * criteria (via the search_jobs tool); this runs the actual query through the
 * `search_jobs_ranked` RPC, which does full-text matching (stemming, word
 * order, stop-words) plus optional trigram typo-tolerance, ranked.
 *
 * Always:
 *   - scoped to the tenant (client_id) — the isolation boundary
 *   - only rows that HAVE a link (v1 returns just links)
 *   - live rows only, unless the admin config opts disabled rows in
 * Admin config (match strategy, result count, min score) is resolved per call.
 */

export interface JobSearchCriteria {
  title: string;
  location: string;
  /** Optional free-text salary hint from the user; not filtered on in v1. */
  salary?: string;
  /** Optional; the model may fold this into `location` (e.g. "Remote"). */
  remote?: boolean;
}

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

  const { data, error } = await supabase.rpc("search_jobs_ranked", {
    p_client_id: clientId,
    p_query: criteria.title?.trim() ?? "",
    p_location: criteria.location?.trim() ?? "",
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
