/**
 * useProposalHandler Hook
 *
 * Handles proposal acceptance, rejection, and execution.
 * Creates entities, updates, and relationships via Tauri commands.
 */

import { useState, useCallback } from "react";
import { invalidateCampaignSummary } from "@/ai/context";
import {
  markdownToProsemirror,
  textToProsemirror,
  looksLikeMarkdown,
} from "@/ai/utils/content-bridge";
import type {
  EntityProposal,
  CreateProposal,
  UpdateProposal,
  RelationshipProposal,
} from "@/ai/tools/entity-proposals/types";
import {
  isCreateProposal,
  isUpdateProposal,
  isRelationshipProposal,
} from "@/ai/tools/entity-proposals/types";
import type { EntityType } from "@/types";
import type { SuggestedRelationship } from "@/ai/agents/types";
import {
  characters,
  locations,
  organizations,
  quests,
  heroes,
  players,
  sessions,
  timelineEvents,
  secrets,
  relationships,
  campaigns,
  search,
} from "@/lib/tauri";

/**
 * Fields that should be treated as rich text and converted from markdown
 */
const RICH_TEXT_FIELDS = new Set([
  "description",
  "personality",
  "motivations",
  "secrets",
  "voice_notes",
  "backstory",
  "notes",
  "goals",
  "resources",
  "objectives",
  "hook",
  "summary",
  "content",
  "gm_notes",
  "highlights",
  "reveal_conditions",
  "preferences",
  "boundaries",
]);

/**
 * Convert markdown fields to ProseMirror JSON for database storage
 */
function convertRichTextFields(
  data: Record<string, unknown>
): Record<string, unknown> {
  const converted = { ...data };

  for (const [field, value] of Object.entries(converted)) {
    if (RICH_TEXT_FIELDS.has(field) && typeof value === "string" && value.trim()) {
      // Convert to ProseMirror JSON based on content
      const prosemirrorJson = looksLikeMarkdown(value)
        ? markdownToProsemirror(value)
        : textToProsemirror(value);
      converted[field] = JSON.stringify(prosemirrorJson);
    }
  }

  return converted;
}

interface UseProposalHandlerOptions {
  /** Campaign ID for operations */
  campaignId: string;

  /** Callback when a proposal is accepted */
  onAccepted?: (proposalId: string, entityId?: string) => void;

  /** Callback when a proposal is rejected */
  onRejected?: (proposalId: string) => void;

  /** Callback when an error occurs */
  onError?: (error: string) => void;
}

interface UseProposalHandlerReturn {
  /** Accept and execute a proposal */
  acceptProposal: (
    proposal: EntityProposal,
    editedData?: Record<string, unknown>
  ) => Promise<void>;

  /** Reject a proposal */
  rejectProposal: (proposalId: string) => void;

  /** Whether an operation is in progress */
  isProcessing: boolean;

  /** Current error message */
  error: string | null;

  /** Clear current error */
  clearError: () => void;
}

/**
 * Try to find an existing entity by name and type
 * Returns the entity ID if found, null otherwise
 */
