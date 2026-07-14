import type { Job } from "@/shared/job-schema";

/**
 * v1 CSV on-ramp. Expects exact headers:
 *   ID, Job title, Job description, Location, Salary
 * Parsing/validation is implemented in phase 2; this is the module seam so the
 * Import tab has a stable place to call into. Column-mapping is deferred.
 */
export const CSV_HEADERS = [
  "ID",
  "Job title",
  "Job description",
  "Location",
  "Salary",
] as const;

export function parseJobsCsv(_csv: string, _clientId: string): Job[] {
  throw new Error("parseJobsCsv: not implemented until phase 2 (Supabase wiring).");
}
