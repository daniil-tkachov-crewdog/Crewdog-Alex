"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { getAdminIdentity } from "@/admin/data";
import { SYSTEM_PROMPT_KEY } from "@/widget/data/system-prompt-config";
import {
  SEARCH_TOOL_CONFIG_KEY,
  SUMMARY_TOOL_CONFIG_KEY,
  normalizeSearchConfig,
  normalizeSummaryConfig,
  type SearchToolConfig,
  type SummaryToolConfig,
} from "@/widget/data/tool-config";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Flip an account's comped/premium status. Premium accounts get unlimited AI
 * usage and are treated as active by the widget without a paid subscription.
 * Admin-only; re-checks the caller before writing with the service client.
 */
export async function setPremium(
  clientId: string,
  isPremium: boolean
): Promise<ActionResult> {
  const admin = await getAdminIdentity();
  if (!admin) return { ok: false, error: "Not authorized." };
  if (!clientId) return { ok: false, error: "Missing client_id." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_premium: isPremium })
    .eq("client_id", clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

/** Persist a normalized tool config JSON blob under `key`. Admin-only. */
async function saveToolConfig(key: string, json: string): Promise<ActionResult> {
  const admin = await getAdminIdentity();
  if (!admin) return { ok: false, error: "Not authorized." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert({ key, value: json }, { onConflict: "key" });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

/** Save the search-tool config. Normalized/clamped before storing. */
export async function saveSearchConfig(config: SearchToolConfig): Promise<ActionResult> {
  return saveToolConfig(SEARCH_TOOL_CONFIG_KEY, JSON.stringify(normalizeSearchConfig(config)));
}

/** Save the summary-tool config. Normalized/clamped before storing. */
export async function saveSummaryConfig(config: SummaryToolConfig): Promise<ActionResult> {
  return saveToolConfig(SUMMARY_TOOL_CONFIG_KEY, JSON.stringify(normalizeSummaryConfig(config)));
}

/**
 * Update the live Alex system prompt template. Takes effect on the next chat
 * request (the chat route reads it per request). Admin-only.
 */
export async function saveSystemPrompt(value: string): Promise<ActionResult> {
  const admin = await getAdminIdentity();
  if (!admin) return { ok: false, error: "Not authorized." };

  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "The system prompt can't be empty." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("admin_settings")
    .upsert(
      { key: SYSTEM_PROMPT_KEY, value: trimmed },
      { onConflict: "key" }
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
