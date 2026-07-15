/**
 * ── LLM INTERFACE (swappable) ────────────────────────────────────────
 *
 * Alex talks to a model only through this interface. The concrete provider
 * (OpenAI today) sits behind it so it can be swapped later without touching
 * the orchestrator or the widget.
 *
 * Tool-calling is expressed vendor-neutrally: the caller passes JSON-Schema
 * tool specs plus plain-function handlers, and the provider owns whatever
 * loop its vendor needs to run them. DB logic stays in the handlers (the
 * orchestrator), never in the provider.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** Runs a tool call and returns a string result for the model to read. */
export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

export interface CompleteOptions {
  tools?: ToolSpec[];
  handlers?: Record<string, ToolHandler>;
}

/**
 * Token usage for a single `complete` call, summed across every underlying
 * model round-trip (tool loops included). Vendor-neutral so the orchestrator
 * can record usage without knowing which provider produced it.
 */
export interface UsageTotals {
  /** Model that produced the completion, for per-model cost attribution. */
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** The assistant's reply plus the token usage it cost to produce. */
export interface CompleteResult {
  reply: string;
  usage: UsageTotals;
}

export interface LLMProvider {
  /**
   * Given a full message list (system prompt first), return the assistant's
   * next reply plus the token usage it cost. If tools + handlers are supplied,
   * the provider runs any tool calls to completion first, then returns the
   * final text. Throws on transport/auth errors — the caller turns that into a
   * safe client response.
   */
  complete(
    messages: ChatMessage[],
    options?: CompleteOptions
  ): Promise<CompleteResult>;
}
