/**
 * Generator Agent
 *
 * Creates new entities using AI with structured output.
 * Uses transactional mode: single request → structured response → preview.
 */

import { createMessage, type Tool } from "../client";
import { getCampaignSummary, formatCampaignSummary } from "../context";
import { selectModel } from "../model-selector";
import type {
  GenerationRequest,
  GenerationResult,
  SuggestedRelationship,
  GenerationQuality,
} from "./types";
import { ENTITY_FIELDS } from "./types";
import { getEntityPrompt } from "./generator/prompts";
import type { EntityType } from "@/types";
import type { TaskContext, QualityPreference } from "../types";

/**
 * Tool for structured entity output
 */
const SUBMIT_ENTITY_TOOL: Tool = {
  name: "submit_entity",
  description:
    "Submit the generated entity. You MUST call this tool to complete the generation.",
  input_schema: {
    type: "object" as const,
    properties: {
      name: {
        type: "string",
        description: "The entity's name",
      },
      fields: {
        type: "object",
        description:
          "Entity-specific fields. Keys should match the entity type schema.",
        additionalProperties: { type: "string" },
      },
      relationships: {
        type: "array",
        description: "Suggested relationships to other entities",
        items: {
          type: "object",
          properties: {
            targetType: {
              type: "string",
              description: "Type of the target entity",
            },
            targetName: {
              type: "string",
              description: "Name of the target entity",
            },
            relationshipType: {
              type: "string",
              description: "Type of relationship (e.g., ally, enemy, works_for)",
            },
            description: {
              type: "string",
              description: "Description of the relationship",
            },
            isNewEntity: {
              type: "boolean",
              description: "Whether this is a new entity suggestion",
            },
          },
          required: ["targetType", "targetName", "relationshipType"],
        },
      },
      reasoning: {
        type: "string",
        description: "Brief explanation of your creative choices",
      },
    },
    required: ["name", "fields", "reasoning"],
  },
};

/**
 * Map quality to model and detail level
 */
function getModelForQuality(quality: GenerationQuality): string {
  const userPreference: QualityPreference =
    quality === "quick" ? "speed" : quality === "detailed" ? "quality" : "balanced";

  const context: TaskContext = {
    taskType: "generate",
    contentLength: quality === "detailed" ? "long" : "medium",
    requiresReasoning: false,
    userPreference,
  };

  return selectModel(context);
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

## Output
You MUST call the submit_entity tool to provide your generated entity.
Do NOT explain yourself in text - put everything in the tool call.
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

  lines.push("");
  lines.push("Call submit_entity with your generated content.");

  return lines.join("\n");
}

/**
 * Generate a new entity using AI
 */
export async function generateEntity(
  request: GenerationRequest
): Promise<GenerationResult> {
  try {
    // Get campaign context for injection
    const campaignSummary = await getCampaignSummary(request.campaignId);
    const campaignContext = formatCampaignSummary(campaignSummary);

    // Select model based on quality
    const model = getModelForQuality(request.quality);

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

    // Call Claude with tool
    const response = await createMessage({
      model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [SUBMIT_ENTITY_TOOL],
      maxTokens: 2048,
    });

    // Extract tool call
    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        success: false,
        error: "AI did not provide structured output",
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    }

    // Parse tool input
    const input = toolUse.input as {
      name: string;
      fields: Record<string, string>;
      relationships?: Array<{
        targetType: string;
        targetName: string;
        relationshipType: string;
        description?: string;
        isNewEntity?: boolean;
      }>;
      reasoning: string;
    };

    // Build result
    const suggestedRelationships: SuggestedRelationship[] =
      input.relationships?.map((rel) => ({
        targetType: rel.targetType,
        targetName: rel.targetName,
        relationshipType: rel.relationshipType,
        description: rel.description,
        isNewEntity: rel.isNewEntity,
      })) ?? [];

    return {
      success: true,
      entity: {
        type: request.entityType,
        name: input.name,
        fields: input.fields,
      },
      suggestedRelationships,
      reasoning: input.reasoning,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
