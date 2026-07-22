"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getSessionClientId } from "@/tool/db/current-client";

export type BrandingResult =
  | { ok: true; logoUrl: string | null }
  | { ok: false; error: string };

const NO_SESSION =
  "You need to be logged in to update your branding. Log in and try again.";

const LOGO_BUCKET = "branding";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB — logos are small.

/**
 * Persist the Branding tab. Saves assistant name, board name (→ company_name)
 * and custom instructions on the tenant's profile, and—if a new PNG was
 * chosen—uploads it to the public `branding` bucket and stores its URL.
 *
 * The upload uses the service-role client (Storage writes need it); everything
 * is scoped to the logged-in tenant's own client_id / row.
 */
export async function saveBranding(formData: FormData): Promise<BrandingResult> {
  const clientId = await getSessionClientId();
  if (!clientId) return { ok: false, error: NO_SESSION };

  const assistantName = String(formData.get("assistant_name") ?? "").trim();
  const boardName = String(formData.get("board_name") ?? "").trim();
  const instructions = String(formData.get("instructions") ?? "").trim();
  const logo = formData.get("logo");

  const supabase = await createClient();

  // Confirm the session maps to a row we own, and get its user id.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: NO_SESSION };

  // Optional logo upload (only when a non-empty file was provided).
  let logoUrl: string | null | undefined;
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      return { ok: false, error: "The logo is too large (max 2 MB)." };
    }
    if (logo.type && !logo.type.startsWith("image/")) {
      return { ok: false, error: "The logo must be an image file." };
    }
    const admin = createServiceClient();
    // Stable per-tenant path so re-uploads overwrite the previous logo.
    const path = `${clientId}.png`;
    const { error: uploadErr } = await admin.storage
      .from(LOGO_BUCKET)
      .upload(path, logo, {
        upsert: true,
        contentType: logo.type || "image/png",
      });
    if (uploadErr) {
      return { ok: false, error: `Logo upload failed: ${uploadErr.message}` };
    }
    const {
      data: { publicUrl },
    } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
    // Cache-bust so the new logo shows immediately.
    logoUrl = `${publicUrl}?v=${Date.now()}`;
  }

  const update: Record<string, string | null> = {
    assistant_name: assistantName || null,
    instructions: instructions || null,
  };
  if (boardName) update.company_name = boardName;
  if (logoUrl !== undefined) update.logo_url = logoUrl;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  return { ok: true, logoUrl: logoUrl ?? null };
}
