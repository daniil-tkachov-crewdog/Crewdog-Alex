import type { ClientConfig, SubscriptionStatus } from "@/shared/client-id";
import type { JobRow } from "@/shared/job-schema";
import { PLANS } from "@/shared/plans";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  isFeedInterval,
  type FeedSchedule,
} from "@/tool/ingest/feed/schedule";
import type { FeedMapping } from "@/tool/ingest/feed/parse-feed";
import { seedClientConfig, seedJobs, seedUsage } from "./seed";

/**
 * ── DATA ACCESS SEAM ─────────────────────────────────────────────────
 *
 * Everything the dashboard/settings render goes through these functions.
 * Config now resolves from the logged-in Supabase user (mapped to a tenant
 * via profiles.client_id). With no session — e.g. running on localhost
 * without logging in — we fall back to the local dev seed so the portal
 * still renders. Jobs + usage remain seeded (Track A wires real data later).
 */

/**
 * The account tier stored on profiles.subscription_status is distinct from the
 * widget-gating ClientConfig.subscription_status. Until Stripe is wired, we map
 * tier → widget status: any paid tier reads as "active", "free" (no
 * subscription) reads as "inactive".
 */
function widgetStatusFromTier(tier: string | null | undefined): SubscriptionStatus {
  return tier && tier !== "free" ? "active" : "inactive";
}

export async function getCurrentClientConfig(): Promise<ClientConfig> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return seedClientConfig;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "company_name, client_id, subscription_status, assistant_name, logo_url, instructions"
    )
    .eq("id", user.id)
    .single();

  if (!profile) {
    return seedClientConfig;
  }

  return {
    client_id: profile.client_id,
    branding: {
      assistant_name: (profile.assistant_name as string | null)?.trim() || "Alex",
      board_name: profile.company_name ?? "Your board",
      logo_url: (profile.logo_url as string | null) ?? null,
      instructions: (profile.instructions as string | null) ?? null,
    },
    subscription_status: widgetStatusFromTier(profile.subscription_status),
    data_source: null,
    is_live: false,
  };
}

/**
 * Resolve the client_id for the logged-in user, or null if there's no session
 * (e.g. localhost without login). Server actions use this to stamp/scope every
 * write; RLS enforces the same rule as defence-in-depth.
 */
export async function getSessionClientId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  return profile?.client_id ?? null;
}

export async function getCurrentClientJobs(): Promise<JobRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session → dev/preview fallback so the table still renders locally.
  if (!user) {
    return seedJobs;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return seedJobs;
  }

  const { data, error } = await supabase
    .from("jobs")
    .select("row_id, source_id, title, description, location, salary, category, job_link, disabled")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: true });

  // Logged in but no jobs yet (or a read error) → empty table, not the seed.
  if (error || !data) {
    return [];
  }

  return data.map((r) => ({
    row_id: r.row_id as string,
    id: r.source_id as string,
    client_id: profile.client_id as string,
    title: r.title as string,
    description: r.description as string,
    location: r.location as string,
    salary: r.salary as string,
    category: (r.category as string) ?? "",
    job_link: r.job_link as string,
    disabled: r.disabled as boolean,
  }));
}

/**
 * The saved feed auto-update schedule for the logged-in tenant, or null when
 * there's no session or no schedule. Drives the import block's locked state.
 */
export async function getCurrentClientFeedSchedule(): Promise<FeedSchedule | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  const { data, error } = await supabase
    .from("feed_sources")
    .select("url, mapping, interval_hours, enabled, last_run_at")
    .eq("client_id", profile.client_id)
    .maybeSingle();

  if (error || !data) return null;

  const interval = Number(data.interval_hours);
  return {
    url: data.url as string,
    mapping: (data.mapping ?? {}) as FeedMapping,
    intervalHours: isFeedInterval(interval) ? interval : 24,
    enabled: data.enabled as boolean,
    lastRunAt: (data.last_run_at as string | null) ?? null,
  };
}

/**
 * Token meter for the Overview tab. The limit comes from the account's plan
 * tier (profiles.subscription_status → PLANS[].tokenLimit); usage is the sum of
 * this month's usage_events for the tenant. usage_events has RLS with no
 * policies, so the month-to-date sum reads via the service-role client (scoped
 * by client_id). No session → the local dev seed so the meter still renders.
 */
export async function getCurrentClientUsage(): Promise<{
  tokensUsed: number;
  tokenLimit: number;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return seedUsage;

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, subscription_status")
    .eq("id", user.id)
    .single();
  if (!profile) return seedUsage;

  const tier = (profile.subscription_status as string | null) ?? "free";
  const starter = PLANS.find((p) => p.id === "starter")!;
  const tokenLimit = (PLANS.find((p) => p.id === tier) ?? starter).tokenLimit;

  // Month-to-date usage (UTC month start), best-effort.
  let tokensUsed = 0;
  try {
    const admin = createServiceClient();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { data } = await admin
      .from("usage_events")
      .select("total_tokens")
      .eq("client_id", profile.client_id)
      .gte("created_at", monthStart.toISOString());
    tokensUsed = (data ?? []).reduce(
      (sum, r) => sum + ((r.total_tokens as number) ?? 0),
      0
    );
  } catch {
    // Usage read is non-critical; fall through with tokensUsed = 0.
  }

  return { tokensUsed, tokenLimit };
}
