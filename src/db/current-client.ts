import type { ClientConfig } from "@/shared/client-id";
import type { Job } from "@/shared/job-schema";
import { seedClientConfig, seedJobs, seedUsage } from "./seed";

/**
 * ── DATA ACCESS SEAM ─────────────────────────────────────────────────
 *
 * Everything the dashboard/settings render goes through these functions.
 * Right now they return the local dev seed so the whole portal runs on
 * localhost with zero env setup. In phase 2 these bodies get swapped for
 * Supabase queries keyed by the resolved client_id — nothing that CALLS
 * them has to change.
 */

export async function getCurrentClientConfig(): Promise<ClientConfig> {
  return seedClientConfig;
}

export async function getCurrentClientJobs(): Promise<Job[]> {
  return seedJobs;
}

export async function getCurrentClientUsage(): Promise<{
  tokensUsed: number;
  tokenLimit: number;
}> {
  return seedUsage;
}
