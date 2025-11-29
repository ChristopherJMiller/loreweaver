/**
 * Zod Schemas for AI Structured Outputs
 *
 * These schemas serve three purposes:
 * 1. JSON Schema generation for Anthropic's structured outputs API
 * 2. Runtime validation of AI responses
 * 3. TypeScript type inference (via z.infer)
 *
 * Validation layers:
 * - Zod (here): Shape, enums, field constraints for AI output
 * - Rust validator: Final business rules at Tauri command layer
 */

import { z } from "zod";
import {
  LOCATION_TYPES,
  ORG_TYPES,
  QUEST_STATUS,
  PLOT_TYPES,
} from "@/lib/constants";

// Extract values for Zod enums
const locationTypeValues = LOCATION_TYPES.map((t) => t.value) as [string, ...string[]];
const orgTypeValues = ORG_TYPES.map((t) => t.value) as [string, ...string[]];
const questStatusValues = QUEST_STATUS.map((s) => s.value) as [string, ...string[]];
const plotTypeValues = PLOT_TYPES.map((p) => p.value) as [string, ...string[]];

// Field length constraints (matching Rust validation)
const MAX_NAME_LENGTH = 200;
const MAX_SHORT_FIELD = 200;
const MAX_TEXT_FIELD = 50000;

// ============ Shared Schemas ============

/**
 * Suggested relationship to another entity
 */
export const SuggestedRelationshipSchema = z.object({
  targetType: z.string(),
  targetName: z.string(),
  relationshipType: z.string(),
  description: z.string().optional(),
  isNewEntity: z.boolean().optional(),
});

/**
 * Base fields common to all entity outputs
 */
const BaseEntityOutputSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  reasoning: z.string(),
  relationships: z.array(SuggestedRelationshipSchema).optional(),
});

// ============ Entity-Specific Schemas ============

/**
 * Character generation output
 */
export const CharacterOutputSchema = BaseEntityOutputSchema.extend({
  fields: z.object({
    lineage: z.string().max(MAX_SHORT_FIELD).optional(),
    occupation: z.string().max(MAX_SHORT_FIELD).optional(),
    description: z.string().max(MAX_TEXT_FIELD).optional(),
    personality: z.string().max(MAX_TEXT_FIELD).optional(),
    motivations: z.string().max(MAX_TEXT_FIELD).optional(),
    secrets: z.string().max(MAX_TEXT_FIELD).optional(),
    voice_notes: z.string().max(MAX_TEXT_FIELD).optional(),
  }),
});

/**
 * Location generation output
 *
 * Note: Locations only have location_type and description in the database.
 * The AI should weave "known for" and "current state" content directly
 * into the description based on the location type.
 */
export const LocationOutputSchema = BaseEntityOutputSchema.extend({
  fields: z.object({
    location_type: z.enum(locationTypeValues),
    description: z.string().max(MAX_TEXT_FIELD).optional(),
  }),
});

/**
 * Organization generation output
 */
export const OrganizationOutputSchema = BaseEntityOutputSchema.extend({
  fields: z.object({
    org_type: z.enum(orgTypeValues),
    description: z.string().max(MAX_TEXT_FIELD).optional(),
    goals: z.string().max(MAX_TEXT_FIELD).optional(),
    resources: z.string().max(MAX_TEXT_FIELD).optional(),
  }),
});

/**
 * Quest generation output
 */
export const QuestOutputSchema = BaseEntityOutputSchema.extend({
  fields: z.object({
    plot_type: z.enum(plotTypeValues),
    status: z.enum(questStatusValues),
    description: z.string().max(MAX_TEXT_FIELD).optional(),
    hook: z.string().max(MAX_TEXT_FIELD).optional(),
    objectives: z.string().max(MAX_TEXT_FIELD).optional(),
  }),
});

// ============ Schema Registry ============

/**
 * Map entity type to its Zod schema
 */
export const EntityOutputSchemas = {
  character: CharacterOutputSchema,
  location: LocationOutputSchema,
  organization: OrganizationOutputSchema,
  quest: QuestOutputSchema,
} as const;

export type SupportedEntityType = keyof typeof EntityOutputSchemas;

/**
 * Get the Zod schema for an entity type
 */
export function getSchemaForEntityType(entityType: string) {
  return EntityOutputSchemas[entityType as SupportedEntityType];
}

// ============ Inferred Types ============

export type SuggestedRelationship = z.infer<typeof SuggestedRelationshipSchema>;
export type CharacterOutput = z.infer<typeof CharacterOutputSchema>;
export type LocationOutput = z.infer<typeof LocationOutputSchema>;
export type OrganizationOutput = z.infer<typeof OrganizationOutputSchema>;
export type QuestOutput = z.infer<typeof QuestOutputSchema>;

// Union type for any entity output
export type EntityOutput =
  | CharacterOutput
  | LocationOutput
  | OrganizationOutput
  | QuestOutput;

// ============ Future Agent Schemas ============

/**
 * Consistency check issue (for future Consistency Checker agent)
 */
export const ConsistencyIssueSchema = z.object({
  severity: z.enum(["error", "warning", "suggestion"]),
  field: z.string(),
  message: z.string(),
  conflictingEntityId: z.string().optional(),
  suggestion: z.string().optional(),
});

export const ConsistencyOutputSchema = z.object({
  issues: z.array(ConsistencyIssueSchema),
});

/**
 * Entity update proposal (for future Session Processor agent)
 */
export const EntityUpdateSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  entityType: z.string(),
  entityId: z.string().optional(),
  entityName: z.string(),
  changes: z.record(z.string(), z.string()).optional(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const SessionOutputSchema = z.object({
  updates: z.array(EntityUpdateSchema),
});

// Inferred types for future agents
export type ConsistencyIssue = z.infer<typeof ConsistencyIssueSchema>;
export type ConsistencyOutput = z.infer<typeof ConsistencyOutputSchema>;
export type EntityUpdate = z.infer<typeof EntityUpdateSchema>;
export type SessionOutput = z.infer<typeof SessionOutputSchema>;
