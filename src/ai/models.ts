/**
 * Model Configuration
 *
 * Re-exports model selection with simpler interface for the agent layer.
 */

import { AI_CONFIG, type QualityPreference } from "./config";

export type ModelPreference = QualityPreference;

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
}

export const MODEL_CONFIGS: Record<ModelPreference, ModelConfig> = {
  speed: {
    id: AI_CONFIG.models.fast,
    name: "Haiku",
    description: "Fast responses, lower cost. Best for simple lookups.",
  },
  balanced: {
    id: AI_CONFIG.models.balanced,
    name: "Sonnet",
    description: "Balanced speed and quality. Good for most tasks.",
  },
  quality: {
    id: AI_CONFIG.models.quality,
    name: "Sonnet",
    description: "Highest quality. Best for complex analysis.",
  },
};

/**
 * Get the model ID for a given preference
 */
export function selectModel(preference: ModelPreference): string {
  return MODEL_CONFIGS[preference].id;
}
