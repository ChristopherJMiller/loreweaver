/**
 * Generator Agent
 *
 * Creates new entities using AI with structured output.
 * Uses Anthropic's structured outputs beta for guaranteed JSON format,
 * with Zod validation for semantic correctness.
 * Supports streaming with partial JSON parsing for progressive display.
 */

import { z } from "zod";
import { parse as parsePartialJson, Allow } from "partial-json";
import { createStructuredMessageStream, type MessageParam } from "../client";
import { getCampaignSummary, formatCampaignSummary } from "../context";
import type {
  GenerationRequest,
  GenerationResult,
  GenerationQuality,
} from "./types";
import { ENTITY_FIELDS } from "./types";
import { getEntityPrompt } from "./generator/prompts";
import {
  getSchemaForEntityType,
  type EntityOutput,
} from "../schemas";
import type { EntityType } from "@/types";

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
 * Callbacks for generation streaming
 */
export interface GeneratorCallbacks {
  /** Called with parsed partial entity data as JSON streams in */
  onPartialEntity?: (partial: PartialEntity) => void;
}

/** Maximum validation retries (2 retries = 3 total attempts) */
const MAX_VALIDATION_RETRIES = 2;

/**
 * Get model for structured output generation.
 *
 * Note: Always uses Sonnet because Haiku doesn't support structured outputs
 * (output_format) yet. When Haiku gains support, we can restore quality-based
 * model selection.
 */
function getModelForStructuredOutput(): string {
  // Haiku doesn't support output_format yet, always use Sonnet
  return "claude-sonnet-4-5-20250929";
}

/**
 * Build system prompt for generation
 */
function buildSystemPrompt(
  campaignContext: string,
  entityType: EntityType,
  quality: GenerationQuality
): string {
  const detailLevel =
    quality === "quick"
      ? "Keep it brief and practical."
      : quality === "detailed"
        ? "Be thorough and creative. Include rich details, hooks, and connections."
        : "Balance detail with practicality.";

  // Get entity-specific guidance
  const entityGuidance = getEntityPrompt(entityType);

  return `You are a creative worldbuilding assistant for tabletop RPGs.

## Campaign Context
${campaignContext}

## Your Task
Generate a new ${entityType} that fits naturally into this world.

${entityGuidance}

## Guidelines
1. **Consistency** - Your creation must fit the established world tone and facts
2. **Hooks** - Include story hooks and connections to existing elements
3. **Specificity** - Be concrete, not generic. Give unique details.
4. **${detailLevel}**

## Output Format
Respond with a JSON object containing:
- name: The entity's name (1-200 characters)
- fields: Entity-specific fields matching the schema
- relationships: Optional array of suggested relationships to other entities
- reasoning: Brief explanation of your creative choices
`;
}

/**
 * Build user prompt for generation
 */
function buildUserPrompt(
  entityType: EntityType,
  context?: string,
  relatedEntities?: string[]
): string {
  const lines: string[] = [];

  lines.push(`Generate a ${entityType}.`);

  if (context) {
    lines.push("");
    lines.push("User's requirements:");
    lines.push(context);
  }

  if (relatedEntities && relatedEntities.length > 0) {
    lines.push("");
    lines.push("Should relate to these existing entities:");
    for (const entity of relatedEntities) {
      lines.push(`- ${entity}`);
    }
  }

  lines.push("");
  lines.push(`Available fields for ${entityType}:`);
  const fields = ENTITY_FIELDS[entityType] || [];
  lines.push(fields.join(", "));

  return lines.join("\n");
}

/**
 * Format Zod validation errors for retry feedback
 */
function formatZodError(error: z.ZodError): string {
  const issues = error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  return `Your output has validation errors:\n${issues}\n\nPlease fix these issues and try again.`;
}

/**
 * Generate a new entity using AI with streaming support
 *
 * Uses Anthropic's structured outputs for guaranteed JSON format,
 * with Zod validation for semantic correctness (enum values, field lengths).
 * Streams partial JSON to callbacks for progressive UI display.
 * Includes automatic retry loop if validation fails.
 */
export async function generateEntity(
  request: GenerationRequest,
  callbacks?: GeneratorCallbacks
): Promise<GenerationResult> {
  try {
    // Get the Zod schema for this entity type
    const schema = getSchemaForEntityType(request.entityType);
    if (!schema) {
      return {
        success: false,
        error: `Unsupported entity type for generation: ${request.entityType}`,
      };
    }

    // Get campaign context for injection
    const campaignSummary = await getCampaignSummary(request.campaignId);
    const campaignContext = formatCampaignSummary(campaignSummary);

    // Select model for structured output (always Sonnet for now)
    const model = getModelForStructuredOutput();

    // Build prompts
    const systemPrompt = buildSystemPrompt(
      campaignContext,
      request.entityType,
      request.quality
    );
    const userPrompt = buildUserPrompt(
      request.entityType,
      request.context,
      request.relatedTo
    );

    // Track token usage across attempts
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build message history for multi-turn retry
    let messages: MessageParam[] = [{ role: "user", content: userPrompt }];
    let attempts = 0;
    let lastRawOutput = "";

    // Retry loop with validation
    while (attempts < MAX_VALIDATION_RETRIES + 1) {
      attempts++;

      try {
        // Call Claude with streaming structured output
        const response = await createStructuredMessageStream({
          model,
          system: systemPrompt,
          messages,
          schema,
          maxTokens: 2048,
          onTextDelta: (_delta, accumulated) => {
            // Try to parse partial JSON for streaming display
            if (callbacks?.onPartialEntity) {
              try {
                const partial = parsePartialJson(
                  accumulated,
                  Allow.STR | Allow.OBJ | Allow.ARR | Allow.BOOL
                ) as PartialEntity;
                callbacks.onPartialEntity(partial);
              } catch {
                // Partial JSON not yet parseable, that's expected during streaming
              }
            }
          },
        });

        // Accumulate token usage
        totalInputTokens += response.usage.input_tokens;
        totalOutputTokens += response.usage.output_tokens;

        // Store raw output for potential retry
        lastRawOutput = response.raw;

        // Zod validation passed - build success result
        const data = response.data as EntityOutput;

        return {
          success: true,
          entity: {
            type: request.entityType,
            name: data.name,
            fields: data.fields as Record<string, string>,
          },
          suggestedRelationships: data.relationships?.map((rel) => ({
            targetType: rel.targetType,
            targetName: rel.targetName,
            relationshipType: rel.relationshipType,
            description: rel.description,
            isNewEntity: rel.isNewEntity,
          })),
          reasoning: data.reasoning,
          attempts,
          usage: {
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
          },
        };
      } catch (error) {
        if (error instanceof z.ZodError) {
          // Zod validation failed - retry with feedback
          if (attempts >= MAX_VALIDATION_RETRIES + 1) {
            // Max retries exceeded
            return {
              success: false,
              error: `Validation failed after ${attempts} attempts: ${error.issues.map((i) => i.message).join(", ")}`,
              attempts,
              usage: {
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
              },
            };
          }

          // Build retry messages with validation feedback
          const feedback = formatZodError(error);
          messages = [
            ...messages,
            { role: "assistant", content: lastRawOutput || "{}" },
            { role: "user", content: feedback },
          ];
          continue;
        }

        // Re-throw non-Zod errors
        throw error;
      }
    }

    // Should not reach here, but handle edge case
    return {
      success: false,
      error: `Generation failed after ${attempts} attempts`,
      attempts,
      usage: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
