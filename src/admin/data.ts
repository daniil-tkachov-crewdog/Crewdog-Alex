import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { costUsd } from "./pricing";

/**
 * ── ADMIN DATA ACCESS ────────────────────────────────────────────────
 *
 * The admin panel reads across ALL tenants, so — unlike the tenant dashboard —
 * it uses the service-role client (bypasses RLS). Every entry point must first
 * confirm the caller is an admin via `getAdminIdentity()`; the page and every
 * server action call it before touching this data.
 */

export interface AdminIdentity {
  userId: string;
  email: string;
}

/**
 * Resolve the signed-in user IF they are an admin, else null. Uses the
 * session-scoped client (RLS lets a user read their own profile), so this
 * cannot be spoofed by the service key.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return { userId: user.id, email: user.email ?? "" };
}

// ── Users ──────────────────────────────────────────────────────────────────

export type AccountTier = "free" | "starter" | "pro" | "scale";

export interface AdminUser {
  id: string;
  clientId: string;
  companyName: string;
  email: string;
  tier: AccountTier;
  isPremium: boolean;
  isAdmin: boolean;
  createdAt: string | null;
}

/** All accounts, newest first, with their login email joined from auth.users. */
export async function fetchUsers(): Promise<AdminUser[]> {
  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, company_name, client_id, subscription_status, is_premium, is_admin, created_at")
    .order("created_at", { ascending: false });

  if (error || !profiles) return [];

  // Emails live in auth.users, not profiles — resolve them via the admin API.
  const emailById = new Map<string, string>();
  try {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const u of data?.users ?? []) {
      if (u.id) emailById.set(u.id, u.email ?? "");
    }
  } catch {
    // Non-fatal: fall back to blank emails if the admin API is unavailable.
  }

  return profiles.map((p) => ({
    id: p.id as string,
    clientId: (p.client_id as string) ?? "",
    companyName: (p.company_name as string) ?? "",
    email: emailById.get(p.id as string) ?? "",
    tier: ((p.subscription_status as string) ?? "free") as AccountTier,
    isPremium: !!p.is_premium,
    isAdmin: !!p.is_admin,
    createdAt: (p.created_at as string) ?? null,
  }));
}

// ── Usage ────────────────────────────────────────────────────────────────────

export interface DailyUsage {
  date: string; // YYYY-MM-DD (UTC)
  totalTokens: number;
  costUsd: number;
}

export interface ModelUsage {
  model: string;
  totalTokens: number;
  costUsd: number;
  requests: number;
}

export interface ClientUsage {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  requests: number;
}

export interface UsageSummary {
  windowDays: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  requests: number;
  byDay: DailyUsage[];
  byModel: ModelUsage[];
  /** Per-tenant totals over the window, keyed by client_id. */
  byClient: Record<string, ClientUsage>;
}

function utcDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/**
 * Aggregate usage over the last `windowDays` (default 30 — one billing period).
 * All aggregation happens in JS over the windowed rows; the created_at index
 * keeps the scan cheap while volumes are small.
 */
export async function fetchUsageSummary(windowDays = 30): Promise<UsageSummary> {
  const supabase = createServiceClient();
  const since = new Date(Date.now() - windowDays * 86_400_000);

  const { data, error } = await supabase
    .from("usage_events")
    .select("created_at, client_id, model, prompt_tokens, completion_tokens, total_tokens")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const rows = error || !data ? [] : data;

  // Pre-seed every day in the window so the chart shows zero-days too.
  const dayMap = new Map<string, DailyUsage>();
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    dayMap.set(d, { date: d, totalTokens: 0, costUsd: 0 });
  }

  const modelMap = new Map<string, ModelUsage>();
  const byClient: Record<string, ClientUsage> = {};

  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalCostUsd = 0;

  for (const r of rows) {
    const model = (r.model as string) || "unknown";
    const pt = (r.prompt_tokens as number) ?? 0;
    const ct = (r.completion_tokens as number) ?? 0;
    const tt = (r.total_tokens as number) ?? pt + ct;
    const cost = costUsd(model, pt, ct);
    const clientId = (r.client_id as string) ?? "unknown";

    totalTokens += tt;
    promptTokens += pt;
    completionTokens += ct;
    totalCostUsd += cost;

    const day = dayMap.get(utcDay(r.created_at as string));
    if (day) {
      day.totalTokens += tt;
      day.costUsd += cost;
    }

    const m = modelMap.get(model) ?? { model, totalTokens: 0, costUsd: 0, requests: 0 };
    m.totalTokens += tt;
    m.costUsd += cost;
    m.requests += 1;
    modelMap.set(model, m);

    const c = byClient[clientId] ?? {
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      costUsd: 0,
      requests: 0,
    };
    c.totalTokens += tt;
    c.promptTokens += pt;
    c.completionTokens += ct;
    c.costUsd += cost;
    c.requests += 1;
    byClient[clientId] = c;
  }

  return {
    windowDays,
    totalTokens,
    promptTokens,
    completionTokens,
    totalCostUsd,
    requests: rows.length,
    byDay: Array.from(dayMap.values()),
    byModel: Array.from(modelMap.values()).sort((a, b) => b.totalTokens - a.totalTokens),
    byClient,
  };
}

// ── Support tickets ──────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  email: string;
  topic: string;
  body: string;
  createdAt: string;
}

export async function fetchTickets(): Promise<SupportTicket[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, email, topic, body, created_at")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((t) => ({
    id: t.id as string,
    email: (t.email as string) ?? "",
    topic: (t.topic as string) ?? "",
    body: (t.body as string) ?? "",
    createdAt: (t.created_at as string) ?? "",
  }));
}
