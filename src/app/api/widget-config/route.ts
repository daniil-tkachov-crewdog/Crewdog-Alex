import type { NextRequest } from "next/server";
import { getClientConfigById } from "@/widget/data/client-config";

/**
 * GET /api/widget-config?client_id=… — public branding for the launcher.
 *
 * The floating button (public/widget.js) runs on the CUSTOMER's site, so it
 * fetches this cross-origin to learn the tenant's logo/name. Only non-sensitive
 * display fields are returned, and CORS is open (`*`) because any board's page
 * may call it. Unknown client → nulls (the launcher falls back to its default).
 */

const BRAND_COLOR = "oklch(0.54 0.23 293)";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id")?.trim() ?? "";

  let name = "Alex";
  let logoUrl: string | null = null;

  if (clientId) {
    const client = await getClientConfigById(clientId);
    if (client && client.active) {
      name = client.assistantName;
      logoUrl = client.logoUrl;
    }
  }

  return Response.json(
    { name, logoUrl, color: BRAND_COLOR },
    { headers: CORS }
  );
}
