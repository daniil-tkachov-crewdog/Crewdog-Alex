/**
 * ── CLIENT_ID CONTRACT ───────────────────────────────────────────────
 *
 * Everything in Alex keys off `client_id`: branding, job data, subscription
 * status, and (later) LLM config all resolve from it. This file defines the
 * shape of a tenant's resolved config — the object the widget loads to render
 * and behave as a given board.
 *
 * ⚠️  CONTRACT FILE — mirrored by hand in the widget repo (alex-widget).
 *     The portal WRITES this config; the widget READS it, keyed by client_id.
 */

export type ClientId = string;

/** Subscription state that gates whether a client's widget is active. */
export type SubscriptionStatus = "active" | "past_due" | "inactive";

/** Which on-ramp feeds this tenant's jobs. */
export type DataSourceKind = "csv" | "feed" | "scraping";

/** Branding the board configures; resolved by the widget at render time. */
export interface ClientBranding {
  /** What the assistant calls itself, e.g. "Alex". */
  assistant_name: string;
  /** The job board's name, for the assistant to refer to. */
  board_name: string;
  /** Public URL of the chatbot logo (Supabase Storage). Nullable until set. */
  logo_url: string | null;
  /** Extra system-prompt instructions appended to the assistant's backend. */
  instructions: string | null;
}

/**
 * The full resolved tenant config. This is the object the two repos meet on:
 * the portal is the sole writer, the widget is a reader.
 */
export interface ClientConfig {
  client_id: ClientId;
  branding: ClientBranding;
  subscription_status: SubscriptionStatus;
  data_source: DataSourceKind | null;
  /** Whether the dev team has pressed "Start" to go live. */
  is_live: boolean;
}

/**
 * A client's widget is only served if it is BOTH switched on ("Start")
 * AND in good billing standing. Admin/comped accounts set subscription_status
 * to "active" without a real Stripe subscription.
 */
export function isWidgetActive(config: {
  is_live: boolean;
  subscription_status: SubscriptionStatus;
}): boolean {
  return config.is_live && config.subscription_status === "active";
}
