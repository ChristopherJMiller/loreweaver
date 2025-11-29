/**
 * Model Selection Logic
 *
 * Determines which Claude model to use based on task type,
 * content characteristics, and user preferences.
 *
 * - Haiku: Fast, cost-effective for generation/expansion
 * - Sonnet: Required for reasoning-heavy tasks (consistency check, session processing)
 */

import { AI_CONFIG } from "./config";
import type { TaskContext } from "./types";

/**
 * Select the appropriate Claude model based on task context.
 *
 * Rules:
 * 1. Consistency checking and session processing ALWAYS use Sonnet (requires reasoning)
 * 2. For generation/expansion, respect user preference
 * 3. In "balanced" mode, use content length as tiebreaker
 */
export function selectModel(context: TaskContext): string {
  const { taskType, contentLength, requiresReasoning, userPreference } =
    context;

  // Tasks that ALWAYS need Sonnet regardless of preference
  if (taskType === "check" || taskType === "process") {
    return AI_CONFIG.models.quality;
  }

  // Explicit user preferences for generate/expand tasks
  if (userPreference === "speed") {
    return AI_CONFIG.models.fast;
  }

  if (userPreference === "quality") {
    return AI_CONFIG.models.quality;
  }

  // Balanced mode: use heuristics
  if (contentLength === "long" || requiresReasoning) {
    return AI_CONFIG.models.balanced;
  }

  return AI_CONFIG.models.fast;
}

/**
 * Get model display name for UI
 */
export function getModelDisplayName(modelId: string): string {
  if (modelId.includes("haiku")) {
    return "Haiku (Fast)";
  }
  if (modelId.includes("sonnet")) {
    return "Sonnet (Quality)";
  }
  return modelId;
}

/**
 * Estimate token usage category based on content length
 */
export function estimateContentLength(
  text: string
): "short" | "medium" | "long" {
  const wordCount = text.split(/\s+/).length;

  if (wordCount < 100) return "short";
  if (wordCount < 500) return "medium";
  return "long";
}
