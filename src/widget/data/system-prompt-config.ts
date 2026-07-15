import { createServiceClient } from "@/lib/supabase/service";
import {
  DEFAULT_SYSTEM_PROMPT_TEMPLATE,
  interpolatePrompt,
  buildSystemPrompt,
  type PromptBrand,
} from "@/widget/system-prompt";

/** The admin_settings key under which the editable system prompt lives. */
export const SYSTEM_PROMPT_KEY = "system_prompt";

/**
 * Resolve the live system prompt for a tenant. Reads the admin-editable
 * template from `admin_settings` (service-role client — the widget is public)
 * and interpolates the brand strings. Any miss or error falls back to the
 * in-code default so the chatbot never loses its instructions.
 */
export async function resolveSystemPrompt(brand: PromptBrand): Promise<string> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", SYSTEM_PROMPT_KEY)
      .maybeSingle();

    const template = (data?.value as string | undefined)?.trim();
    if (error || !template) {
      return buildSystemPrompt(brand);
    }
    return interpolatePrompt(template, brand);
  } catch (err) {
    console.error("[system-prompt] falling back to default:", err);
    return buildSystemPrompt(brand);
  }
}

/** Read the raw editable template (with placeholders), for the admin editor. */
export async function getSystemPromptTemplate(): Promise<string> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("admin_settings")
      .select("value")
      .eq("key", SYSTEM_PROMPT_KEY)
      .maybeSingle();
    const template = (data?.value as string | undefined)?.trim();
    return template || DEFAULT_SYSTEM_PROMPT_TEMPLATE;
  } catch {
    return DEFAULT_SYSTEM_PROMPT_TEMPLATE;
  }
}
