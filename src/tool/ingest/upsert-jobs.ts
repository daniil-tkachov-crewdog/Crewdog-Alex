import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedJobRow } from "@/tool/ingest/csv/parse-csv";
import { categorizeJobs } from "@/tool/ingest/categorize";

export type UpsertResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Shared import tail for every on-ramp (CSV, feed, auto-refresh). Takes
 * already-parsed rows and upserts them by (client_id, source_id): the mapped
 * fields overwrite existing rows with the same ID (the source is the source of
 * truth), while the `disabled` flag is left untouched (it isn't in the
 * payload). Rows missing a category get one AI-derived, best-effort.
 *
 * The Supabase client is passed IN so the same logic serves both the dashboard
 * (session/RLS client, scoped to the logged-in tenant) and the scheduled feed
 * refresh (service-role client — tenant isolation is then this call's
 * responsibility, enforced by the `clientId` stamped on every row).
 */
export async function upsertParsedJobs(
  supabase: SupabaseClient,
  clientId: string,
  rows: ParsedJobRow[]
): Promise<UpsertResult> {
  if (rows.length === 0) {
    return { ok: false, error: "There were no jobs to import." };
  }

  // Dedupe within the batch (last occurrence wins) — Postgres can't upsert the
  // same conflict key twice in one statement.
  const bySourceId = new Map<string, ParsedJobRow>();
  for (const row of rows) bySourceId.set(row.id, row);

  // AI-derive a category only for rows that didn't ship one. Best-effort: on
  // any failure the field stays blank ("Uncategorized" downstream).
  const deduped = [...bySourceId.values()];
  const needIdx = deduped
    .map((r, i) => (r.category.trim() ? -1 : i))
    .filter((i) => i >= 0);
  const derived = await categorizeJobs(
    needIdx.map((i) => ({
      title: deduped[i].title,
      description: deduped[i].description,
    }))
  );
  const categoryByIdx = new Map<number, string>();
  needIdx.forEach((idx, k) => categoryByIdx.set(idx, derived[k] || ""));

  const now = new Date().toISOString();
  const payload = deduped.map((r, i) => ({
    client_id: clientId,
    source_id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    salary: r.salary,
    category: r.category.trim() || categoryByIdx.get(i) || "",
    job_link: r.job_link,
    updated_at: now,
  }));

  const { error } = await supabase
    .from("jobs")
    .upsert(payload, { onConflict: "client_id,source_id" });

  if (error) return { ok: false, error: error.message };

  return { ok: true, count: payload.length };
}
