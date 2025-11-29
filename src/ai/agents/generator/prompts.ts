/**
 * Entity-Specific Generation Prompts
 *
 * Detailed prompts for generating each entity type with
 * appropriate fields, style, and hooks.
 */

import type { EntityType } from "@/types";

/**
 * Get entity-specific generation guidance
 */
export function getEntityPrompt(entityType: EntityType): string {
  const prompts: Partial<Record<EntityType, string>> = {
    character: CHARACTER_PROMPT,
    location: LOCATION_PROMPT,
    organization: ORGANIZATION_PROMPT,
    quest: QUEST_PROMPT,
  };

  return prompts[entityType] ?? GENERIC_PROMPT;
}

const CHARACTER_PROMPT = `
## Generating a Character (NPC)

Create a memorable, three-dimensional character that can serve multiple roles in the campaign.

### Required Elements
- **name**: A fitting name for the setting. Consider cultural context.
- **lineage**: Race/ancestry if applicable to the system
- **occupation**: What they do - be specific (not just "merchant" but "spice trader from the eastern ports")

### Personality & Depth
- **personality**: 2-3 defining traits with examples of how they manifest
- **motivations**: What they want, fear, and will fight for
- **secrets**: At least one secret the players can discover

### Practical Details
- **description**: Physical appearance focused on memorable features
- **voice_notes**: How they speak - accent, verbal tics, typical phrases

### Hooks
- Include potential plot hooks or conflicts
- Suggest connections to existing characters or factions
- Consider what makes them useful to the story
`;

const LOCATION_PROMPT = `
## Generating a Location

Create a vivid, useful location that players will want to explore.

### Required Elements
- **name**: An evocative name that hints at the location's nature
- **location_type**: Category (city, tavern, dungeon, forest, etc.)

### Description
- **description**: Sensory details - sights, sounds, smells
- Focus on what makes it unique and memorable
- Include atmosphere and mood

### Practical Elements
- **known_for**: What's notable about this place? What draws people here?
- **current_state**: What's happening here NOW? Any tensions or events?

### Hooks
- Include secrets or mysteries to discover
- Suggest interesting NPCs who might be found here
- Consider what makes this location useful for adventures
`;

const ORGANIZATION_PROMPT = `
## Generating an Organization

Create a faction with clear identity and potential for conflict or alliance.

### Required Elements
- **name**: A name that reflects their identity or purpose
- **org_type**: Category (guild, cult, government, criminal, military, etc.)

### Identity
- **description**: What are they? Public perception vs reality.
- **goals**: What do they want? Short-term and long-term aims.

### Resources & Power
- **resources**: What assets, influence, or abilities do they command?
- Consider their reach and limitations

### Hooks
- Include internal conflicts or factions
- Suggest relationships with other organizations
- Consider what services or opportunities they offer to adventurers
- Include potential quests or conflicts involving them
`;

const QUEST_PROMPT = `
## Generating a Quest

Create an engaging adventure hook with clear objectives and interesting complications.

### Required Elements
- **name**: An intriguing title that hints at the adventure
- **plot_type**: Category (main, side, personal, faction, etc.)
- **status**: Current state (available, active, etc.)

### Structure
- **description**: The situation and stakes
- **objectives**: Clear goals - what needs to be done?
- **rewards**: What's offered? Consider material, social, and story rewards.

### Complications
- Include at least one twist or complication
- Consider moral ambiguity or difficult choices
- Suggest multiple approaches or solutions

### Hooks
- Connect to existing characters, locations, or factions
- Consider consequences of success or failure
- Include hooks for follow-up adventures
`;

const GENERIC_PROMPT = `
## Generating an Entity

Create a well-developed entity that fits the campaign world.

### Guidelines
- Use specific, concrete details rather than generic descriptions
- Include hooks for player engagement
- Consider connections to existing campaign elements
- Balance practicality with creativity
`;
