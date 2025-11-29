/**
 * Shared Agent Types
 *
 * Common types used across all specialized agents.
 */

import type { EntityType } from "@/types";

/**
 * Quality level for generation
 */
export type GenerationQuality = "quick" | "balanced" | "detailed";

/**
 * Request for entity generation
 */
export interface GenerationRequest {
  /** Campaign to generate for */
  campaignId: string;

  /** Type of entity to generate */
  entityType: EntityType;

  /** User-provided context or requirements */
  context?: string;

  /** Related entity IDs to consider */
  relatedTo?: string[];

  /** Quality level (affects model choice and detail) */
  quality: GenerationQuality;
}

/**
 * Suggested relationship from generation
 */
export interface SuggestedRelationship {
  /** Target entity type */
  targetType: string;

  /** Target entity name (may be existing or suggested new) */
  targetName: string;

  /** Type of relationship */
  relationshipType: string;

  /** Optional description of the relationship */
  description?: string;

  /** Whether target exists (needs search) or is new */
  isNewEntity?: boolean;
}

/**
 * Result from entity generation
 */
export interface GenerationResult {
  /** Whether generation succeeded */
  success: boolean;

  /** Generated entity data */
  entity?: {
    /** Entity type */
    type: EntityType;

    /** Entity name */
    name: string;

    /** Entity fields (varies by type) */
    fields: Record<string, string>;
  };

  /** Suggested relationships to create */
  suggestedRelationships?: SuggestedRelationship[];

  /** AI's reasoning for its choices */
  reasoning?: string;

  /** Error message if failed */
  error?: string;

  /** Token usage for cost tracking */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Entity field schemas for each entity type
 * Used for prompting and validation
 */
export const ENTITY_FIELDS: Partial<Record<EntityType, string[]>> = {
  character: [
    "name",
    "lineage",
    "occupation",
    "description",
    "personality",
    "motivations",
    "secrets",
    "voice_notes",
  ],
  location: [
    "name",
    "location_type",
    "description",
    "known_for",
    "current_state",
  ],
  organization: [
    "name",
    "org_type",
    "description",
    "goals",
    "resources",
  ],
  quest: [
    "name",
    "plot_type",
    "status",
    "description",
    "objectives",
    "rewards",
  ],
  hero: [
    "name",
    "classes",
    "backstory",
    "notes",
  ],
  player: ["name", "email", "preferences", "boundaries", "notes"],
  session: [
    "session_number",
    "title",
    "summary",
    "notes",
  ],
  timeline_event: [
    "name",
    "event_date",
    "description",
  ],
  secret: [
    "name",
    "content",
    "secret_type",
    "reveal_conditions",
  ],
};
