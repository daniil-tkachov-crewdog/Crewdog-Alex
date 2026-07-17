"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionClientId } from "@/tool/db/current-client";
import { parseJobsCsv } from "@/tool/ingest/csv/parse-csv";
import { categorizeJobs, categorizeOne } from "@/tool/ingest/categorize";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

const NO_SESSION =
  "You need to be logged in to change the job database. Log in and try again.";

/** One editable row coming back from the dashboard's Edit UI. */
export interface JobEdit {
  row_id: string;
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  category: string;
  job_link: string;
}

/**
 * Import a CSV. Upserts by (client_id, source_id): the 5 CSV columns + job_link
 * overwrite existing rows with the same ID (CSV is source of truth), while the
 * `disabled` flag is left untouched because it isn't in the payload.
 */
export async function importJobsCsv(csvText: string): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const parsed = parseJobsCsv(csvText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  // Dedupe within the batch (last occurrence wins) — Postgres can't upsert the
  // same conflict key twice in one statement.
  const bySourceId = new Map<string, (typeof parsed.rows)[number]>();
  for (const row of parsed.rows) bySourceId.set(row.id, row);

  // AI-derive a category only for rows that didn't ship one in the CSV. Best-
  // effort: on any failure the field stays blank ("Uncategorized" downstream).
  const deduped = [...bySourceId.values()];
  const needIdx = deduped
    .map((r, i) => (r.category.trim() ? -1 : i))
    .filter((i) => i >= 0);
  const derived = await categorizeJobs(
    needIdx.map((i) => ({ title: deduped[i].title, description: deduped[i].description }))
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

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .upsert(payload, { onConflict: "client_id,source_id" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  const n = payload.length;
  return { ok: true, message: `Imported ${n} job${n === 1 ? "" : "s"}.` };
}

/** Save inline edits for one or more rows. */
export async function updateJobs(edits: JobEdit[]): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };
  if (edits.length === 0) return { ok: true };

  const supabase = await createClient();

  for (const e of edits) {
    // Respect a manually-entered category; re-derive when the tenant left it
    // blank so category stays fresh as titles/descriptions change.
    const category = e.category.trim()
      ? e.category.trim()
      : await categorizeOne({ title: e.title, description: e.description });

    const { error } = await supabase
      .from("jobs")
      .update({
        source_id: e.id,
        title: e.title,
        description: e.description,
        location: e.location,
        salary: e.salary,
        category,
        job_link: e.job_link,
      })
      .eq("row_id", e.row_id)
      .eq("client_id", clientId);

    if (error) {
      // 23505 = unique_violation on (client_id, source_id).
      if (error.code === "23505") {
        return {
          ok: false,
          error: `The ID "${e.id}" is already used by another job. IDs must be unique.`,
        };
      }
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Changes saved." };
}

/** Enable/disable rows. Disabled jobs stay in the table but leave Alex's search. */
export async function setJobsDisabled(
  rowIds: string[],
  disabled: boolean
): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };
  if (rowIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .update({ disabled })
    .in("row_id", rowIds)
    .eq("client_id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

/** Permanently delete rows from Supabase. */
export async function deleteJobs(rowIds: string[]): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };
  if (rowIds.length === 0) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("jobs")
    .delete()
    .in("row_id", rowIds)
    .eq("client_id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  const n = rowIds.length;
  return { ok: true, message: `Deleted ${n} job${n === 1 ? "" : "s"}.` };
}
