/**
 * ── LLM INTERFACE (swappable) ────────────────────────────────────────
 *
 * Alex talks to a model only through this interface. The concrete provider
 * (OpenAI today) sits behind it so it can be swapped later without touching
 * the orchestrator or the widget. v1 has no tool-calling here yet — that
 * arrives with `search_jobs` in the next slice.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface LLMProvider {
  /**
   * Given a full message list (system prompt first), return the assistant's
   * next reply as plain text. Throws on transport/auth errors — the caller
   * is responsible for turning that into a safe client response.
   */
  complete(messages: ChatMessage[]): Promise<string>;
}
