/**
 * Agentic Generator
 *
 * Two-phase entity generation:
 * 1. Research phase: Gather rich context using tools
 * 2. Generation phase: Create entity with structured output
 *
 * This provides deeply contextual entity generation by letting the AI
 * explore the world before creating new content.
 */

import type {
  AgenticGenerationRequest,
  AgenticGenerationResult,
  AgenticGeneratorCallbacks,
  ResearchFindings,
  GenerationRequest,
} from "./types";
import { runResearchAgent } from "./research-agent";
import { generateEntity } from "./generator";

/**
 * Format research findings as markdown for system prompt injection
 */
function formatResearchForPrompt(findings: ResearchFindings): string {
  const lines: string[] = [];

  lines.push("## Research Context (gathered before generation)");
  lines.push("");

  // Parent context
  if (findings.parentContext) {
    lines.push(`### Parent: ${findings.parentContext.name}`);
    if (findings.parentContext.locationType) {
      lines.push(`*${findings.parentContext.locationType}*`);
    }
    lines.push("");
    lines.push(findings.parentContext.description);
    lines.push("");
  }

  // Location hierarchy
  if (findings.locationHierarchy && findings.locationHierarchy.length > 0) {
    lines.push("### Location Hierarchy");
    for (const loc of findings.locationHierarchy) {
      lines.push(`> ${loc.name} (${loc.locationType})`);
    }
    lines.push("");
  }

  // Related entities
  if (findings.relatedEntities.length > 0) {
    lines.push("### Related Entities");
    for (const entity of findings.relatedEntities) {
      lines.push(`- **${entity.name}** (${entity.type}): ${entity.relevance}`);
      if (entity.brief) {
        lines.push(`  ${entity.brief}`);
      }
    }
    lines.push("");
  }

  // Faction context
  if (findings.factionContext && findings.factionContext.length > 0) {
    lines.push("### Local Factions");
    for (const faction of findings.factionContext) {
      lines.push(`- **${faction.name}** (${faction.type}): ${faction.influence}`);
    }
    lines.push("");
  }

  // Cultural notes
  if (findings.culturalNotes) {
    lines.push("### Cultural Context");
    lines.push(findings.culturalNotes);
    lines.push("");
  }

  // Existing entities of same type
  if (findings.existingOfType && findings.existingOfType.length > 0) {
    lines.push("### Existing (differentiate from these)");
    for (const entity of findings.existingOfType) {
      lines.push(`- ${entity.name}: ${entity.brief || "no description"}`);
    }
    lines.push("");
  }

  // If we only have the summary (no structured extraction), use it directly
  if (
    lines.length === 2 &&
    findings.summary &&
    findings.summary !== "Research was cancelled." &&
    !findings.summary.startsWith("Research encountered an error")
  ) {
    // Reset and use the raw summary
    return `## Research Context (gathered before generation)\n\n${findings.summary}`;
  }

  return lines.join("\n");
}

/**
 * Generate an entity with optional research phase
 *
 * This orchestrates the two-phase generation:
 * 1. If enableResearch !== false, runs the research agent to gather context
 * 2. Injects research findings into the generator's context
 * 3. Runs structured generation with the enhanced prompt
 */
export async function generateEntityWithResearch(
  request: AgenticGenerationRequest,
  callbacks?: AgenticGeneratorCallbacks
): Promise<AgenticGenerationResult> {
  const enableResearch = request.enableResearch !== false;
  let researchFindings: ResearchFindings | undefined;
  let researchTokens = 0;

  // Phase 1: Research (if enabled)
  if (enableResearch) {
    callbacks?.onResearchStart?.();

    try {
      researchFindings = await runResearchAgent(
        request.campaignId,
        request.entityType,
        request.context || "",
        request.pageContext,
        {
          maxIterations: request.maxResearchIterations ?? 5,
          onProgress: callbacks?.onResearchProgress,
          onStep: callbacks?.onResearchStep,
          // Note: We don't pass signal here because we want to complete research
          // even if the user navigates away - they can cancel during generation
        }
      );

      callbacks?.onResearchComplete?.(researchFindings);

      // Track research token usage
      if (researchFindings.researchUsage) {
        researchTokens =
          researchFindings.researchUsage.inputTokens +
          researchFindings.researchUsage.outputTokens;
      }
    } catch (error) {
      // Research failed - log but continue with basic generation
      console.error("[AgenticGenerator] Research phase failed:", error);
      researchFindings = {
        summary: "Research phase encountered an error. Proceeding with basic context.",
        relatedEntities: [],
      };
      callbacks?.onResearchComplete?.(researchFindings);
    }
  }

  // Phase 2: Generation
  callbacks?.onGenerationStart?.();

  // Build enhanced context by combining user context with research findings
  let enhancedContext = request.context || "";

  if (researchFindings && researchFindings.summary) {
    const researchContext = formatResearchForPrompt(researchFindings);
    enhancedContext = researchContext + "\n\n---\n\n" + (request.context || "");
  }

  // Create the base generation request
  const generationRequest: GenerationRequest = {
    campaignId: request.campaignId,
    entityType: request.entityType,
    context: enhancedContext,
    relatedTo: request.relatedTo,
    quality: request.quality,
    parentId: request.parentId,
  };

  // Run structured generation
  const generationResult = await generateEntity(generationRequest, {
    onPartialEntity: callbacks?.onPartialEntity,
  });

  // Calculate combined usage
  const generationTokens =
    (generationResult.usage?.inputTokens ?? 0) +
    (generationResult.usage?.outputTokens ?? 0);

  // Build the combined result
  const result: AgenticGenerationResult = {
    ...generationResult,
    research: researchFindings,
    totalUsage: {
      inputTokens:
        (researchFindings?.researchUsage?.inputTokens ?? 0) +
        (generationResult.usage?.inputTokens ?? 0),
      outputTokens:
        (researchFindings?.researchUsage?.outputTokens ?? 0) +
        (generationResult.usage?.outputTokens ?? 0),
      researchTokens,
      generationTokens,
    },
  };

  return result;
}
