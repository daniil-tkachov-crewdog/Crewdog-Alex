"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionClientId } from "@/tool/db/current-client";
import { parseJobsCsv, type ParsedJobRow } from "@/tool/ingest/csv/parse-csv";
import {
  discoverFields,
  parseFeed,
  type FeedMapping,
  type FeedReadResult,
} from "@/tool/ingest/feed/parse-feed";
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
 * Shared import tail for every on-ramp (CSV, feed, …). Takes already-parsed
 * rows in the internal shape and upserts them by (client_id, source_id): the
 * mapped fields overwrite existing rows with the same ID (the source is the
 * source of truth), while the `disabled` flag is left untouched because it
 * isn't in the payload. Rows missing a category get one AI-derived, best-effort.
 */
async function writeParsedJobs(
  clientId: string,
  rows: ParsedJobRow[]
): Promise<ActionResult> {
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

/** Import a CSV. Parses, then hands off to the shared upsert tail. */
export async function importJobsCsv(csvText: string): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const parsed = parseJobsCsv(csvText);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return writeParsedJobs(clientId, parsed.rows);
}

// ── Feed-Link on-ramp ─────────────────────────────────────────────────────

export type FeedReadActionResult = FeedReadResult;

const FEED_TIMEOUT_MS = 15_000;
const FEED_MAX_BYTES = 8 * 1024 * 1024; // 8 MB guard against huge/hostile responses.

/** Fetch a feed URL server-side (dodges CORS) and return its raw XML, guarded. */
async function fetchFeed(
  url: string
): Promise<{ ok: true; xml: string } | { ok: false; error: string }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { ok: false, error: "The feed URL must start with http:// or https://." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(parsedUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "CrewdogAlex/1.0 (+job feed importer)",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `The feed URL returned HTTP ${res.status}. Check the link and that it's publicly accessible.`,
      };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > FEED_MAX_BYTES) {
      return { ok: false, error: "The feed is too large to import (over 8 MB)." };
    }
    return { ok: true, xml: new TextDecoder("utf-8").decode(buf) };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "The feed took too long to respond (15s). Try again later." };
    }
    return {
      ok: false,
      error: "Couldn't reach the feed URL. Check the link and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}

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
 */
export async function importJobsFeed(
  url: string,
  mapping: FeedMapping
): Promise<ActionResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const fetched = await fetchFeed(url);
  if (!fetched.ok) return { ok: false, error: fetched.error };

  const parsed = parseFeed(fetched.xml, mapping);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  return writeParsedJobs(clientId, parsed.rows);
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
