import type { LLMProvider } from "./types";
import { OpenAIProvider } from "./openai-provider";

/**
 * Single place the rest of the app asks for a model. Swapping providers later
 * (or picking one per client from LLM config) happens here — callers never
 * name a vendor. Kept as a factory (not a singleton) so config can vary per
 * request once that lands.
 */
export function getLLM(): LLMProvider {
  return new OpenAIProvider();
}

export type {
  ChatMessage,
  LLMProvider,
  ToolSpec,
  ToolHandler,
  CompleteOptions,
  CompleteResult,
  UsageTotals,
} from "./types";
