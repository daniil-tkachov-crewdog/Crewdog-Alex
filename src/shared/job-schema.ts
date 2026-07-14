/**
 * ── INTERNAL JOB SCHEMA ──────────────────────────────────────────────
 *
 * The single canonical shape every job row takes once it lands in the
 * database, regardless of which on-ramp produced it (CSV now; feed URL /
 * scraping later). Every pipe normalizes INTO this shape.
 *
 * ⚠️  CONTRACT FILE — mirrored by hand in the widget repo (alex-widget).
 *     The portal WRITES jobs in this shape; the widget READS them.
 *     If you change this, change it in both repos.
 */

export interface Job {
  /** Stable per-tenant job identifier from the source data. */
  id: string;
  /** Which tenant this job belongs to. Every row is scoped by this. */
  client_id: string;
  title: string;
  description: string;
  location: string;
  /** Free-text salary as provided by the board (e.g. "£45k–£55k"). */
  salary: string;
}

/**
 * The five columns the dashboard's Import table renders, in order.
 * Keys map to CSV header names v1 expects (see ingest/csv).
 */
export const JOB_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "Job title" },
  { key: "description", label: "Job description" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
] as const;

export type JobColumnKey = (typeof JOB_COLUMNS)[number]["key"];
