/**
 * Expander Agent
 *
 * Expands brief content with more detail while maintaining
 * the original voice and style. Supports streaming for
 * progressive display.
 *
 * Uses tools to gather additional context about the campaign,
 * related entities, and world information when needed.
 */

import { z } from "zod";
import { parse as parsePartialJson, Allow } from "partial-json";
import { createStructuredMessageStream } from "../../client";
import { getCampaignSummary, formatCampaignSummary } from "../../context";
import { getCampaignContextTools } from "../../tools/campaign-context";
import { buildExpansionSystemPrompt, buildExpansionUserPrompt } from "./prompts";
import type {
  ExpansionRequest,
  ExpansionResult,
  ExpanderCallbacks,
  PartialExpansion,
} from "./types";

// Re-export types and prompts
export * from "./types";
export * from "./prompts";

/**
 * Zod schema for expansion output
 */
const ExpansionOutputSchema = z.object({
  expandedText: z.string().min(1),
  reasoning: z.string(),
});

type ExpansionOutput = z.infer<typeof ExpansionOutputSchema>;

/**
 * Model for expansion (always Sonnet for quality)
 */
const EXPANSION_MODEL = "claude-sonnet-4-5-20250929";

/**
 * Get surrounding context for the selection
 *
 * Provides text before and after the selection to help
 * the AI understand context and maintain consistency.
 */
function getSurroundingContext(
  fullContent: string,
  selectionStart: number,
  selectionEnd: number,
  contextChars: number = 500
): string {
  const before = fullContent.slice(
    Math.max(0, selectionStart - contextChars),
    selectionStart
  );
  const after = fullContent.slice(
    selectionEnd,
    Math.min(fullContent.length, selectionEnd + contextChars)
  );

  const parts: string[] = [];

  if (before) {
    parts.push(`[...before...]\n${before}`);
  }

  parts.push("\n[SELECTED TEXT HERE]\n");

  if (after) {
    parts.push(`${after}\n[...after...]`);
  }

  return parts.join("");
}

/**
 * Expand content using AI
 *
 * Takes selected text and expands it based on the expansion type,
 * maintaining consistency with the surrounding content and world.
 *
 * The agent has access to tools for gathering additional context
 * (related entities, location hierarchy, timeline, etc.) when needed.
 */
export async function expandContent(
  request: ExpansionRequest,
  callbacks?: ExpanderCallbacks
): Promise<ExpansionResult> {
  try {
    callbacks?.onStart?.();

    // Get campaign context for world consistency
    const campaignSummary = await getCampaignSummary(request.campaignId);
    const campaignContext = formatCampaignSummary(campaignSummary);

    // Build prompts
    const systemPrompt = buildExpansionSystemPrompt(
      request.entityType,
      request.entityName,
      request.fieldName,
      request.expansionType,
      campaignContext
    );

    // Get surrounding context for seamless integration
    const surroundingContext = getSurroundingContext(
      request.fullContent,
      request.selectionStart,
      request.selectionEnd
    );

    const userPrompt = buildExpansionUserPrompt(
      request.selectedText,
      surroundingContext
    );

    // Get tools for context gathering
    const tools = getCampaignContextTools();

    // Call Claude with streaming structured output and tools
    const response = await createStructuredMessageStream({
      model: EXPANSION_MODEL,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      schema: ExpansionOutputSchema,
      maxTokens: 2048,
      tools,
      toolContext: {
        campaignId: request.campaignId,
        pageContext: {
          entityType: request.entityType,
          entityId: request.entityId,
          entityName: request.entityName,
          path: `/${request.entityType}s/${request.entityId}`,
        },
      },
      toolProgress: {
        onToolStart: (toolName, _input, flavor) => {
          callbacks?.onToolUse?.(toolName, flavor);
        },
      },
      maxToolIterations: 5,
      onTextDelta: (_delta, accumulated) => {
        // Try to parse partial JSON for streaming display
        if (callbacks?.onPartialText) {
          try {
            const partial = parsePartialJson(
              accumulated,
              Allow.STR | Allow.OBJ
            ) as PartialExpansion;
            if (partial.expandedText) {
              callbacks.onPartialText(partial.expandedText);
            }
          } catch {
            // Partial JSON not yet parseable
          }
        }
      },
    });

    const data = response.data as ExpansionOutput;

    const result: ExpansionResult = {
      success: true,
      expandedText: data.expandedText,
      reasoning: data.reasoning,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };

    callbacks?.onComplete?.(result);
    return result;
  } catch (error) {
    const result: ExpansionResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    callbacks?.onComplete?.(result);
    return result;
  }
}
