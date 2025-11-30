/**
 * Research Agent
 *
 * Gathers rich context from the campaign world before entity generation.
 * Uses the agent loop with read-only tools to explore locations, relationships,
 * and existing entities. Returns structured findings for the generator.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { EntityType } from "@/types";
import type { PageContext } from "@/ai/context/types";
import type { ResearchFindings, ResearchStep } from "./types";
import type { ToolDefinition, ToolResult, ToolContext } from "../tools/types";
import { toAnthropicTool } from "../tools/types";
import { getCampaignContextTools } from "../tools/campaign-context";
import { runAgent, type AgentResult, type AgentMessage } from "../agent/loop";

/**
 * Options for research agent
 */
export interface ResearchOptions {
  /** Maximum tool call iterations (default: 5) */
  maxIterations?: number;
  /** Callback for progress updates (DEPRECATED: use onStep) */
  onProgress?: (message: string) => void;
  /** Callback for structured step updates */
  onStep?: (step: ResearchStep) => void;
  /** Optional AbortSignal to cancel research */
  signal?: AbortSignal;
}

/**
 * Format a tool call into a human-readable action description
 */
function formatToolAction(toolName: string, input: unknown): string {
  const inputObj = input as Record<string, unknown>;
  switch (toolName) {
    case "search_entities": {
      const query = inputObj.query as string | undefined;
      return query ? `Searching for "${query}"` : "Searching entities";
    }
    case "get_entity": {
      const entityType = inputObj.entity_type as string | undefined;
      return entityType ? `Looking up ${entityType}` : "Looking up entity";
    }
    case "get_location_hierarchy":
      return "Checking location hierarchy";
    case "get_relationships":
      return "Exploring relationships";
    case "get_campaign_context":
      return "Getting campaign overview";
    case "get_page_context":
      return "Reading current page context";
    case "get_timeline":
      return "Checking timeline events";
    default:
      return `Running ${toolName.replace(/_/g, " ")}`;
  }
}

/**
 * Create a read-only tool registry for research (no proposals or work items)
 */
function createResearchToolRegistry(
  campaignId: string,
  pageContext?: PageContext
): {
  tools: Tool[];
  execute: (name: string, input: unknown) => Promise<ToolResult>;
} {
  const definitions: ToolDefinition[] = getCampaignContextTools();
  const tools = definitions.map(toAnthropicTool);
  const handlers = new Map<string, ToolDefinition["handler"]>();

  for (const def of definitions) {
    handlers.set(def.name, def.handler);
  }

  const context: ToolContext = { campaignId, pageContext };

  return {
    tools,
    execute: async (name: string, input: unknown): Promise<ToolResult> => {
      const handler = handlers.get(name);
      if (!handler) {
        return { success: false, content: `Unknown tool: ${name}` };
      }
      return handler(input, context);
    },
  };
}

/**
 * Get entity-type-specific research goals
 */
function getResearchGoals(entityType: EntityType): string {
  const goals: Partial<Record<EntityType, string>> = {
    character: `**Character Research Goals:**
- Find the location context (where will this character exist)
- Identify local organizations they might belong to
- Look up existing characters to avoid duplication and find connection opportunities
- Understand cultural context (naming conventions, social norms)
- Note any relevant factions or power structures`,

    location: `**Location Research Goals:**
- Get full details of the parent location (atmosphere, culture, what it contains)
- Understand the complete location hierarchy (region → city → district → etc.)
- Find sibling locations at the same level
- Identify organizations with presence here
- Look up notable characters associated with this area
- Note existing locations of the same type to differentiate`,

    organization: `**Organization Research Goals:**
- Find existing organizations to avoid overlap and identify potential rivals/allies
- Understand the locations where they might operate
- Look up power dynamics and faction relationships
- Note gaps in the setting that this organization could fill`,

    quest: `**Quest Research Goals:**
- Find active quests to avoid overlap
- Identify potential quest givers (organizations, characters)
- Look up locations relevant to the quest
- Note character relationships that could drive conflict
- Understand current campaign tensions to leverage`,
  };

  return (
    goals[entityType] ||
    `**Research Goals:**
- Understand the campaign setting and tone
- Find related entities that could connect to this new entity
- Identify existing entities of this type to differentiate
- Note opportunities for story hooks and connections`
  );
}

/**
 * Build research system prompt
 */
function buildResearchPrompt(
  entityType: EntityType,
  userContext: string,
  pageContext?: PageContext
): string {
  const pageContextSection = pageContext?.entityId
    ? `## Starting Point

The user is currently viewing: **${pageContext.entityName ?? "Unknown"}** (${pageContext.entityType})
Entity ID: \`${pageContext.entityId}\`

Start your research here - this is likely the parent or context for the new entity.`
    : "";

  return `You are a research assistant preparing context for AI entity generation in a TTRPG worldbuilding app.

Your job is to gather relevant world context before generating a new ${entityType}. You have access to read-only tools that let you search and explore the campaign world.

${pageContextSection}

## User's Requirements
${userContext || "No specific requirements provided - gather general context."}

${getResearchGoals(entityType)}

## Available Tools

- **search_entities**: Search for entities by name or description
- **get_entity**: Get full details of a specific entity (requires UUID)
- **get_relationships**: See how an entity connects to others
- **get_location_hierarchy**: Understand where a location fits in the world
- **get_campaign_context**: Get a high-level overview of the campaign
- **get_page_context**: Get detailed info about what the user is viewing

## Research Strategy

1. ${pageContext?.entityId ? "Start with get_entity on the current page context" : "Start with get_campaign_context for an overview"}
2. Use search_entities to find relevant entities
3. Use get_entity to get full details on the most important finds
4. Use get_relationships if connections are important
5. Stop when you have enough context (don't over-research)

## Output Format

After researching, provide a structured summary with these sections:

### Parent/Location Context
[If relevant: Full description of the containing location, its atmosphere, culture, and inhabitants]

### Related Entities
[Characters, organizations, locations that could connect to the new entity]

### Cultural Context
[Themes, tone, naming conventions, social structures relevant to generation]

### Existing Similar Entities
[Entities of the same type that the new one should differentiate from]

### Story Opportunities
[Potential hooks, conflicts, connections to weave into the new entity]

## Constraints

- **Efficiency**: Maximum 5 tool calls. Be strategic.
- **Focus**: Only gather what's needed for this specific generation.
- **Quality**: Full descriptions are more useful than lists of names.
- **Don't over-research**: If the user provided detailed context, you may need less research.
`;
}

