import { createServiceClient } from "@/lib/supabase/service";
import {
  resolveSummaryToolConfig,
  type SummaryToolConfig,
} from "@/widget/data/tool-config";

/**
 * ── JOB SUMMARY ──────────────────────────────────────────────────────
 *
 * Gives Alex an at-a-glance picture of a board's inventory WITHOUT pulling
 * rows, so it can orient a vague user before it has enough to run search_jobs.
 *
 * The DB does all the counting (via the `summarize_jobs` RPC), so this scales
 * to any board size — only a small capped digest crosses the wire. The RPC
 * branches on the admin-configured count threshold: small boards summarize by
 * title, large boards by category.
 */

export interface FacetCount {
  label: string;
  count: number;
}

export interface JobSummary {
  total: number;
  /** Which facet `items` describes: "title" (small boards) or "category". */
  facet: "title" | "category";
  items: FacetCount[];
  locations: FacetCount[];
}

interface SummaryFilter {
  /** Optional loose location filter to drill the digest into one area. */
  location?: string;
}

function toFacetCounts(raw: unknown): FacetCount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        label: typeof o.label === "string" ? o.label : "",
        count: typeof o.count === "number" ? o.count : Number(o.count) || 0,
      };
    })
    .filter((f) => f.label !== "");
}

export async function summarizeJobs(
  clientId: string,
  filter: SummaryFilter = {},
  config?: SummaryToolConfig
): Promise<JobSummary> {
  const cfg = config ?? (await resolveSummaryToolConfig());
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc("summarize_jobs", {
    p_client_id: clientId,
    p_threshold: cfg.countThreshold,
    p_max_items: cfg.maxItems,
    p_location: filter.location?.trim() ?? "",
  });

  if (error || !data) {
    if (error) console.error("[summarize-jobs] rpc error:", error.message);
    return { total: 0, facet: "title", items: [], locations: [] };
  }

  const o = data as Record<string, unknown>;
  return {
    total: typeof o.total === "number" ? o.total : Number(o.total) || 0,
    facet: o.facet === "category" ? "category" : "title",
    items: toFacetCounts(o.items),
    locations: toFacetCounts(o.locations),
  };
}
