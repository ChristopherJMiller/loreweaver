/**
 * Entity Proposal Types
 *
 * Types for AI-proposed entity creation and updates that require user approval.
 */

import type { EntityType } from "@/types";
import type { SuggestedRelationship } from "@/ai/agents/types";

/**
 * Operation type for proposals
 */
export type ProposalOperation = "create" | "update" | "relationship";

/**
 * Status of a proposal
 */
export type ProposalStatus = "pending" | "accepted" | "rejected";

/**
 * Base proposal interface
 */
export interface BaseProposal {
  /** Unique identifier for this proposal */
  id: string;

  /** Type of operation */
  operation: ProposalOperation;

  /** AI's reasoning for this proposal */
  reasoning?: string;

  /** Timestamp when proposal was created */
  createdAt: Date;

  /** Current status of the proposal */
  status: ProposalStatus;
}

/**
 * Proposal for creating a new entity
 */
export interface CreateProposal extends BaseProposal {
  operation: "create";

  /** Entity type being created */
  entityType: EntityType;

  /** Proposed entity data */
  data: {
    name: string;
    [key: string]: unknown;
  };

  /** Suggested relationships to create with the entity */
  suggestedRelationships?: SuggestedRelationship[];

  /** Parent ID for hierarchical entities (e.g., locations) */
  parentId?: string;
}

/**
 * Proposal for updating an existing entity
 */
export interface UpdateProposal extends BaseProposal {
  operation: "update";

  /** Entity type being updated */
  entityType: EntityType;

  /** ID of entity to update */
  entityId: string;

  /** Proposed changes (partial data) */
  changes: Record<string, unknown>;

  /** Current entity data for diff display */
  currentData?: Record<string, unknown>;
}

/**
 * Proposal for creating a relationship between entities
 */
export interface RelationshipProposal extends BaseProposal {
  operation: "relationship";

  /** Source entity type */
  sourceType: EntityType;

  /** Source entity ID */
  sourceId: string;

  /** Source entity name (for display) */
  sourceName: string;

  /** Target entity type */
  targetType: EntityType;

  /** Target entity ID */
  targetId: string;

  /** Target entity name (for display) */
  targetName: string;

  /** Type of relationship */
  relationshipType: string;

  /** Optional description */
  description?: string;

  /** Whether the relationship goes both ways */
  isBidirectional: boolean;
}

/**
 * Union type for all proposal types
 */
export type EntityProposal = CreateProposal | UpdateProposal | RelationshipProposal;

/**
 * Input for propose_create tool
 */
export interface ProposeCreateInput {
  entity_type: EntityType;
  data: {
    name: string;
    [key: string]: unknown;
  };
  reasoning?: string;
  suggested_relationships?: Array<{
    target_type: string;
    target_name: string;
    relationship_type: string;
    description?: string;
    is_new_entity?: boolean;
  }>;
  parent_id?: string;
}

/**
 * Input for propose_update tool
 */
export interface ProposeUpdateInput {
  entity_type: EntityType;
  entity_id: string;
  changes: Record<string, unknown>;
  reasoning?: string;
}

/**
 * Input for propose_relationship tool
 */
export interface ProposeRelationshipInput {
  source_type: EntityType;
  source_id: string;
  target_type: EntityType;
  target_id: string;
  relationship_type: string;
  description?: string;
  is_bidirectional?: boolean;
  reasoning?: string;
}

/**
 * Type guard for CreateProposal
 */
export function isCreateProposal(
  proposal: EntityProposal
): proposal is CreateProposal {
  return proposal.operation === "create";
}

/**
 * Type guard for UpdateProposal
 */
export function isUpdateProposal(
  proposal: EntityProposal
): proposal is UpdateProposal {
  return proposal.operation === "update";
}

/**
 * Type guard for RelationshipProposal
 */
export function isRelationshipProposal(
  proposal: EntityProposal
): proposal is RelationshipProposal {
  return proposal.operation === "relationship";
}

/**
 * Entity types that support creation
 */
export const CREATABLE_ENTITY_TYPES: EntityType[] = [
  "character",
  "location",
  "organization",
  "quest",
  "hero",
  "player",
  "session",
  "timeline_event",
  "secret",
];

/**
 * Entity types that support updates
 */
export const UPDATABLE_ENTITY_TYPES: EntityType[] = [
  "campaign",
  "character",
  "location",
  "organization",
  "quest",
  "hero",
  "player",
  "session",
  "timeline_event",
  "secret",
];
