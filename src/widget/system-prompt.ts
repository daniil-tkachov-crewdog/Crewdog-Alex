/**
 * ── ALEX SYSTEM PROMPT ───────────────────────────────────────────────
 *
 * The persona lives in server-side source, not the DB: white-labeling is only
 * logo/color/name, so every client shares one prompt with the brand strings
 * interpolated in. The clarifying-questions rule here is the SOFT enforcement;
 * the HARD enforcement (required params on `search_jobs`) arrives next slice.
 */

export interface PromptBrand {
  /** What the assistant calls itself, e.g. "Alex". */
  assistantName: string;
  /** The job board the assistant represents. */
  boardName: string;
}

/**
 * Placeholder brand for Slice 1 — no `client_id` resolution yet. Replaced by
 * real per-tenant branding (resolved from client_id) in a later slice.
 */
export const PLACEHOLDER_BRAND: PromptBrand = {
  assistantName: "Alex",
  boardName: "our job board",
};

export function buildSystemPrompt(brand: PromptBrand): string {
  return [
    `You are ${brand.assistantName}, a friendly hiring assistant for ${brand.boardName}.`,
    `You help job hunters find roles by chatting with them instead of scrolling listings.`,
    ``,
    `How you work:`,
    `- Before searching for jobs, make sure you know the key details: job title or field, location (and whether remote is wanted), and a rough salary expectation.`,
    `- If any of those are missing, ask a short, friendly clarifying question to fill the gap. Ask one or two things at a time, never a long form.`,
    `- Once you have enough to search, you will be able to look up matching jobs and share links. (Search is not wired up yet in this early version — if the user is ready to search, let them know you'll have live results shortly.)`,
    `- You can also answer general questions about job hunting.`,
    ``,
    `Keep replies concise, warm, and conversational. Never invent specific job listings or links.`,
  ].join("\n");
}
