import type { ClientConfig } from "@/shared/client-id";
import type { StatusTone } from "@/components/app/status-light";

/**
 * Derives the chatbot health light from tenant state.
 *   Green  — subscription active, jobs imported, and switched live.
 *   Amber  — subscription active but not fully set up (no jobs, or not started).
 *   Red    — subscription inactive: the widget can't serve.
 */
export function computeHealth(
  config: Pick<ClientConfig, "subscription_status" | "is_live">,
  hasJobs: boolean
): { tone: StatusTone; label: string; detail: string } {
  if (config.subscription_status === "inactive") {
    return {
      tone: "red",
      label: "Offline",
      detail: "Subscription inactive — reactivate billing to bring Alex back online.",
    };
  }

  if (!hasJobs) {
    return {
      tone: "amber",
      label: "Needs setup",
      detail: "No jobs imported yet. Import your listings on the Import tab.",
    };
  }

  if (!config.is_live) {
    return {
      tone: "amber",
      label: "Ready to start",
      detail: "Everything's set — press Start to take Alex live.",
    };
  }

  return {
    tone: "green",
    label: "Live & healthy",
    detail: "Alex is live and serving candidates on your site.",
  };
}
