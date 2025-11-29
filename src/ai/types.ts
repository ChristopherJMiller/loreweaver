/**
 * AI Layer Type Definitions
 *
 * TypeScript interfaces for AI operations, tool inputs/outputs,
 * and agent interactions.
 */

import type { ModelTier, QualityPreference } from "./config";

// Re-export for convenience
export type { ModelTier, QualityPreference } from "./config";

// ============================================================================
// Client Types
// ============================================================================

export interface AIClientConfig {
  apiKey: string;
  modelTier?: ModelTier;
}

export interface AIQueryOptions {
  prompt: string;
  systemPrompt?: string;
  maxTurns?: number;
  useCampaignContext?: boolean;
  campaignId?: string;
}

// ============================================================================
// Model Selection Types
// ============================================================================

export type TaskType = "generate" | "expand" | "check" | "process";

export interface TaskContext {
  taskType: TaskType;
  contentLength: "short" | "medium" | "long";
  requiresReasoning: boolean;
  userPreference: QualityPreference;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

export type EntityType =
  | "character"
  | "location"
  | "organization"
  | "quest"
  | "hero"
  | "player"
  | "session"
  | "timeline_event"
  | "secret";

export interface SearchEntitiesInput {
  campaign_id: string;
  query: string;
  entity_types?: EntityType[];
  limit?: number;
}

export interface GetEntityInput {
  entity_type: EntityType;
  entity_id: string;
}

export interface GetRelationshipsInput {
  entity_type: EntityType;
  entity_id: string;
  relationship_types?: string[];
}

export interface GetLocationHierarchyInput {
  location_id: string;
  depth?: number;
}

export interface GetTimelineInput {
  campaign_id: string;
  entity_type?: EntityType;
  entity_id?: string;
  limit?: number;
}

export interface GetCampaignContextInput {
  campaign_id: string;
}

// ============================================================================
// Content Bridge Types (for M6 agent integration)
// ============================================================================

export interface EntityMarkdownFormat {
  frontmatter: Record<string, unknown>;
  sections: Record<string, string>;
}

export interface ContentPatch {
  op: "replace" | "insert" | "delete";
  path: string;
  value?: string;
  after?: string;
}
