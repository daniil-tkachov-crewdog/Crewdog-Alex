"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionClientId } from "@/tool/db/current-client";
import { discoverCsvFields, parseJobsCsvMapped } from "@/tool/ingest/csv/parse-csv";
import {
  discoverFields,
  parseFeed,
  type FeedMapping,
  type FeedReadResult,
} from "@/tool/ingest/feed/parse-feed";
import { fetchFeed } from "@/tool/ingest/feed/fetch-feed";
import { upsertParsedJobs } from "@/tool/ingest/upsert-jobs";
import { categorizeOne } from "@/tool/ingest/categorize";
import {
  FEED_INTERVAL_HOURS,
  type FeedIntervalHours,
} from "@/tool/ingest/feed/schedule";

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
 * Shared import tail wrapper: upsert with the session (RLS) client, revalidate
 * the dashboard, and shape the result as an ActionResult with a friendly count.
 */
async function writeParsedJobs(
  clientId: string,
  rows: Parameters<typeof upsertParsedJobs>[2]
): Promise<ActionResult> {
  const supabase = await createClient();
  const res = await upsertParsedJobs(supabase, clientId, rows);
  if (!res.ok) return res;

  revalidatePath("/dashboard");
  const n = res.count;
  return { ok: true, message: `Imported ${n} job${n === 1 ? "" : "s"}.` };
}

// ── CSV on-ramp (column-mapping, mirrors the feed flow) ────────────────────

export type CsvReadActionResult = FeedReadResult;

/** Step 1 of the CSV on-ramp: read the file's headers for the mapping UI. */
export async function readCsv(csvText: string): Promise<CsvReadActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  return discoverCsvFields(csvText);
}

/** Step 2 of the CSV on-ramp: project rows through the mapping, then upsert. */
export async function importJobsCsv(
  csvText: string,
  mapping: FeedMapping
): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const parsed = parseJobsCsvMapped(csvText, mapping);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return writeParsedJobs(clientId, parsed.rows);
}

// ── Feed-Link on-ramp ─────────────────────────────────────────────────────

export type FeedReadActionResult = FeedReadResult;

/**
 * Step 1 of the feed on-ramp: fetch the URL and report the tags available on
 * its items, plus a best-guess default mapping, for the column-mapping UI.
 */
export async function readFeed(url: string): Promise<FeedReadActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const fetched = await fetchFeed(url);
  if (!fetched.ok) return { ok: false, error: fetched.error };

  return discoverFields(fetched.xml);
}

/**
 * Step 2 of the feed on-ramp: re-fetch the URL, project every item through the
 * tenant's column mapping, then hand off to the shared upsert tail.
 *
 * `autoUpdate` reconciles the saved schedule in the same click: pass an
 * interval to pin this feed for scheduled re-pulls, or null to clear any
 * existing schedule. This is what locks the import block onto a live feed.
 */
export async function importJobsFeed(
  url: string,
  mapping: FeedMapping,
  autoUpdate: { intervalHours: FeedIntervalHours } | null = null
): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const fetched = await fetchFeed(url);
  if (!fetched.ok) return { ok: false, error: fetched.error };

  const parsed = parseFeed(fetched.xml, mapping);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const written = await writeParsedJobs(clientId, parsed.rows);
  if (!written.ok) return written;

  // Reconcile the auto-update schedule with the same click.
  const supabase = await createClient();
  if (autoUpdate) {
    if (!FEED_INTERVAL_HOURS.includes(autoUpdate.intervalHours)) {
      return { ok: false, error: "Invalid auto-update interval." };
    }
    const now = new Date().toISOString();
    const { error } = await supabase.from("feed_sources").upsert(
      {
        client_id: clientId,
        url: url.trim(),
        mapping,
        interval_hours: autoUpdate.intervalHours,
        enabled: true,
        last_run_at: now,
        updated_at: now,
      },
      { onConflict: "client_id" }
    );
    if (error) return { ok: false, error: error.message };
  } else {
    // No auto-update requested → drop any prior schedule for this tenant.
    await supabase.from("feed_sources").delete().eq("client_id", clientId);
  }

  revalidatePath("/dashboard");
  return written;
}

/**
 * Clear a tenant's saved feed schedule (the "Change feed" / unlock affordance).
 * Leaves already-imported jobs in place; only stops the scheduled re-pulls.
 */
export async function clearFeedSchedule(): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feed_sources")
    .delete()
    .eq("client_id", clientId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, message: "Auto-update turned off." };
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
