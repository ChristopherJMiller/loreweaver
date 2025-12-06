/**
 * Expander Agent Prompts
 *
 * System prompts for expanding brief content with more detail
 * while maintaining the original voice and style.
 */

import type { EntityType } from "@/types";

/**
 * Expansion types available to users
 */
export type ExpansionType = "detail" | "backstory" | "sensory" | "gm_notes";

/**
 * Human-readable labels for expansion types
 */
export const EXPANSION_TYPE_LABELS: Record<ExpansionType, string> = {
  detail: "Add Detail",
  backstory: "Backstory",
  sensory: "Sensory Details",
  gm_notes: "GM Notes",
};

/**
 * Descriptions for each expansion type
 */
export const EXPANSION_TYPE_DESCRIPTIONS: Record<ExpansionType, string> = {
  detail:
    "Add specific details, examples, and concrete descriptions to flesh out the content",
  backstory:
    "Expand with historical context, origins, and background information",
  sensory:
    "Add sensory details - sights, sounds, smells, textures, and atmosphere",
  gm_notes:
    "Add GM-only information, secrets, plot hooks, and behind-the-scenes details",
};

/**
 * Build the system prompt for expansion
 */
export function buildExpansionSystemPrompt(
  entityType: EntityType,
  entityName: string,
  fieldName: string,
  expansionType: ExpansionType,
  campaignContext: string
): string {
  const typeGuidance = getExpansionTypeGuidance(expansionType);
  const styleGuidance = getStyleGuidance(entityType, fieldName);

  return `You are a creative worldbuilding assistant for tabletop RPGs, specializing in expanding and enriching existing content.

## Campaign Context
${campaignContext}

## Your Task
Expand the selected text from the "${fieldName}" field of the ${entityType} named "${entityName}".

## Expansion Type: ${EXPANSION_TYPE_LABELS[expansionType]}
${typeGuidance}

## Style Guidelines
${styleGuidance}

## Available Tools
You have tools to gather additional context if needed:
- **search_entities** - Search for characters, locations, organizations, etc. by name or keyword
- **get_entity** - Get full details of a specific entity by ID
- **get_relationships** - See how entities are connected
- **get_location_hierarchy** - Understand location parent/child relationships
- **get_timeline** - See chronological events

Use these tools when you need more context about related entities, world history, or connections.
Only use tools if genuinely helpful for the expansion - don't use them just because they're available.

## Critical Rules
1. **Maintain Voice** - Match the existing writing style, tone, and perspective
2. **Seamless Integration** - The expansion should flow naturally with surrounding content
3. **No Contradictions** - Do not contradict established facts about this entity or the world
4. **Markdown Formatting** - Use appropriate markdown (bold, italic, lists) matching the original style
5. **Appropriate Length** - Expand meaningfully but don't overwrite. Aim for 2-4x the original length.

## Output Format
After gathering any needed context, respond with a JSON object containing:
- expandedText: The expanded version of the selected text
- reasoning: Brief explanation of what you added and why (1-2 sentences)
`;
}

/**
 * Build the user prompt for expansion
 */
export function buildExpansionUserPrompt(
  selectedText: string,
  surroundingContext?: string
): string {
  const lines: string[] = [];

  lines.push("## Text to Expand");
  lines.push("```");
  lines.push(selectedText);
  lines.push("```");

  if (surroundingContext) {
    lines.push("");
    lines.push("## Surrounding Context");
    lines.push("(For reference - do not include this in output)");
    lines.push("```");
    lines.push(surroundingContext);
    lines.push("```");
  }

  lines.push("");
  lines.push("Expand the text above, maintaining its voice and style.");

  return lines.join("\n");
}

/**
 * Get guidance specific to expansion type
 */
function getExpansionTypeGuidance(type: ExpansionType): string {
  switch (type) {
    case "detail":
      return `Add specific, concrete details that bring the content to life:
- Replace vague descriptions with specific ones
- Add examples, numbers, or named elements
- Include practical details useful for gameplay
- Flesh out incomplete thoughts`;

    case "backstory":
      return `Add historical and background context:
- Origins and how things came to be
- Past events that shaped the current state
- Connections to broader world history
- Legends, myths, or stories about the subject`;

    case "sensory":
      return `Add vivid sensory details:
- Visual details (colors, lighting, movement)
- Sounds (ambient, distinct, absence of sound)
- Smells (pleasant, unpleasant, notable)
- Textures and physical sensations
- Atmosphere and mood`;

    case "gm_notes":
      return `Add Game Master information:
- Hidden secrets players might discover
- True motivations vs. public facade
- Plot hooks and adventure opportunities
- Mechanical notes or stat suggestions
- How this element connects to campaign arcs`;
  }
}

/**
 * Get style guidance based on entity type and field
 */
function getStyleGuidance(entityType: EntityType, fieldName: string): string {
  // Field-specific guidance
  const fieldGuidance: Record<string, string> = {
    description: "Write in present tense, descriptive prose",
    personality:
      "Focus on how traits manifest in behavior and interactions",
    motivations: "Explore desires, fears, and driving forces",
    secrets: "Write from an omniscient perspective, revealing hidden truths",
    voice_notes: "Include speech patterns, verbal tics, and example phrases",
    backstory: "Write in past tense, narrative prose",
    goals: "Be specific about objectives and methods",
    resources: "List concrete assets, abilities, or influence",
  };

  // Entity-specific guidance
  const entityGuidance: Partial<Record<EntityType, string>> = {
    character:
      "Characters should feel three-dimensional with clear personalities",
    location:
      "Locations should be vivid and immersive, easy to describe to players",
    organization:
      "Organizations should have clear identities and internal dynamics",
    quest:
      "Quests should have clear stakes and interesting complications",
  };

  const field = fieldGuidance[fieldName] || "Maintain consistent style with the original";
  const entity = entityGuidance[entityType] || "";

  return [field, entity].filter(Boolean).join(". ");
}
