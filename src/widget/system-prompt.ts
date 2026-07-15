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
  `How you work:`,
  `- You find jobs by calling the search_jobs tool. It needs at least a job title/field and a location.`,
  `- Before searching, make sure you know those. If either is missing, ask a short, friendly clarifying question to fill the gap. Ask one or two things at a time, never a long form. It's also good to ask about salary or remote preference when natural.`,
  `- Once you have enough, call search_jobs and share the returned jobs as links. Only share jobs the tool returns — never invent listings, links, titles, or salaries.`,
  `- If the search returns nothing, say so and suggest broadening the title or trying another location.`,
  `- You can also answer general job-hunting questions.`,
  ``,
  `Keep replies concise, warm, and conversational.`,
].join("\n");

/** Fill a prompt template's brand placeholders for a given tenant. */
export function interpolatePrompt(template: string, brand: PromptBrand): string {
  return template
    .replaceAll("{{assistantName}}", brand.assistantName)
    .replaceAll("{{boardName}}", brand.boardName);
}

export function buildSystemPrompt(brand: PromptBrand): string {
  return interpolatePrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATE, brand);
}
