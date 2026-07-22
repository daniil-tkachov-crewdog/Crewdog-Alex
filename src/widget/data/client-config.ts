import { createServiceClient } from "@/lib/supabase/service";

/**
 * Resolve a tenant's widget config from its `client_id` — the widget's public
 * counterpart to the portal's session-based `getCurrentClientConfig`. Reads
 * `profiles` with the service-role client (widget has no user session).
 *
 * Gating (v1): a widget is served only when the account is in good billing
 * standing. The live DB has no account-level `is_live` column yet, so we gate
 * on subscription tier: any paid tier is active; "free" (or an unknown
 * client_id) is not. Premium (comped) accounts are active regardless of tier.
 */

export interface ResolvedClient {
  clientId: string;
  boardName: string;
  assistantName: string;
  /** Public logo URL for the widget button/header, or null when unset. */
  logoUrl: string | null;
  /** Per-client custom system-prompt instructions (secondary layer). */
  instructions: string | null;
  active: boolean;
}

export async function getClientConfigById(
  clientId: string
): Promise<ResolvedClient | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "client_id, company_name, assistant_name, logo_url, instructions, subscription_status, is_premium"
    )
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const tier = data.subscription_status as string | null;
  const isPremium = !!data.is_premium;
  const assistantName = (data.assistant_name as string | null)?.trim() || "Alex";
  return {
    clientId: data.client_id,
    boardName: data.company_name ?? "our job board",
    assistantName,
    logoUrl: (data.logo_url as string | null) ?? null,
    instructions: (data.instructions as string | null) ?? null,
    active: isPremium || (!!tier && tier !== "free"),
  };
}
