/**
 * Shared Agent Types
 *
 * Common types used across all specialized agents.
 */

import type { EntityType } from "@/types";
import type { PageContext } from "@/ai/context/types";

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

  /** Parent location ID (for location entities) */
  parentId?: string;
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

  /** Number of generation attempts made */
  attempts?: number;

  /** Token usage for cost tracking */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Entity field schemas for each entity type
 * Used for prompting and validation.
 *
 * These should match the Zod schemas in src/ai/schemas/index.ts
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
    "hook",
    "objectives",
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

// =============================================================================
// Agentic Generator Types (Two-Phase: Research → Generate)
// =============================================================================

/**
 * Research findings from the pre-generation agent
 *
 * The research phase uses tool calling to gather rich context
 * before the structured generation phase.
 */
export interface ResearchFindings {
  /** Markdown summary of research conducted */
  summary: string;

  /** Parent/containing entity details (for hierarchical generation) */
  parentContext?: {
    id: string;
    type: EntityType;
    name: string;
    description: string;
    locationType?: string;
  };

  /** Location hierarchy chain (root to current) */
  locationHierarchy?: Array<{
    id: string;
    name: string;
    locationType: string;
    brief: string;
  }>;

  /** Related entities discovered during research */
  relatedEntities: Array<{
    id: string;
    type: EntityType;
    name: string;
    relevance: string;
    brief: string;
  }>;

  /** Faction/organization context */
  factionContext?: Array<{
    id: string;
    name: string;
    type: string;
    influence: string;
  }>;

  /** Cultural notes extracted from research */
  culturalNotes?: string;

  /** Existing entities of same type (to avoid duplication) */
  existingOfType?: Array<{
    id: string;
    name: string;
    brief: string;
  }>;

  /** Token usage for research phase */
  researchUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Extended generation request with research options
 */
export interface AgenticGenerationRequest extends GenerationRequest {
  /** Whether to run research phase (default: true) */
  enableResearch?: boolean;

  /** Maximum research iterations/tool calls (default: 5) */
  maxResearchIterations?: number;

  /** PageContext from current view for starting research */
  pageContext?: PageContext;
}

/**
 * Extended generation result with research info
 */
export interface AgenticGenerationResult extends GenerationResult {
  /** Research findings (if research was enabled) */
  research?: ResearchFindings;

  /** Combined token usage (research + generation) */
  totalUsage?: {
    inputTokens: number;
    outputTokens: number;
    researchTokens: number;
    generationTokens: number;
  };
}

/**
 * Partial entity for streaming display
 */
export interface PartialEntity {
  name?: string;
  fields?: Record<string, string | undefined>;
  relationships?: Array<{
    targetType?: string;
    targetName?: string;
    relationshipType?: string;
    description?: string;
    isNewEntity?: boolean;
  }>;
  reasoning?: string;
}

/**
 * Callbacks for generation streaming (base)
 */
export interface GeneratorCallbacks {
  /** Called with parsed partial entity data as JSON streams in */
  onPartialEntity?: (partial: PartialEntity) => void;
}

/**
 * Research step for progress tracking
 */
export interface ResearchStep {
  /** Unique ID for this step */
  id: string;
  /** Human-readable action description */
  action: string;
  /** Current status */
  status: "running" | "complete";
  /** Original tool name (for debugging) */
  toolName?: string;
}

/**
 * Extended callbacks for agentic generation with research
 */
export interface AgenticGeneratorCallbacks extends GeneratorCallbacks {
  /** Called when research phase starts */
  onResearchStart?: () => void;

  /** Called with research progress updates (tool calls, thinking) - DEPRECATED: use onResearchStep */
  onResearchProgress?: (message: string) => void;

  /** Called when a research step starts or completes */
  onResearchStep?: (step: ResearchStep) => void;

  /** Called when research phase completes */
  onResearchComplete?: (findings: ResearchFindings) => void;

  /** Called when generation phase starts */
  onGenerationStart?: () => void;
}
