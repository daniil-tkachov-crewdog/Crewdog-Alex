/**
 * v1 CSV on-ramp.
 *
 * Header rules (per product decision): required headers must all be present,
 * matched case-insensitively; column ORDER doesn't matter; extra/unknown
 * columns are ignored. "Job link" is optional. Errors are precise so the
 * dashboard can show the exact reason in a popup.
 */

/** A row parsed out of the CSV, normalized to the internal job fields. */
export interface ParsedJobRow {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  job_link: string;
}

export type CsvParseResult =
  | { ok: true; rows: ParsedJobRow[] }
  | { ok: false; error: string };

/** Required headers (canonical labels) → internal field name. */
const REQUIRED_HEADERS: { label: string; field: keyof ParsedJobRow }[] = [
  { label: "ID", field: "id" },
  { label: "Job title", field: "title" },
  { label: "Job description", field: "description" },
  { label: "Location", field: "location" },
  { label: "Salary", field: "salary" },
];

/** Optional headers (canonical labels) → internal field name. */
const OPTIONAL_HEADERS: { label: string; field: keyof ParsedJobRow }[] = [
  { label: "Job link", field: "job_link" },
];

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Split raw CSV text into rows of cells. Handles quoted fields containing
 * commas, embedded newlines, and "" escaped quotes. Accepts \n and \r\n.
 */
function tokenize(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];

    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      // Swallow \r\n as a single break.
      if (ch === "\r" && csv[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  // Flush trailing cell/row (no final newline).
  row.push(cell);
  rows.push(row);

  return rows;
}

/** True if a tokenized row is entirely empty (blank line). */
const isBlankRow = (cells: string[]) => cells.every((c) => c.trim() === "");

export function parseJobsCsv(csv: string): CsvParseResult {
  if (!csv || csv.trim() === "") {
    return { ok: false, error: "The file is empty." };
  }

  const table = tokenize(csv).filter((r) => !isBlankRow(r));
  if (table.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const headerCells = table[0].map(norm);

  // Resolve each expected header to its column index.
  const missing: string[] = [];
  const index: Partial<Record<keyof ParsedJobRow, number>> = {};
  for (const { label, field } of REQUIRED_HEADERS) {
    const at = headerCells.indexOf(norm(label));
    if (at === -1) missing.push(label);
    else index[field] = at;
  }
  for (const { label, field } of OPTIONAL_HEADERS) {
    const at = headerCells.indexOf(norm(label));
    if (at !== -1) index[field] = at;
  }

  if (missing.length > 0) {
    const cols =
      missing.length === 1
        ? `column: "${missing[0]}"`
        : `columns: ${missing.map((m) => `"${m}"`).join(", ")}`;
    return {
      ok: false,
      error: `The CSV is missing the required ${cols}. Expected headers: ID, Job title, Job description, Location, Salary (Job link optional).`,
    };
  }

  const dataRows = table.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: "The CSV has headers but no job rows." };
  }

  const at = (cells: string[], i: number | undefined) =>
    i === undefined ? "" : (cells[i] ?? "").trim();

  const rows: ParsedJobRow[] = [];
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const id = at(cells, index.id);
    // ID is the upsert/dedup key — it can't be blank.
    if (id === "") {
      return {
        ok: false,
        error: `Row ${r + 2}: the ID column is empty. Every job needs an ID.`,
      };
    }
    rows.push({
      id,
      title: at(cells, index.title),
      description: at(cells, index.description),
      location: at(cells, index.location),
      salary: at(cells, index.salary),
      job_link: at(cells, index.job_link),
    });
  }

  return { ok: true, rows };
}
