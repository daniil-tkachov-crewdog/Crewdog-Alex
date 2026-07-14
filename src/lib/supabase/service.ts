import { createClient } from "@supabase/supabase-js";

/**
 * ── SERVICE-ROLE SUPABASE CLIENT (server-only) ───────────────────────
 *
 * The widget is public (job hunters never log in), but the jobs/profiles
 * tables have RLS. So the widget's server code reads with the service-role
 * key, which bypasses RLS. Tenant isolation is therefore OUR responsibility:
 * every query MUST filter by the resolved `client_id`.
 *
 * NEVER import this into client code — the key is server-side only
 * (Render env var SUPABASE_SERVICE_ROLE_KEY).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