/**
 * Parse agent response into structured research findings
 *
 * This extracts structured data from the markdown response.
 * Since the response is free-form markdown, we do our best to extract
 * meaningful sections, but the summary is always the complete response.
 */
function parseResearchFindings(
  response: string,
  agentResult: AgentResult
): ResearchFindings {
  // The full response is always the summary
  const findings: ResearchFindings = {
    summary: response,
    relatedEntities: [],
  };

  // Extract cultural notes if present
  const culturalMatch = response.match(
    /### Cultural Context\s*\n([\s\S]*?)(?=\n###|$)/i
  );
  if (culturalMatch) {
    findings.culturalNotes = culturalMatch[1].trim();
  }

  // Calculate usage from agent result
  if (agentResult.usage) {
    findings.researchUsage = {
      inputTokens: agentResult.usage.inputTokens,
      outputTokens: agentResult.usage.outputTokens,
    };
  }

  return findings;
}

/**
 * Run the research agent to gather context for entity generation
 *
 * @param campaignId - Campaign to research in
 * @param entityType - Type of entity being generated
 * @param userContext - User's requirements/context for generation
 * @param pageContext - Optional page context (current entity being viewed)
 * @param options - Research options
 */
export async function runResearchAgent(
  campaignId: string,
  entityType: EntityType,
  userContext: string,
  pageContext?: PageContext,
  options?: ResearchOptions
): Promise<ResearchFindings> {
  const maxIterations = options?.maxIterations ?? 5;

  // Create read-only tool registry
  const registry = createResearchToolRegistry(campaignId, pageContext);

  // Build research prompt
  const systemPrompt = buildResearchPrompt(entityType, userContext, pageContext);

  // Create user message
  const userMessage = pageContext?.entityId
    ? `Research context for generating a new ${entityType} related to the current page (${pageContext.entityName}). User context: ${userContext || "none provided"}`
    : `Research context for generating a new ${entityType}. User context: ${userContext || "none provided"}`;

  // Create a minimal tool registry interface that runAgent expects
  // We provide the execute function which is all runAgent actually uses
  const toolRegistry = {
    tools: registry.tools,
    handlers: new Map() as Map<
      string,
      (input: unknown, context: ToolContext) => Promise<ToolResult>
    >,
    execute: registry.execute,
  };

  // Progress callback via onTextDelta (deprecated but still supported)
  const onTextDelta = options?.onProgress
    ? (delta: string) => {
        // Only report meaningful progress (skip whitespace-only deltas)
        if (delta.trim()) {
          options.onProgress?.(delta);
        }
      }
    : undefined;

  // Track active steps for completion marking
  let stepCounter = 0;
  let currentStepId: string | null = null;

  // Message callback for structured step updates
  const onMessage = options?.onStep
    ? (message: AgentMessage) => {
        if (message.role === "tool_start" && message.toolName) {
          // Mark previous step as complete
          if (currentStepId) {
            options.onStep?.({
              id: currentStepId,
              action: "", // Action was already shown, this just marks complete
              status: "complete",
              toolName: message.toolName,
            });
          }

          // Start new step
          stepCounter++;
          currentStepId = `step-${stepCounter}`;
          const action = formatToolAction(message.toolName, message.toolInput);
          options.onStep?.({
            id: currentStepId,
            action,
            status: "running",
            toolName: message.toolName,
          });
        } else if (message.role === "tool_result" && currentStepId) {
          // Tool completed - mark step as complete
          options.onStep?.({
            id: currentStepId,
            action: "",
            status: "complete",
            toolName: message.toolName,
          });
          currentStepId = null;
        }
      }
    : undefined;

  // Run the agent
  const result = await runAgent(userMessage, toolRegistry, {
    model: "claude-sonnet-4-5-20250929",
    systemPrompt,
    maxIterations,
    maxTokens: 4096,
    onTextDelta,
    onMessage,
    signal: options?.signal,
  });

  // Handle cancellation or error
  if (result.cancelled) {
    return {
      summary: "Research was cancelled.",
      relatedEntities: [],
      researchUsage: result.usage
        ? {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          }
        : undefined,
    };
  }

  if (result.error) {
    return {
      summary: `Research encountered an error: ${result.error}`,
      relatedEntities: [],
      researchUsage: result.usage
        ? {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
          }
        : undefined,
    };
  }

  // Parse findings from response
  return parseResearchFindings(result.response, result);
}
