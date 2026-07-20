import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchFeed } from "@/tool/ingest/feed/fetch-feed";
import { parseFeed } from "@/tool/ingest/feed/parse-feed";
import { upsertParsedJobs } from "@/tool/ingest/upsert-jobs";
import type { FeedMapping } from "@/tool/ingest/feed/parse-feed";

/**
 * POST /api/feeds/refresh — scheduled feed auto-update.
 *
 * Called by pg_cron (hourly) via pg_net; see migration 0004. Authenticated by a
 * shared secret header (FEED_REFRESH_SECRET), NOT a user session. Re-pulls every
 * enabled feed whose interval has elapsed since last_run_at and upserts its jobs
 * with the service-role client — tenant isolation is enforced here by scoping
 * every write to the row's own client_id.
 *
 * Cron granularity is hourly; the per-tenant 6/12/24/48h cadence is enforced
 * below (a source is "due" only once its interval has passed).
 */

export const dynamic = "force-dynamic";

interface FeedSourceRow {
  client_id: string;
  url: string;
  mapping: FeedMapping | null;
  interval_hours: number;
  last_run_at: string | null;
}

function isDue(row: FeedSourceRow, now: number): boolean {
  if (!row.last_run_at) return true; // never pulled → due now
  const elapsedMs = now - new Date(row.last_run_at).getTime();
  return elapsedMs >= row.interval_hours * 60 * 60 * 1000;
}

export async function POST(request: NextRequest) {
  const expected = process.env.FEED_REFRESH_SECRET;
  if (!expected) {
    return Response.json(
      { error: "Feed refresh is not configured." },
      { status: 503 }
    );
  }
  if (request.headers.get("x-feed-refresh-secret") !== expected) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("feed_sources")
    .select("client_id, url, mapping, interval_hours, last_run_at")
    .eq("enabled", true);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const due = (data ?? []).filter((r) => isDue(r as FeedSourceRow, now));

  const results: {
    client_id: string;
    ok: boolean;
    count?: number;
    error?: string;
  }[] = [];

  // Sequential on purpose: keeps memory/outbound bounded and avoids hammering
  // many feed hosts at once. Volume here is one row per tenant, at most hourly.
  for (const raw of due) {
    const row = raw as FeedSourceRow;
    const mapping = row.mapping ?? {};

    const fetched = await fetchFeed(row.url);
    if (!fetched.ok) {
      results.push({ client_id: row.client_id, ok: false, error: fetched.error });
      continue;
    }

    const parsed = parseFeed(fetched.xml, mapping);
    if (!parsed.ok) {
      results.push({ client_id: row.client_id, ok: false, error: parsed.error });
      continue;
    }

    const written = await upsertParsedJobs(supabase, row.client_id, parsed.rows);
    if (!written.ok) {
      results.push({ client_id: row.client_id, ok: false, error: written.error });
      continue;
    }

    // Stamp the run so the next tick honors this tenant's interval.
    await supabase
      .from("feed_sources")
      .update({ last_run_at: new Date().toISOString() })
      .eq("client_id", row.client_id);

    results.push({ client_id: row.client_id, ok: true, count: written.count });
  }

  return Response.json({
    refreshed: results.filter((r) => r.ok).length,
    considered: due.length,
    results,
  });
}
