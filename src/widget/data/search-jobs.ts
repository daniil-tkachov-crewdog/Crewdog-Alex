import { createServiceClient } from "@/lib/supabase/service";

/**
 * ── PLAIN JOB SEARCH ─────────────────────────────────────────────────
 *
 * The LLM never touches the DB. It only decides WHEN to search and with WHAT
 * criteria (via the search_jobs tool); this runs the actual query. v1 is a
 * plain filter — no ranking, no semantic search:
 *
 *   - always scoped to the tenant (client_id) — the isolation boundary
 *   - only live rows (disabled = false)
 *   - only rows that HAVE a link (v1 returns just links; a linkless job
 *     can't be returned as one)
 *   - title / location matched with case-insensitive ILIKE
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

const MAX_RESULTS = 8;

export async function searchJobs(
  clientId: string,
  criteria: JobSearchCriteria
): Promise<JobSearchResult[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("jobs")
    .select("title, location, salary, job_link")
    .eq("client_id", clientId)
    .eq("disabled", false)
    .neq("job_link", "");

  if (criteria.title?.trim()) {
    query = query.ilike("title", `%${criteria.title.trim()}%`);
  }
  if (criteria.location?.trim()) {
    query = query.ilike("location", `%${criteria.location.trim()}%`);
  }

  const { data, error } = await query.limit(MAX_RESULTS);
  if (error || !data) {
    return [];
  }
  return data as JobSearchResult[];
}
