/**
 * Proposal Tracker
 *
 * Tracks entity proposals (create, update, relationship) within a chat session.
 * Similar to WorkItemTracker but for proposals requiring user approval.
 */

import type { EntityType } from "@/types";
import type { SuggestedRelationship } from "@/ai/agents/types";
import type {
  EntityProposal,
  CreateProposal,
  UpdateProposal,
  PatchProposal,
  FieldPatch,
  RelationshipProposal,
  ProposalStatus,
} from "@/ai/tools/entity-proposals/types";

/**
 * Callback fired when a proposal is created or updated
 */
export type ProposalCallback = (proposal: EntityProposal) => void;

/**
 * Tracks proposals for a chat session.
 * Each chat session gets its own tracker instance.
 */
export class ProposalTracker {
  private proposals: Map<string, EntityProposal> = new Map();
  private counter = 0;
  private onProposalCreated?: ProposalCallback;

  /**
   * Set callback for when proposals are created
   */
  setOnProposalCreated(callback: ProposalCallback): void {
    this.onProposalCreated = callback;
  }

  /**
   * Generate a unique proposal ID
   */
  private generateId(): string {
    return `proposal_${Date.now()}_${++this.counter}`;
  }

  /**
   * Add a create proposal
   */
  addCreateProposal(
    entityType: EntityType,
    data: { name: string; [key: string]: unknown },
    options?: {
      reasoning?: string;
      suggestedRelationships?: SuggestedRelationship[];
      parentId?: string;
    }
  ): CreateProposal {
    const id = this.generateId();
    const proposal: CreateProposal = {
      id,
      operation: "create",
      entityType,
      data,
      reasoning: options?.reasoning,
      suggestedRelationships: options?.suggestedRelationships,
      parentId: options?.parentId,
      createdAt: new Date(),
      status: "pending",
    };

    this.proposals.set(id, proposal);
    this.onProposalCreated?.(proposal);
    return proposal;
  }

  /**
   * Add an update proposal
   */
  addUpdateProposal(
    entityType: EntityType,
    entityId: string,
    changes: Record<string, unknown>,
    options?: {
      reasoning?: string;
      currentData?: Record<string, unknown>;
    }
  ): UpdateProposal {
    const id = this.generateId();
    const proposal: UpdateProposal = {
      id,
      operation: "update",
      entityType,
      entityId,
      changes,
      reasoning: options?.reasoning,
      currentData: options?.currentData,
      createdAt: new Date(),
      status: "pending",
    };

    this.proposals.set(id, proposal);
    this.onProposalCreated?.(proposal);
    return proposal;
  }

  /**
   * Add a patch proposal
   */
  addPatchProposal(
    entityType: EntityType,
    entityId: string,
    patches: FieldPatch[],
    options?: {
      reasoning?: string;
      currentData?: Record<string, unknown>;
      previewData?: Record<string, unknown>;
    }
  ): PatchProposal {
    const id = this.generateId();
    const proposal: PatchProposal = {
      id,
      operation: "patch",
      entityType,
      entityId,
      patches,
      reasoning: options?.reasoning,
      currentData: options?.currentData,
      previewData: options?.previewData,
      createdAt: new Date(),
      status: "pending",
    };

    this.proposals.set(id, proposal);
    this.onProposalCreated?.(proposal);
    return proposal;
  }

  /**
   * Add a relationship proposal
   */
  addRelationshipProposal(
    sourceType: EntityType,
    sourceId: string,
    sourceName: string,
    targetType: EntityType,
    targetId: string,
    targetName: string,
    relationshipType: string,
    options?: {
      description?: string;
      isBidirectional?: boolean;
      reasoning?: string;
    }
  ): RelationshipProposal {
    const id = this.generateId();
    const proposal: RelationshipProposal = {
      id,
      operation: "relationship",
      sourceType,
      sourceId,
      sourceName,
      targetType,
      targetId,
      targetName,
      relationshipType,
      description: options?.description,
      isBidirectional: options?.isBidirectional ?? true,
      reasoning: options?.reasoning,
      createdAt: new Date(),
      status: "pending",
    };

    this.proposals.set(id, proposal);
    this.onProposalCreated?.(proposal);
    return proposal;
  }

  /**
   * Get a proposal by ID
   */
  get(id: string): EntityProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Update a proposal's status
   */
  updateStatus(id: string, status: ProposalStatus): EntityProposal | null {
    const proposal = this.proposals.get(id);
    if (!proposal) return null;

    proposal.status = status;
    return proposal;
  }

  /**
   * List all proposals
   */
  list(): EntityProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get pending proposals
   */
  getPending(): EntityProposal[] {
    return this.list().filter((p) => p.status === "pending");
  }

  /**
   * Get accepted proposals
   */
  getAccepted(): EntityProposal[] {
    return this.list().filter((p) => p.status === "accepted");
  }

  /**
   * Check if there are any pending proposals
   */
  hasPending(): boolean {
    return this.getPending().length > 0;
  }

  /**
   * Clear all proposals
   */
  clear(): void {
    this.proposals.clear();
    this.counter = 0;
  }

  /**
   * Format a proposal as markdown for agent display
   */
  proposalToMarkdown(proposal: EntityProposal): string {
    const statusIcon =
      proposal.status === "accepted"
        ? "[Accepted]"
        : proposal.status === "rejected"
          ? "[Rejected]"
          : "[Pending]";

    if (proposal.operation === "create") {
      return `${statusIcon} Create ${proposal.entityType}: **${proposal.data.name}** (id: ${proposal.id})`;
    } else if (proposal.operation === "update") {
      const fields = Object.keys(proposal.changes).join(", ");
      return `${statusIcon} Update ${proposal.entityType} (${proposal.entityId}): fields [${fields}] (id: ${proposal.id})`;
    } else if (proposal.operation === "patch") {
      const fields = proposal.patches.map((p) => p.field).join(", ");
      return `${statusIcon} Patch ${proposal.entityType} (${proposal.entityId}): fields [${fields}] (id: ${proposal.id})`;
    } else {
      return `${statusIcon} Relationship: ${proposal.sourceName} → ${proposal.relationshipType} → ${proposal.targetName} (id: ${proposal.id})`;
    }
  }

  /**
   * Format all proposals as markdown summary
   */
  toMarkdown(): string {
    const proposals = this.list();
    if (proposals.length === 0) return "No proposals.";

    return proposals.map((p) => this.proposalToMarkdown(p)).join("\n");
  }
}
