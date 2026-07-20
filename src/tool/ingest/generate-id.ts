/**
 * ── STABLE GENERATED JOB IDs ──────────────────────────────────────────
 *
 * Some feeds/CSVs ship jobs without any usable ID column. "Generate ID" in the
 * column-mapping UI opts into deriving one HERE instead of reading a source
 * field. The derived ID must be STABLE for the same job across re-imports —
 * that's what lets the feed auto-update upsert (update in place) rather than
 * pile up duplicates every pull. So it's a deterministic hash of the job's
 * content, NOT a random value or a sequential counter.
 *
 * Basis: the job link when present (it's the most stable unique key a posting
 * has); otherwise the title + location + salary + description together.
 */

/** The fields a generated ID is derived from. */
export interface GenerateIdInput {
  title: string;
  description: string;
  location: string;
  salary: string;
  job_link: string;
}

const SEP = "␟"; // Unit separator — never appears in real job text.

/** FNV-1a 32-bit — small, dependency-free, deterministic across Node runtimes. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic ID for a job that has no source ID. Same content → same ID, so
 * re-imports update the existing row instead of duplicating it. Two hash passes
 * (forward + reversed basis) widen the space to keep collisions unlikely.
 */
export function generateJobId(row: GenerateIdInput): string {
  const link = row.job_link.trim();
  const basis = link
    ? link
    : [row.title, row.location, row.salary, row.description]
        .map((s) => s.trim())
        .join(SEP);

  const a = fnv1a(basis).toString(16).padStart(8, "0");
  const b = fnv1a(basis.split("").reverse().join("")).toString(16).padStart(8, "0");
  return `gen-${a}${b}`;
}
