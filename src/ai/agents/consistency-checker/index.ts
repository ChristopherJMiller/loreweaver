/**
 * Consistency Checker Agent
 *
 * Validates entity content against existing campaign lore.
 * Identifies contradictions, impossibilities, and inconsistencies.
 *
 * Uses tools to verify facts against the database before
 * reporting issues. Supports streaming with partial JSON parsing
 * for progressive display.
 */

import { z } from "zod";
import { parse as parsePartialJson, Allow } from "partial-json";
import { createStructuredMessageStream } from "../../client";
import { getCampaignSummary, formatCampaignSummary } from "../../context";
import { getCampaignContextTools } from "../../tools/campaign-context";
import {
  buildConsistencyCheckSystemPrompt,
  buildConsistencyCheckUserPrompt,
} from "./prompts";
import type {
  ConsistencyCheckRequest,
  ConsistencyCheckResult,
  ConsistencyCheckerCallbacks,
  ConsistencyIssue,
  PartialConsistencyResult,
} from "./types";

// Re-export types and prompts
export * from "./types";
export * from "./prompts";

/**
 * Zod schema for conflicting entity reference
 */
const ConflictingEntitySchema = z.object({
  type: z.string(),
  id: z.string(),
  name: z.string(),
});

/**
 * Zod schema for a single consistency issue
 */
const ConsistencyIssueSchema = z.object({
  severity: z.enum(["error", "warning", "suggestion"]),
  field: z.string(),
  issue: z.string(),
  conflictingEntity: ConflictingEntitySchema.optional(),
  suggestion: z.string().optional(),
});

/**
 * Zod schema for consistency check output
 *
 * Note: We use z.number() without min/max constraints because
 * Anthropic's structured outputs API doesn't support those.
 * The prompt instructs the model to use 0-100 range.
 */
const ConsistencyCheckOutputSchema = z.object({
  issues: z.array(ConsistencyIssueSchema),
  overallScore: z.number(),
  reasoning: z.string(),
});

type ConsistencyCheckOutput = z.infer<typeof ConsistencyCheckOutputSchema>;

/**
 * Model for consistency checking
 * Always uses Sonnet - requires advanced reasoning per DESIGN_DOC
 */
const CONSISTENCY_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Maximum tool iterations for thorough checking
 */
const MAX_TOOL_ITERATIONS = 7;

/**
 * Check entity content for consistency with existing lore
 *
 * Analyzes the provided entity content against the campaign's
 * established facts using tool calls to verify information.
 *
 * @param request - The content to check
 * @param callbacks - Optional callbacks for progress updates
 * @param signal - Optional abort signal for cancellation
 * @returns The consistency check result with issues and score
 */
export async function checkEntityConsistency(
  request: ConsistencyCheckRequest,
  callbacks?: ConsistencyCheckerCallbacks,
  signal?: AbortSignal
): Promise<ConsistencyCheckResult> {
  try {
    callbacks?.onStart?.();

    // Get campaign context for world consistency
    const campaignSummary = await getCampaignSummary(request.campaignId);
    const campaignContext = formatCampaignSummary(campaignSummary);

    // Build prompts
    const systemPrompt = buildConsistencyCheckSystemPrompt(
      request.entityType,
      campaignContext
    );

    const userPrompt = buildConsistencyCheckUserPrompt(
      request.entityType,
      request.entityName,
      request.content,
      request.isNew
    );

    // Get tools for context verification
    const tools = getCampaignContextTools();

    // Call Claude with structured output and tools
    const response = await createStructuredMessageStream({
      model: CONSISTENCY_MODEL,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      schema: ConsistencyCheckOutputSchema,
      maxTokens: 2048,
      tools,
      toolContext: {
        campaignId: request.campaignId,
        pageContext: request.entityId
          ? {
              entityType: request.entityType,
              entityId: request.entityId,
              entityName: request.entityName,
              path: `/${request.entityType}s/${request.entityId}`,
            }
          : undefined,
      },
      toolProgress: {
        onToolStart: (toolName, _input, flavor) => {
          callbacks?.onToolUse?.(toolName, flavor);
        },
      },
      maxToolIterations: MAX_TOOL_ITERATIONS,
      signal,
      onTextDelta: (_delta, accumulated) => {
        // Try to parse partial JSON for streaming display
        if (callbacks?.onPartialResult) {
          try {
            const partial = parsePartialJson(
              accumulated,
              Allow.STR | Allow.OBJ | Allow.ARR | Allow.NUM | Allow.BOOL
            ) as PartialConsistencyResult;
            callbacks.onPartialResult(partial);
          } catch {
            // Partial JSON not yet parseable, that's expected during streaming
          }
        }
      },
    });

    const data = response.data as ConsistencyCheckOutput;

    // Map the response to our result type
    const issues: ConsistencyIssue[] = data.issues.map((issue) => ({
      severity: issue.severity,
      field: issue.field,
      issue: issue.issue,
      conflictingEntity: issue.conflictingEntity
        ? {
            type: issue.conflictingEntity.type,
            id: issue.conflictingEntity.id,
            name: issue.conflictingEntity.name,
          }
        : undefined,
      suggestion: issue.suggestion,
    }));

    const result: ConsistencyCheckResult = {
      success: true,
      issues,
      overallScore: data.overallScore,
      reasoning: data.reasoning,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    callbacks?.onComplete?.(result);
    return result;
  } catch (error) {
    const result: ConsistencyCheckResult = {
      success: false,
      issues: [],
      overallScore: 0,
      reasoning: "",
      error: error instanceof Error ? error.message : String(error),
    };
    callbacks?.onComplete?.(result);
    return result;
  }
}
