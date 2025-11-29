/**
 * AI Pricing Utilities
 *
 * Model pricing constants and cost calculation for token usage tracking.
 * Prices are per million tokens.
 */

// Pricing per million tokens (as of November 2024)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0 },
};

// Default to Sonnet pricing if model not found
const DEFAULT_PRICING = { input: 3.0, output: 15.0 };

/**
 * Calculate the cost for a given token usage
 * @param modelId - The model ID string
 * @param inputTokens - Number of input tokens used
 * @param outputTokens - Number of output tokens used
 * @returns Cost in USD
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Calculate the cost for token usage including cache metrics.
 * Cache read tokens cost 10% of normal input price.
 * Cache write tokens cost 125% of normal input price.
 *
 * @param modelId - The model ID string
 * @param inputTokens - Number of uncached input tokens
 * @param outputTokens - Number of output tokens
 * @param cacheReadTokens - Number of tokens read from cache
 * @param cacheCreationTokens - Number of tokens written to cache
 * @returns Cost in USD
 */
export function calculateCostWithCache(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens: number,
  cacheCreationTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] ?? DEFAULT_PRICING;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cacheReadCost = (cacheReadTokens / 1_000_000) * pricing.input * 0.1;
  const cacheWriteCost = (cacheCreationTokens / 1_000_000) * pricing.input * 1.25;
  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

/**
 * Format a cost value as a USD string
 * @param cost - Cost in USD
 * @returns Formatted string like "$0.02" or "<$0.01"
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return cost > 0 ? "<$0.01" : "$0.00";
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Format token count with thousands separators
 * @param tokens - Number of tokens
 * @returns Formatted string like "1,234"
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}
