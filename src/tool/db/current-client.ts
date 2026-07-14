import type { ClientConfig, SubscriptionStatus } from "@/shared/client-id";
import type { Job } from "@/shared/job-schema";
import { createClient } from "@/lib/supabase/server";
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
    .select("company_name, client_id, subscription_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return seedClientConfig;
  }

  return {
    client_id: profile.client_id,
    branding: {
      assistant_name: "Alex",
      board_name: profile.company_name ?? "Your board",
      logo_url: null,
      instructions: null,
    },
    subscription_status: widgetStatusFromTier(profile.subscription_status),
    data_source: null,
    is_live: false,
  };
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
