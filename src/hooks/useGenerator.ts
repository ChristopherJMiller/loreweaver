/**
 * useGenerator Hook
 *
 * Manages the entity generation flow:
 * 1. User triggers generation with context
 * 2. AI generates entity
 * 3. User previews and edits
 * 4. User accepts → entity is created
 */

import { useState, useCallback } from "react";
import { generateEntity } from "@/ai/agents";
import { invalidateCampaignSummary } from "@/ai/context";
import type {
  GenerationRequest,
  GenerationResult,
  GenerationQuality,
  SuggestedRelationship,
} from "@/ai/agents/types";
import type { EntityType } from "@/types";
import {
  characters,
  locations,
  organizations,
  quests,
} from "@/lib/tauri";

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

  /** Whether generation is in progress */
  isLoading: boolean;

  /** Current generation result */
  result: GenerationResult | null;

  /** Trigger generation with context and quality */
  generate: (context: string, quality: GenerationQuality) => Promise<void>;

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
 * Create entity using the appropriate Tauri command
 */
async function createEntity(
  entityType: EntityType,
  campaignId: string,
  name: string,
  fields: Record<string, string>
): Promise<string> {
  const baseData = { campaign_id: campaignId, name, ...fields };

  switch (entityType) {
    case "character":
      const char = await characters.create(baseData);
      return char.id;

    case "location":
      const loc = await locations.create(baseData);
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Store last generation request for regeneration
  const [lastRequest, setLastRequest] = useState<{
    context: string;
    quality: GenerationQuality;
  } | null>(null);

  const generate = useCallback(
    async (context: string, quality: GenerationQuality) => {
      setIsLoading(true);
      setResult(null);
      setCreateError(null);
      setIsPreviewOpen(true);
      setLastRequest({ context, quality });

      try {
        const request: GenerationRequest = {
          campaignId,
          entityType,
          context: context || undefined,
          quality,
        };

        const generationResult = await generateEntity(request);
        setResult(generationResult);
      } catch (error) {
        setResult({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [campaignId, entityType]
  );

  const regenerate = useCallback(async () => {
    if (lastRequest) {
      await generate(lastRequest.context, lastRequest.quality);
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
        // Create the entity
        const entityId = await createEntity(
          entityType,
          campaignId,
          data.name,
          data.fields
        );

        // TODO: Create relationships if any
        // This would require looking up target entities by name
        // and creating relationship records

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
    [campaignId, entityType, onCreated]
  );

  return {
    isPreviewOpen,
    openPreview: () => setIsPreviewOpen(true),
    closePreview: () => {
      setIsPreviewOpen(false);
      setResult(null);
    },
    isLoading,
    result,
    generate,
    accept,
    regenerate,
    createError,
    isCreating,
  };
}
