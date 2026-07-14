import type { SubscriptionStatus } from "@/shared/client-id";
import type { StatusTone } from "@/components/app/status-light";

export function subscriptionTone(status: SubscriptionStatus): StatusTone {
  switch (status) {
    case "active":
      return "green";
    case "past_due":
      return "amber";
    case "inactive":
      return "red";
  }
}

export function subscriptionLabel(status: SubscriptionStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "inactive":
      return "Inactive";
  }
}
