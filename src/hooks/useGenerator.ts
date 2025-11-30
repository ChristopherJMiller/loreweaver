/**
 * useGenerator Hook
 *
 * Manages the entity generation flow:
 * 1. User triggers generation with context
 * 2. AI researches the world for contextual understanding (optional)
 * 3. AI generates entity (with streaming for progressive display)
 * 4. User previews and edits
 * 5. User accepts → entity is created
 */

import { useState, useCallback } from "react";
import {
  generateEntityWithResearch,
  type PartialEntity,
  type ResearchFindings,
} from "@/ai/agents";
import { initializeClient, isClientInitialized } from "@/ai/client";
import { invalidateCampaignSummary } from "@/ai/context";
import type { PageContext } from "@/ai/context/types";
import type {
  AgenticGenerationRequest,
  AgenticGenerationResult,
  GenerationQuality,
  SuggestedRelationship,
  ResearchStep,
} from "@/ai/agents/types";
import type { EntityType } from "@/types";
import {
  characters,
  locations,
  organizations,
  quests,
  relationships,
  search,
} from "@/lib/tauri";
import { useAIStore, type ModelPreference } from "@/stores/aiStore";

/**
 * Map model preference from settings to generation quality
 */
function preferenceToQuality(pref: ModelPreference): GenerationQuality {
  switch (pref) {
    case "speed":
      return "quick";
    case "quality":
      return "detailed";
    case "balanced":
    default:
      return "balanced";
  }
}

interface UseGeneratorOptions {
  /** Campaign ID to generate for */
  campaignId: string;

  /** Entity type to generate */
  entityType: EntityType;

  /** Callback after successful creation */
  onCreated?: (entityId: string) => void;
}

interface UseGeneratorReturn {
  /** Whether the preview dialog is open */
  isPreviewOpen: boolean;

  /** Open the preview dialog */
  openPreview: () => void;

  /** Close the preview dialog */
  closePreview: () => void;

  /** Whether generation is in progress (includes research + generation) */
  isLoading: boolean;

  /** Whether research phase is in progress */
  isResearching: boolean;

  /** Progress message from research phase (DEPRECATED) */
  researchProgress: string;

  /** Research steps for progress display */
  researchSteps: ResearchStep[];

  /** Current generation result */
  result: AgenticGenerationResult | null;

  /** Partial entity data during streaming (for progressive display) */
  partialEntity: PartialEntity | null;

  /** Research findings (if research was enabled) */
  researchFindings: ResearchFindings | null;

  /** Trigger generation with context, optional parentId, and optional pageContext */
  generate: (
    context: string,
    parentId?: string,
    pageContext?: PageContext
  ) => Promise<void>;

  /** Accept the generation and create the entity */
  accept: (data: {
    name: string;
    fields: Record<string, string>;
    relationships: SuggestedRelationship[];
  }) => Promise<void>;

  /** Regenerate with same settings */
  regenerate: () => Promise<void>;

  /** Error during creation */
  createError: string | null;

