/**
 * Entity Proposal Tools
 *
 * Tools for AI-proposed entity creation, updates, and relationships.
 * All proposals require user approval before execution.
 */

import type { ToolDefinition } from "../types";
import type { ProposalTracker } from "@/ai/proposals/tracker";
import { createProposeCreateTool } from "./propose-create";
import { createProposeUpdateTool } from "./propose-update";
import { createProposePatchTool } from "./propose-patch";
import { createProposeRelationshipTool } from "./propose-relationship";

/**
 * Create all entity proposal tools with a tracker instance
 *
 * @param tracker - ProposalTracker to store proposals
 * @returns Array of ToolDefinitions for propose_create, propose_update, propose_patch, propose_relationship
 */
export function createProposalTools(tracker: ProposalTracker): ToolDefinition[] {
  return [
    createProposeCreateTool(tracker),
    createProposeUpdateTool(tracker),
    createProposePatchTool(tracker),
    createProposeRelationshipTool(tracker),
  ];
}

// Re-export types
export type {
  EntityProposal,
  CreateProposal,
  UpdateProposal,
  PatchProposal,
  FieldPatch,
  RelationshipProposal,
  ProposalOperation,
  ProposalStatus,
  ProposeCreateInput,
  ProposeUpdateInput,
  ProposePatchInput,
  ProposeRelationshipInput,
} from "./types";

export {
  isCreateProposal,
  isUpdateProposal,
  isPatchProposal,
  isRelationshipProposal,
  CREATABLE_ENTITY_TYPES,
  UPDATABLE_ENTITY_TYPES,
} from "./types";

// Re-export individual tool factories
export { createProposeCreateTool } from "./propose-create";
export { createProposeUpdateTool } from "./propose-update";
export { createProposePatchTool } from "./propose-patch";
export { createProposeRelationshipTool } from "./propose-relationship";
