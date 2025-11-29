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

### Required Fields
- **name**: An evocative name that hints at the location's nature
- **location_type**: One of: world, continent, region, territory, settlement, district, building, room, landmark, wilderness

### Description (Main Content)
The **description** is your primary output. It should be a rich, multi-paragraph narrative that includes:
- Sensory details (sights, sounds, smells, textures)
- What the place is KNOWN FOR
- Its CURRENT STATE and any ongoing events or tensions
- Atmosphere and mood
- Practical details for gameplay

### Location-Type Specific Content

Include these elements based on the location type:

**World / Continent / Region**:
- Geographic scope and notable features
- Major cultures, peoples, or factions
- Historical significance and defining events
- Current political tensions or threats

**Territory / Settlement**:
- Governance and social structure
- Economy and trade (what it produces or imports)
- Notable landmarks and districts
- Current mood and concerns of inhabitants

**District**:
- Character and vibe of the area
- Typical businesses and services
- Social class and who lives/works here
- Day vs night atmosphere

**Building**:
- Architectural style and construction
- Purpose and typical activities
- Who owns/operates it and current patrons
- Sensory atmosphere (lighting, smells, sounds)

**Room**:
- Immediate sensory details on entry
- Contents and notable objects
- Signs of recent activity or use
- Mood and lighting

**Landmark**:
- Physical description and scale
- Legends, myths, or history
- How locals view it (sacred, feared, ignored)
- What makes it significant

**Wilderness**:
- Terrain and natural hazards
- Flora, fauna, and ecosystem
- What travelers encounter
- Hidden locations or secrets within

### Story Hooks
Weave into the description:
- Secrets or mysteries to discover
- NPCs who might be encountered
- Potential conflicts or opportunities
- Connections to broader campaign elements
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
