/**
 * v1 CSV on-ramp.
 *
 * Header rules (per product decision): required headers must all be present,
 * matched case-insensitively; column ORDER doesn't matter; extra/unknown
 * columns are ignored. "Job link" is optional. Errors are precise so the
 * dashboard can show the exact reason in a popup.
 */

import { GENERATE_ID } from "@/tool/ingest/column-mapping";
import { generateJobId } from "@/tool/ingest/generate-id";
import type {
  FeedField,
  FeedMapping,
  FeedReadResult,
} from "@/tool/ingest/feed/parse-feed";

/** A row parsed out of the CSV, normalized to the internal job fields. */
export interface ParsedJobRow {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: string;
  job_link: string;
  /** Optional on import. Blank rows are AI-categorized after upload. */
  category: string;
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
  { label: "Category", field: "category" },
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
      category: at(cells, index.category),
    });
  }

  return { ok: true, rows };
}

// ── Column-mapping on-ramp (mirrors the feed flow) ─────────────────────────
// The feed importer lets the tenant map arbitrary feed tags onto our fields.
// CSVs get the exact same treatment so headers don't have to match ours: we
// discover the headers, let the tenant map them (or "Generate ID"), then parse.

/** Which canonical labels hint at each internal field, for the default mapping. */
const FIELD_HINTS: { field: keyof ParsedJobRow; labels: string[] }[] = [
  { field: "id", labels: ["id", "job id", "guid", "reference", "ref"] },
  { field: "title", labels: ["job title", "title", "role", "position"] },
  {
    field: "description",
    labels: ["job description", "description", "summary", "details"],
  },
  { field: "location", labels: ["location", "city", "region", "area"] },
  { field: "salary", labels: ["salary", "pay", "compensation", "wage"] },
  { field: "job_link", labels: ["job link", "link", "url", "apply url"] },
  { field: "category", labels: ["category", "type", "sector", "industry"] },
];

/** Best-guess default mapping from a CSV's headers to our fields. */
function suggestCsvMapping(headers: string[]): FeedMapping {
  const normalized = headers.map(norm);
  const out: FeedMapping = {};
  for (const { field, labels } of FIELD_HINTS) {
    for (const want of labels) {
      const at = normalized.indexOf(want);
      if (at !== -1) {
        out[field] = headers[at];
        break;
      }
    }
  }
  return out;
}

/**
 * Step 1 of the CSV on-ramp: read the file's header row and report each column
 * (with a sample value) plus a best-guess mapping, for the same column-mapping
 * UI the feed importer uses.
 */
export function discoverCsvFields(csv: string): FeedReadResult {
  if (!csv || csv.trim() === "") {
    return { ok: false, error: "The file is empty." };
  }

  const table = tokenize(csv).filter((r) => !isBlankRow(r));
  if (table.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const headers = table[0].map((h) => h.trim());
  const dataRows = table.slice(1);
  if (headers.every((h) => h === "")) {
    return { ok: false, error: "The CSV has no column headers in its first row." };
  }
  if (dataRows.length === 0) {
    return { ok: false, error: "The CSV has headers but no job rows." };
  }

  const fields: FeedField[] = headers
    .map((tag, col): FeedField | null => {
      if (tag === "") return null;
      let sample = "";
      for (const row of dataRows) {
        const v = (row[col] ?? "").trim();
        if (v) {
          sample = v.length > 140 ? v.slice(0, 140) + "…" : v;
          break;
        }
      }
      return { tag, sample };
    })
    .filter((f): f is FeedField => f !== null);

  return {
    ok: true,
    fields,
    itemCount: dataRows.length,
    suggested: suggestCsvMapping(headers),
  };
}

/**
 * Step 2 of the CSV on-ramp: project every data row through `mapping` (a header
 * name per field, or GENERATE_ID for id) into ParsedJobRow shape.
 */
export function parseJobsCsvMapped(
  csv: string,
  mapping: FeedMapping
): CsvParseResult {
  if (!mapping.id) {
    return {
      ok: false,
      error: 'Map a column to ID, or choose "Generate ID", to import.',
    };
  }

  if (!csv || csv.trim() === "") {
    return { ok: false, error: "The file is empty." };
  }

  const table = tokenize(csv).filter((r) => !isBlankRow(r));
  if (table.length === 0) {
    return { ok: false, error: "The file is empty." };
  }

  const headers = table[0].map((h) => h.trim());
  const dataRows = table.slice(1);
  if (dataRows.length === 0) {
    return { ok: false, error: "The CSV has headers but no job rows." };
  }

  // Resolve each mapped field to its column index (by header name).
  const colOf = (field: keyof ParsedJobRow): number | undefined => {
    const header = mapping[field];
    if (!header) return undefined;
    const at = headers.indexOf(header);
    return at === -1 ? undefined : at;
  };
  const idx: Partial<Record<keyof ParsedJobRow, number>> = {
    title: colOf("title"),
    description: colOf("description"),
    location: colOf("location"),
    salary: colOf("salary"),
    job_link: colOf("job_link"),
    category: colOf("category"),
  };
  if (mapping.id !== GENERATE_ID) idx.id = colOf("id");

  const at = (cells: string[], i: number | undefined) =>
    i === undefined ? "" : (cells[i] ?? "").trim();

  const generateId = mapping.id === GENERATE_ID;
  const rows: ParsedJobRow[] = [];
  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const row: ParsedJobRow = {
      id: "",
      title: at(cells, idx.title),
      description: at(cells, idx.description),
      location: at(cells, idx.location),
      salary: at(cells, idx.salary),
      job_link: at(cells, idx.job_link),
      category: at(cells, idx.category),
    };

    if (generateId) {
      row.id = generateJobId(row);
    } else {
      row.id = at(cells, idx.id);
      if (row.id === "") {
        return {
          ok: false,
          error: `Row ${r + 2}: the column mapped to ID ("${mapping.id}") is empty. Every job needs an ID — pick a column that's always filled, or use "Generate ID".`,
        };
      }
    }
    rows.push(row);
  }

  return { ok: true, rows };
}
