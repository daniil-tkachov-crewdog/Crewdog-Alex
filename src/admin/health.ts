import OpenAI from "openai";
import { createServiceClient } from "@/lib/supabase/service";
import type { StatusTone } from "@/tool/components/status-light";

/**
 * ── ALEX GLOBAL HEALTH ───────────────────────────────────────────────
 *
 * Live probes of the whole chatbot stack (NOT any single tenant). Three checks:
 *   1. OpenAI  — is the model API reachable and the key valid?
 *   2. Database — is Supabase reachable?
 *   3. Search tool — can search_jobs read the jobs table it depends on?
 *
 * Overall light:
 *   Red   — OpenAI or the database is down: Alex cannot answer at all.
 *   Amber — core is up but the search tool is impaired (Alex can chat but
 *           can't reliably return jobs).
 *   Green — everything responds.
 */

export interface HealthProbe {
  name: string;
  ok: boolean;
  detail: string;
}

export interface HealthReport {
  tone: StatusTone;
  label: string;
  probes: HealthProbe[];
  checkedAt: string;
}

const PROBE_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function probeOpenAI(): Promise<HealthProbe> {
  const name = "OpenAI API";
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { name, ok: false, detail: "OPENAI_API_KEY is not set on the server." };
  }
  try {
    const client = new OpenAI({ apiKey });
    // Cheap, token-free reachability + auth check.
    await withTimeout(client.models.list(), PROBE_TIMEOUT_MS, name);
    return { name, ok: true, detail: "Reachable, key accepted." };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: `Not responding: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

async function probeDatabase(): Promise<HealthProbe> {
  const name = "Database";
  try {
    const supabase = createServiceClient();
    const query = supabase.from("profiles").select("id", { count: "exact", head: true });
    const { error } = await withTimeout(Promise.resolve(query), PROBE_TIMEOUT_MS, name);
    if (error) throw new Error(error.message);
    return { name, ok: true, detail: "Supabase reachable." };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: `Unreachable: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

async function probeSearchTool(): Promise<HealthProbe> {
  const name = "Job search tool";
  try {
    const supabase = createServiceClient();
    // Exercise the exact read path search_jobs relies on.
    const query = supabase.from("jobs").select("row_id").limit(1);
    const { error } = await withTimeout(Promise.resolve(query), PROBE_TIMEOUT_MS, name);
    if (error) throw new Error(error.message);
    return { name, ok: true, detail: "Job index reachable and queryable." };
  } catch (err) {
    return {
      name,
      ok: false,
      detail: `Search unavailable: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }
}

export async function checkAlexHealth(): Promise<HealthReport> {
  const [openai, database, searchTool] = await Promise.all([
    probeOpenAI(),
    probeDatabase(),
    probeSearchTool(),
  ]);
  const probes = [openai, database, searchTool];

  let tone: StatusTone;
  let label: string;
  if (!openai.ok || !database.ok) {
    tone = "red";
    label = "Down";
  } else if (!searchTool.ok) {
    tone = "amber";
    label = "Degraded";
  } else {
    tone = "green";
    label = "All systems go";
  }

  return { tone, label, probes, checkedAt: new Date().toISOString() };
}