  /** Whether creation is in progress */
  isCreating: boolean;
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
    // Search for exact name match
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
async function createRelationships(
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
      // Target not found, skip this relationship
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
      // Log but don't fail the whole operation
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
  name: string,
  fields: Record<string, string>,
  parentId?: string
): Promise<string> {
  const baseData = { campaign_id: campaignId, name, ...fields };

  switch (entityType) {
    case "character":
      const char = await characters.create(baseData);
      return char.id;

    case "location":
      const loc = await locations.create({
        ...baseData,
        parent_id: parentId,
      });
      return loc.id;

    case "organization":
      const org = await organizations.create(baseData);
      return org.id;

    case "quest":
      const quest = await quests.create(baseData);
      return quest.id;

    default:
      throw new Error(`Creation not supported for entity type: ${entityType}`);
  }
}

export function useGenerator({
  campaignId,
  entityType,
  onCreated,
}: UseGeneratorOptions): UseGeneratorReturn {
  const apiKey = useAIStore((state) => state.apiKey);
  const modelPreference = useAIStore((state) => state.modelPreference);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState("");
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<AgenticGenerationResult | null>(null);
  const [partialEntity, setPartialEntity] = useState<PartialEntity | null>(null);
  const [researchFindings, setResearchFindings] =
    useState<ResearchFindings | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Store last generation request for regeneration
  const [lastRequest, setLastRequest] = useState<{
    context: string;
    parentId?: string;
    pageContext?: PageContext;
  } | null>(null);

  const generate = useCallback(
    async (context: string, parentId?: string, pageContext?: PageContext) => {
      setIsLoading(true);
      setIsResearching(true);
      setResearchProgress("");
      setResearchSteps([]);
      setResult(null);
      setPartialEntity(null);
      setResearchFindings(null);
      setCreateError(null);
      setIsPreviewOpen(true);
      setLastRequest({ context, parentId, pageContext });

      // Initialize client if needed
      if (!isClientInitialized() && apiKey) {
        initializeClient(apiKey);
      }

      // Get quality from settings
      const quality = preferenceToQuality(modelPreference);

      try {
        const request: AgenticGenerationRequest = {
          campaignId,
          entityType,
          context: context || undefined,
          quality,
          parentId,
          pageContext,
          enableResearch: true,
          maxResearchIterations: 5,
        };

        const generationResult = await generateEntityWithResearch(request, {
          onResearchStart: () => {
            setIsResearching(true);
            setResearchProgress("Starting research...");
          },
          onResearchProgress: (message) => {
            // Accumulate short progress snippets (deprecated, kept for compatibility)
            setResearchProgress((prev) => {
              const combined = prev + message;
              if (combined.length > 100) {
                return combined.slice(-100);
              }
              return combined;
            });
          },
          onResearchStep: (step) => {
            // Update or add research step
            setResearchSteps((prev) => {
              const existing = prev.findIndex((s) => s.id === step.id);
              if (existing >= 0) {
                // Update existing step status
                const updated = [...prev];
                updated[existing] = step;
                return updated;
              }
              // Add new step
              return [...prev, step];
            });
          },
          onResearchComplete: (findings) => {
            setIsResearching(false);
            setResearchFindings(findings);
            setResearchProgress("");
          },
          onGenerationStart: () => {
            setIsResearching(false);
          },
          onPartialEntity: (partial) => {
            setPartialEntity(partial);
          },
        });
        setResult(generationResult);
        setPartialEntity(null); // Clear partial once we have final result
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
        setIsResearching(false);
      }
    },
    [campaignId, entityType, modelPreference, apiKey]
  );

  const regenerate = useCallback(async () => {
    if (lastRequest) {
      await generate(
        lastRequest.context,
        lastRequest.parentId,
        lastRequest.pageContext
      );
    }
  }, [lastRequest, generate]);

  const accept = useCallback(
    async (data: {
      name: string;
      fields: Record<string, string>;
      relationships: SuggestedRelationship[];
    }) => {
      setIsCreating(true);
      setCreateError(null);

      try {
        // Create the entity (pass parentId for locations)
        const entityId = await createEntity(
          entityType,
          campaignId,
          data.name,
          data.fields,
          lastRequest?.parentId
        );

        // Create relationships if any were suggested
        if (data.relationships && data.relationships.length > 0) {
          await createRelationships(
            campaignId,
            entityType,
            entityId,
            data.relationships
          );
        }

        // Invalidate campaign summary cache
        invalidateCampaignSummary(campaignId);

        // Close preview and notify
        setIsPreviewOpen(false);
        setResult(null);
        onCreated?.(entityId);
      } catch (error) {
        setCreateError(
          error instanceof Error ? error.message : String(error)
        );
      } finally {
        setIsCreating(false);
      }
    },
    [campaignId, entityType, onCreated, lastRequest?.parentId]
  );

  return {
    isPreviewOpen,
    openPreview: () => setIsPreviewOpen(true),
    closePreview: () => {
      setIsPreviewOpen(false);
      setResult(null);
      setPartialEntity(null);
      setResearchFindings(null);
      setResearchProgress("");
      setResearchSteps([]);
    },
    isLoading,
    isResearching,
    researchProgress,
    researchSteps,
    result,
    partialEntity,
    researchFindings,
    generate,
    accept,
    regenerate,
    createError,
    isCreating,
  };
}
