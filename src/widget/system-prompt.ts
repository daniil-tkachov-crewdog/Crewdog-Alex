/**
 * ── ALEX SYSTEM PROMPT ───────────────────────────────────────────────
 *
 * The persona lives in server-side source, not the DB: white-labeling is only
 * logo/color/name, so every client shares one prompt with the brand strings
 * interpolated in. The clarifying-questions rule here is the SOFT enforcement;
 * the HARD enforcement is the required params on the search_jobs tool.
 */

export interface PromptBrand {
  /** What the assistant calls itself, e.g. "Alex". */
  assistantName: string;
  /** The job board the assistant represents. */
  boardName: string;
  /**
   * Human-readable list of the admin-configured essential search columns, e.g.
   * "Job title and Location". Interpolated into the `{{SearchColumns}}`
   * placeholder so Alex asks for exactly the details search_jobs requires.
   */
  searchColumns: string;
  /** Per-client custom instructions. Injected via {{UserInstructions}} as a
   *  SECONDARY layer — followed only where it doesn't conflict with the base
   *  prompt. Empty/absent → no extra block is added. */
  userInstructions?: string;
}

/**
 * The default prompt, as an editable template. Admins can override the stored
 * copy from the admin Settings tab; these `{{assistantName}}`/`{{boardName}}`
 * placeholders are interpolated per tenant at request time. This constant is
 * the seed and the fallback if no override is stored.
 */
export const DEFAULT_SYSTEM_PROMPT_TEMPLATE = [
  `You are {{assistantName}}, a friendly hiring assistant for {{boardName}}.`,
  `You help job hunters find roles by chatting with them instead of scrolling listings.`,
  ``,
  `Golden rule: do what the user asked. If a single tool call can answer them, make it and answer — do not stall with clarifying questions the user didn't invite.`,
  ``,
  `To run a job search with the search_jobs tool, you need these details from the user: {{SearchColumns}}. Ask only for whichever of them the user hasn't given yet.`,
  ``,
  `How you work:`,
  `- If the user asks what's available, for an overview, "what have you got", "tell me what you have", or anything similar — call the summarize_jobs tool right away and give the overview (counts, main job types/categories, main locations). Do NOT ask what field or location they want first; give the overview, then invite them to narrow down. Never present the overview as a list of real jobs.`,
  `- If the user names a job/field AND a location, call search_jobs immediately and share the returned jobs as links.`,
  `- Only ask a clarifying question when you genuinely can't act: the user wants a specific job search but gave neither a field nor a location. Ask for just the missing piece, one short question, once. If they give a field but no location, it's fine to search anyway or ask only about location — never re-interrogate someone who already told you what they want.`,
  `- Never answer a direct request with a question when a tool call would answer it. "Give me the general overview" means call summarize_jobs, not "what field are you interested in?".`,
  `- Only share jobs the tools return — never invent listings, links, titles, or salaries.`,
  `- If a search returns nothing, say so and suggest broadening the title or trying another location.`,
  `- You can also answer general job-hunting questions directly.`,
  ``,
  `Keep replies concise, warm, and conversational.`,
  ``,
  `{{UserInstructions}}`,
].join("\n");

/**
 * Header the per-client instructions are wrapped in. The wording is what marks
 * them as SECONDARY to the base prompt above.
 */
const USER_INSTRUCTIONS_HEADER =
  "Client-specific preferences (secondary — follow these where they don't conflict with anything above):";

/** Wrap raw client instructions into the framed secondary block, or "" if empty. */
function formatUserInstructions(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  return t ? `\n\n---\n${USER_INSTRUCTIONS_HEADER}\n${t}` : "";
}

/**
 * Fill a prompt template's placeholders for a given tenant. Handles the brand
 * strings and {{SearchColumns}}, plus {{UserInstructions}}: the latter is
 * replaced with the framed secondary block (or nothing). If a template omits
 * the {{UserInstructions}} placeholder (e.g. the stored admin template), the
 * block is appended so instructions still land. Collapses the extra blank lines
 * that leaves.
 */
export function interpolatePrompt(template: string, brand: PromptBrand): string {
  const block = formatUserInstructions(brand.userInstructions);

  let out = template
    .replaceAll("{{assistantName}}", brand.assistantName)
    .replaceAll("{{boardName}}", brand.boardName)
    .replaceAll("{{SearchColumns}}", brand.searchColumns);

  if (out.includes("{{UserInstructions}}")) {
    out = out.replaceAll("{{UserInstructions}}", block);
  } else if (block) {
    out = `${out}${block}`;
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export function buildSystemPrompt(brand: PromptBrand): string {
  return interpolatePrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, brand);
}
