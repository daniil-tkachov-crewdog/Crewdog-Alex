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
  /** Link to the original job posting on the board's site. Alex surfaces this
   *  in search results. Optional on import — empty string when not provided. */
  job_link: string;
}

/**
 * Dashboard-facing row. Extends the widget contract with two fields the portal
 * needs but the widget doesn't: the internal primary key used to edit/delete a
 * specific row, and the disabled flag (disabled jobs stay in the table but are
 * hidden from Alex's search).
 */
export interface JobRow extends Job {
  /** Internal surrogate primary key (jobs.row_id). Never comes from the CSV. */
  row_id: string;
  disabled: boolean;
  /** Coarse job family, AI-derived at import and tenant-editable. Portal-only:
   *  the widget reads it via the summary RPC, not this contract. */
  category: string;
}

/**
 * The columns the dashboard's Import table renders, in order.
 * Keys map to CSV header names v1 expects (see ingest/csv).
 */
export const JOB_COLUMNS = [
  { key: "id", label: "ID" },
  { key: "title", label: "Job title" },
  { key: "description", label: "Job description" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "category", label: "Category" },
  { key: "job_link", label: "Job link" },
] as const;

export type JobColumnKey = (typeof JOB_COLUMNS)[number]["key"];
