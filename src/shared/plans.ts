/**
 * Placeholder pricing plans. Names, prices and limits are stand-ins the
 * founder will finalize. Shared by the landing page and the billing tab so
 * they never drift apart. Token limits here feed the Overview usage meter.
 */

export interface Plan {
  id: "starter" | "growth" | "scale";
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
    tokenLimit: 250_000,
    features: [
      "1 job board",
      "CSV job import",
      "Custom branding",
      "Up to 250k tokens / mo",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: 149,
    currency: "£",
    tagline: "For growing boards with steady candidate traffic.",
    tokenLimit: 1_000_000,
    features: [
      "Everything in Starter",
      "Feed-URL auto-sync (soon)",
      "Priority support",
      "Up to 1M tokens / mo",
    ],
    highlighted: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: 399,
    currency: "£",
    tagline: "For high-volume boards that need headroom.",
    tokenLimit: 5_000_000,
    features: [
      "Everything in Growth",
      "Multiple boards",
      "Dedicated onboarding",
      "Up to 5M tokens / mo",
    ],
  },
];
