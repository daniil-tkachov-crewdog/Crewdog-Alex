/**
 * Placeholder pricing plans. Names, prices and limits are stand-ins the
 * founder will finalize. Shared by the landing page and the billing tab so
 * they never drift apart. Token limits here feed the Overview usage meter.
 */

export interface Plan {
  id: "starter" | "pro" | "scale";
  name: string;
  /** Monthly price in whole currency units (placeholder). */
  price: number;
  currency: string;
  tagline: string;
  tokenLimit: number;
  features: string[];
  /** Visually highlighted as the suggested plan. */
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    currency: "£",
    tagline: "For a single board getting started with Alex.",
    tokenLimit: 1_000_000,
    features: [
      "1 job board",
      "CSV job import",
      "Custom branding",
      "Up to 1M tokens / mo",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 149,
    currency: "£",
    tagline: "For growing boards with steady candidate traffic.",
    tokenLimit: 5_000_000,
    features: [
      "Everything in Starter",
      "Feed-URL auto-sync",
      "Priority support",
      "Up to 5M tokens / mo",
    ],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: 399,
    currency: "£",
    tagline: "For high-volume boards that need headroom.",
    tokenLimit: 20_000_000,
    features: [
      "Everything in Pro",
      "Multiple boards",
      "Dedicated onboarding",
      "Up to 20M tokens / mo",
    ],
  },
];