async function findEntityByName(
  campaignId: string,
  entityType: string,
  name: string
): Promise<string | null> {
  try {
    const results = await search.entities({
      campaign_id: campaignId,
      query: name,
      entity_types: [entityType as EntityType],
      limit: 10,
    });

    // Find exact match (case-insensitive)
    const exactMatch = results.find(
      (r) => r.name.toLowerCase() === name.toLowerCase()
    );

    return exactMatch?.entity_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Create relationships for a newly created entity
 * Silently skips relationships where target entity cannot be found
 */
async function createRelationshipsForEntity(
  campaignId: string,
  sourceType: EntityType,
  sourceId: string,
  suggestedRelationships: SuggestedRelationship[]
): Promise<void> {
  for (const rel of suggestedRelationships) {
    // Skip if marked as new entity (we don't auto-create entities)
    if (rel.isNewEntity) {
      continue;
    }

    // Try to find the target entity
    const targetId = await findEntityByName(
      campaignId,
      rel.targetType,
      rel.targetName
    );

    if (!targetId) {
      console.log(
        `Skipping relationship: ${rel.targetType} "${rel.targetName}" not found`
      );
      continue;
    }

    try {
      await relationships.create({
        campaign_id: campaignId,
        source_type: sourceType,
        source_id: sourceId,
        target_type: rel.targetType as EntityType,
        target_id: targetId,
        relationship_type: rel.relationshipType,
        description: rel.description,
        is_bidirectional: true,
      });
    } catch (error) {
      console.error(`Failed to create relationship to ${rel.targetName}:`, error);
    }
  }
}

/**
 * Create entity using the appropriate Tauri command
 */
async function createEntity(
  entityType: EntityType,
  campaignId: string,
  data: Record<string, unknown>,
  parentId?: string
): Promise<string> {
  const baseData = { campaign_id: campaignId, ...data };

  switch (entityType) {
    case "character": {
      const entity = await characters.create(baseData as Parameters<typeof characters.create>[0]);
      return entity.id;
    }
    case "location": {
      const entity = await locations.create({
        ...baseData,
        parent_id: parentId,
      } as Parameters<typeof locations.create>[0]);
      return entity.id;
    }
    case "organization": {
      const entity = await organizations.create(baseData as Parameters<typeof organizations.create>[0]);
      return entity.id;
    }
    case "quest": {
      const entity = await quests.create(baseData as Parameters<typeof quests.create>[0]);
      return entity.id;
    }
    case "hero": {
      const entity = await heroes.create(baseData as Parameters<typeof heroes.create>[0]);
      return entity.id;
    }
    case "player": {
      const entity = await players.create(baseData as Parameters<typeof players.create>[0]);
      return entity.id;
    }
    case "session": {
      const entity = await sessions.create(baseData as Parameters<typeof sessions.create>[0]);
      return entity.id;
    }
    case "timeline_event": {
      const entity = await timelineEvents.create(baseData as Parameters<typeof timelineEvents.create>[0]);
      return entity.id;
    }
    case "secret": {
      const entity = await secrets.create(baseData as Parameters<typeof secrets.create>[0]);
      return entity.id;
    }
    default:
      throw new Error(`Creation not supported for entity type: ${entityType}`);
  }
}

/**
 * Update entity using the appropriate Tauri command
 */
async function updateEntity(
  entityType: EntityType,
  entityId: string,
  changes: Record<string, unknown>
): Promise<void> {
  const updateData = { id: entityId, ...changes };

  switch (entityType) {
    case "campaign":
      await campaigns.update(updateData as Parameters<typeof campaigns.update>[0]);
      break;
    case "character":
      await characters.update(updateData as Parameters<typeof characters.update>[0]);
      break;
    case "location":
      await locations.update(updateData as Parameters<typeof locations.update>[0]);
      break;
    case "organization":
      await organizations.update(updateData as Parameters<typeof organizations.update>[0]);
      break;
    case "quest":
      await quests.update(updateData as Parameters<typeof quests.update>[0]);
      break;
    case "hero":
      await heroes.update(updateData as Parameters<typeof heroes.update>[0]);
      break;
    case "player":
      await players.update(updateData as Parameters<typeof players.update>[0]);
      break;
    case "session":
      await sessions.update(updateData as Parameters<typeof sessions.update>[0]);
      break;
    case "timeline_event":
      await timelineEvents.update(updateData as Parameters<typeof timelineEvents.update>[0]);
      break;
    case "secret":
      await secrets.update(updateData as Parameters<typeof secrets.update>[0]);
      break;
    default:
      throw new Error(`Update not supported for entity type: ${entityType}`);
  }
}

/**
 * Execute a create proposal
 */
async function executeCreateProposal(
  proposal: CreateProposal,
  campaignId: string,
  editedData?: Record<string, unknown>
): Promise<string> {
  const rawData = editedData ?? proposal.data;

  // Convert rich text fields from markdown to ProseMirror JSON
  const data = convertRichTextFields(rawData);

  // Create the entity
  const entityId = await createEntity(
    proposal.entityType,
    campaignId,
    data,
    proposal.parentId
  );

  // Create relationships if any were suggested
  if (proposal.suggestedRelationships && proposal.suggestedRelationships.length > 0) {
    await createRelationshipsForEntity(
      campaignId,
      proposal.entityType,
      entityId,
      proposal.suggestedRelationships
    );
  }

  return entityId;
}

/**
 * Execute an update proposal
 */
async function executeUpdateProposal(
  proposal: UpdateProposal,
  editedData?: Record<string, unknown>
): Promise<void> {
  const rawChanges = editedData ?? proposal.changes;

  // Convert rich text fields from markdown to ProseMirror JSON
  const changes = convertRichTextFields(rawChanges);

  await updateEntity(proposal.entityType, proposal.entityId, changes);
}

/**
 * Execute a relationship proposal
 */
async function executeRelationshipProposal(
  proposal: RelationshipProposal,
  campaignId: string
): Promise<void> {
  await relationships.create({
    campaign_id: campaignId,
    source_type: proposal.sourceType,
    source_id: proposal.sourceId,
    target_type: proposal.targetType,
    target_id: proposal.targetId,
    relationship_type: proposal.relationshipType,
    description: proposal.description,
    is_bidirectional: proposal.isBidirectional,
  });
}

export function useProposalHandler({
  campaignId,
  onAccepted,
  onRejected,
  onError,
}: UseProposalHandlerOptions): UseProposalHandlerReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptProposal = useCallback(
    async (proposal: EntityProposal, editedData?: Record<string, unknown>) => {
      setIsProcessing(true);
      setError(null);

      try {
        let entityId: string | undefined;

        if (isCreateProposal(proposal)) {
          entityId = await executeCreateProposal(proposal, campaignId, editedData);
        } else if (isUpdateProposal(proposal)) {
          await executeUpdateProposal(proposal, editedData);
          entityId = proposal.entityId;
        } else if (isRelationshipProposal(proposal)) {
          await executeRelationshipProposal(proposal, campaignId);
        }

        // Invalidate campaign summary cache
        invalidateCampaignSummary(campaignId);

        onAccepted?.(proposal.id, entityId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    },
    [campaignId, onAccepted, onError]
  );

  const rejectProposal = useCallback(
    (proposalId: string) => {
      onRejected?.(proposalId);
    },
    [onRejected]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    acceptProposal,
    rejectProposal,
    isProcessing,
    error,
    clearError,
  };
}
