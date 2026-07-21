import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_SEARCH_COLUMNS,
  SEARCHABLE_JOB_COLUMN_KEYS,
  type SearchableJobColumn,
} from "@/shared/job-schema";

/**
 * ── TOOL CONFIG ──────────────────────────────────────────────────────
 *
 * Admin-editable knobs for Alex's two DB tools (search + summary), stored as
 * JSON blobs in the same `admin_settings` key/value table the system prompt
 * uses. Global (one config for all tenants), read per request by the widget
 * and rendered/edited in the admin Settings tab.
 *
 * Every read falls back to the in-code defaults so a missing/corrupt row can
 * never break search — the tools always have a sane config.
 */

export const SEARCH_TOOL_CONFIG_KEY = "search_tool_config";
export const SUMMARY_TOOL_CONFIG_KEY = "summary_tool_config";

/** How the search RPC matches. `fuzzy` layers trigram typo-tolerance on FTS. */
export type MatchStrategy = "keyword" | "fuzzy";

export interface SearchToolConfig {
  /** `keyword` = full-text only; `fuzzy` = full-text + trigram typo tolerance. */
  matchStrategy: MatchStrategy;
  /** Max jobs returned per search. */
  resultsPerSearch: number;
  /** Drop matches scoring below this (0 = keep all matches). */
  minScore: number;
  /** Include disabled jobs in results. Off by default — a safety line. */
  includeDisabled: boolean;
  /**
   * The columns a search must match on — the "essential" fields. Each one Alex
   * is given becomes a required tool parameter AND a required match in the RPC,
   * so a board whose locations are all geographic can drop `location` here
   * instead of having every remote-role search silently return nothing. Never
   * empty; falls back to title + location.
   */
  searchColumns: SearchableJobColumn[];
}

export interface SummaryToolConfig {
  /** Master on/off for the summarize_jobs tool. */
  enabled: boolean;
  /** Live-job count at/above which the digest groups by category, not title. */
  countThreshold: number;
  /** Top-N cap on each facet (locations, titles/categories). */
  maxItems: number;
}

export const DEFAULT_SEARCH_TOOL_CONFIG: SearchToolConfig = {
  matchStrategy: "fuzzy",
  resultsPerSearch: 8,
  minScore: 0,
  includeDisabled: false,
  searchColumns: [...DEFAULT_SEARCH_COLUMNS],
};

export const DEFAULT_SUMMARY_TOOL_CONFIG: SummaryToolConfig = {
  enabled: true,
  countThreshold: 100,
  maxItems: 20,
};

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.round(n), min), max);
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Coerce an arbitrary column list to a valid, non-empty set of searchable
 * columns: keep only whitelisted keys, drop duplicates, and preserve the
 * canonical column order. An empty/garbage result falls back to the default,
 * so a search always has at least one dimension to match on.
 */
export function normalizeSearchColumns(raw: unknown): SearchableJobColumn[] {
  const requested = new Set(Array.isArray(raw) ? raw : []);
  const kept = SEARCHABLE_JOB_COLUMN_KEYS.filter((key) => requested.has(key));
  return kept.length > 0 ? kept : [...DEFAULT_SEARCH_COLUMNS];
}

/** Coerce arbitrary stored JSON into a valid SearchToolConfig. */
export function normalizeSearchConfig(raw: unknown): SearchToolConfig {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    matchStrategy: o.matchStrategy === "keyword" ? "keyword" : "fuzzy",
    resultsPerSearch: clampInt(o.resultsPerSearch, DEFAULT_SEARCH_TOOL_CONFIG.resultsPerSearch, 1, 25),
    minScore: clampFloat(o.minScore, DEFAULT_SEARCH_TOOL_CONFIG.minScore, 0, 5),
    includeDisabled: o.includeDisabled === true,
    searchColumns: normalizeSearchColumns(o.searchColumns),
  };
}

/** Coerce arbitrary stored JSON into a valid SummaryToolConfig. */
export function normalizeSummaryConfig(raw: unknown): SummaryToolConfig {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    countThreshold: clampInt(o.countThreshold, DEFAULT_SUMMARY_TOOL_CONFIG.countThreshold, 1, 100_000),
    maxItems: clampInt(o.maxItems, DEFAULT_SUMMARY_TOOL_CONFIG.maxItems, 1, 100),
  };
}

async function readConfigValue(key: string): Promise<unknown> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error || !data?.value) return null;
  try {
    return JSON.parse(data.value as string);
  } catch {
    return null;
  }
}

export async function resolveSearchToolConfig(): Promise<SearchToolConfig> {
  try {
    return normalizeSearchConfig(await readConfigValue(SEARCH_TOOL_CONFIG_KEY));
  } catch {
    return DEFAULT_SEARCH_TOOL_CONFIG;
  }
}

export async function resolveSummaryToolConfig(): Promise<SummaryToolConfig> {
  try {
    return normalizeSummaryConfig(await readConfigValue(SUMMARY_TOOL_CONFIG_KEY));
  } catch {
    return DEFAULT_SUMMARY_TOOL_CONFIG;
  }
}
