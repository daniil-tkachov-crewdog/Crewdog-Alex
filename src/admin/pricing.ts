/**
 * OpenAI token pricing, used to turn recorded token counts into dollar cost on
 * the admin Overview panel. Prices are USD per 1,000,000 tokens and are
 * editable here as OpenAI's rates change. Costs are computed at read time (not
 * stored), so a price correction here applies retroactively to all history.
 */

export interface ModelPricing {
  /** USD per 1M input (prompt) tokens. */
  inputPer1M: number;
  /** USD per 1M output (completion) tokens. */
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "gpt-4.1": { inputPer1M: 2, outputPer1M: 8 },
};

/** Used when a recorded model has no explicit entry (defaults to gpt-4o-mini). */
export const FALLBACK_PRICING: ModelPricing = MODEL_PRICING["gpt-4o-mini"];

export function pricingFor(model: string): ModelPricing {
  return MODEL_PRICING[model] ?? FALLBACK_PRICING;
}

/** Dollar cost of a set of prompt/completion tokens for a given model. */
export function costUsd(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const p = pricingFor(model);
  return (
    (promptTokens / 1_000_000) * p.inputPer1M +
    (completionTokens / 1_000_000) * p.outputPer1M
  );
}
