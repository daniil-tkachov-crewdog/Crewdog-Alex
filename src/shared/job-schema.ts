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

/**
 * The job columns Alex's search tool is allowed to match against. The admin
 * picks a subset of these as the "essential" columns for a search (see the
 * Search tool card in the admin panel); the search RPC then requires a match in
 * each chosen column. This is deliberately narrower than JOB_COLUMNS: internal
 * keys (id) and the link column aren't meaningful search dimensions.
 *
 * ⚠️  Whitelist. The `key`s here are mirrored by the search_jobs_flex RPC, which
 *     refuses any column not in its own allow-list. Keep the two in sync.
 */
export const SEARCHABLE_JOB_COLUMNS = [
  { key: "title", label: "Job title" },
  { key: "description", label: "Job description" },
  { key: "location", label: "Location" },
  { key: "salary", label: "Salary" },
  { key: "category", label: "Category" },
] as const;

export type SearchableJobColumn = (typeof SEARCHABLE_JOB_COLUMNS)[number]["key"];

export const SEARCHABLE_JOB_COLUMN_KEYS: SearchableJobColumn[] =
  SEARCHABLE_JOB_COLUMNS.map((c) => c.key);

/** Columns a search runs on out of the box: the classic "what" + "where". */
export const DEFAULT_SEARCH_COLUMNS: SearchableJobColumn[] = ["title", "location"];

/**
 * Render a set of search columns as a human-readable phrase for the system
 * prompt's {{SearchColumns}} variable, e.g. ["title","location"] →
 * "Job title and Location". Uses the canonical labels/order and falls back to
 * the default columns if given nothing usable.
 */
export function formatSearchColumnList(cols: SearchableJobColumn[]): string {
  const set = new Set(cols);
  let labels = SEARCHABLE_JOB_COLUMNS.filter((c) => set.has(c.key)).map((c) => c.label);
  if (labels.length === 0) {
    labels = SEARCHABLE_JOB_COLUMNS.filter((c) => DEFAULT_SEARCH_COLUMNS.includes(c.key)).map(
      (c) => c.label
    );
  }
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
