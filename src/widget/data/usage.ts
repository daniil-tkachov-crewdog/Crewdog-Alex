import { createServiceClient } from "@/lib/supabase/service";
import type { UsageTotals } from "@/widget/llm";

/**
 * Record one chat request's GPT token usage into `usage_events`. Written with
 * the service-role client (the chat endpoint is public, no user session) and
 * tagged with the tenant's client_id so the admin panel can attribute usage
 * per account.
 *
 * ⚠️  Best-effort telemetry: a logging failure must NEVER break a chat reply,
 * so every path here is swallowed. Usage is forward-looking — rows accumulate
 * from the moment this ships; there is no historical backfill.
 */
export async function recordUsage(
  clientId: string,
  usage: UsageTotals
): Promise<void> {
  try {
    if (usage.totalTokens <= 0) return; // nothing metered (e.g. empty reply)
    const supabase = createServiceClient();
    await supabase.from("usage_events").insert({
      client_id: clientId,
      model: usage.model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
    });
  } catch (err) {
    // Never surface to the caller — usage logging is non-critical.
    console.error("[usage] failed to record usage event:", err);
  }
}
