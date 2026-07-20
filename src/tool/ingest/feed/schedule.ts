/**
 * Shared types + constants for the RSS/Atom feed auto-update schedule.
 *
 * A tenant can pin one feed source and have Alex re-pull it on a fixed cadence.
 * The config lives in the `feed_sources` table (one row per client_id); a
 * scheduled route (hit by pg_cron) refreshes every source whose interval has
 * elapsed. See migration 0004_feed_sources.sql.
 */

import type { FeedMapping } from "@/tool/ingest/feed/parse-feed";

/** The intervals the UI offers, in hours. */
export const FEED_INTERVAL_HOURS = [6, 12, 24, 48] as const;

export type FeedIntervalHours = (typeof FEED_INTERVAL_HOURS)[number];

export function isFeedInterval(n: number): n is FeedIntervalHours {
  return (FEED_INTERVAL_HOURS as readonly number[]).includes(n);
}

/** The saved auto-update config for a tenant, as the dashboard reads it back. */
export interface FeedSchedule {
  url: string;
  mapping: FeedMapping;
  intervalHours: FeedIntervalHours;
  enabled: boolean;
  lastRunAt: string | null;
}
