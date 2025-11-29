/**
 * Campaign Context Types
 *
 * Types for the cached campaign summary used in agent system prompts.
 */

/**
 * Brief entity reference for context injection
 */
export interface EntityBrief {
  id: string;
  name: string;
  type?: string;
  brief?: string;
}

/**
 * Hero with player information
 */
export interface HeroBrief {
  id: string;
  name: string;
  playerName: string;
  characterClass?: string;
  level?: number;
}

/**
 * Session summary for recent context
 */
export interface SessionBrief {
  id: string;
  sessionNumber: number;
  title?: string;
  summary?: string;
}

/**
 * Quest with status for active plot tracking
 */
export interface QuestBrief {
  id: string;
  name: string;
  status?: string;
  questType?: string;
  brief?: string;
}

/**
 * Complete campaign summary for agent context injection
 *
 * This provides agents with immediate world understanding
 * without requiring tool calls.
 */
export interface CampaignSummary {
  /** Campaign ID */
  id: string;

  /** Campaign name */
  name: string;

  /** Game system (D&D 5e, Pathfinder, etc.) */
  system?: string;

  /** Campaign description/setting overview */
  description?: string;

  /** Top-level locations (no parent) */
  topLocations: EntityBrief[];

  /** Major organizations/factions */
  organizations: EntityBrief[];

  /** Active and recent quests */
  quests: QuestBrief[];

  /** Recent sessions for context */
  recentSessions: SessionBrief[];

  /** Party members */
  heroes: HeroBrief[];

  /** When this summary was generated */
  generatedAt: Date;
}

/**
 * Format campaign summary as markdown for system prompt injection
 */
export function formatCampaignSummary(summary: CampaignSummary): string {
  const lines: string[] = [];

  lines.push(`# ${summary.name}`);
  if (summary.system) {
    lines.push(`**System:** ${summary.system}`);
  }
  if (summary.description) {
    lines.push("");
    lines.push(summary.description);
  }

  if (summary.topLocations.length > 0) {
    lines.push("");
    lines.push("## Major Locations");
    for (const loc of summary.topLocations) {
      const type = loc.type ? ` (${loc.type})` : "";
      const brief = loc.brief ? ` - ${loc.brief}` : "";
      lines.push(`- **${loc.name}**${type}${brief}`);
    }
  }

  if (summary.organizations.length > 0) {
    lines.push("");
    lines.push("## Factions & Organizations");
    for (const org of summary.organizations) {
      const type = org.type ? ` (${org.type})` : "";
      const brief = org.brief ? ` - ${org.brief}` : "";
      lines.push(`- **${org.name}**${type}${brief}`);
    }
  }

  if (summary.quests.length > 0) {
    lines.push("");
    lines.push("## Active Quests");
    for (const quest of summary.quests) {
      const status = quest.status ? ` [${quest.status}]` : "";
      const brief = quest.brief ? ` - ${quest.brief}` : "";
      lines.push(`- **${quest.name}**${status}${brief}`);
    }
  }

  if (summary.heroes.length > 0) {
    lines.push("");
    lines.push("## The Party");
    for (const hero of summary.heroes) {
      const classLevel = hero.characterClass
        ? ` (${hero.characterClass}${hero.level ? ` ${hero.level}` : ""})`
        : "";
      lines.push(`- **${hero.name}**${classLevel} - played by ${hero.playerName}`);
    }
  }

  if (summary.recentSessions.length > 0) {
    lines.push("");
    lines.push("## Recent Sessions");
    for (const session of summary.recentSessions) {
      const title = session.title || `Session ${session.sessionNumber}`;
      lines.push(`- **${title}**`);
      if (session.summary) {
        // Truncate long summaries
        const truncated =
          session.summary.length > 200
            ? session.summary.slice(0, 200) + "..."
            : session.summary;
        lines.push(`  ${truncated}`);
      }
    }
  }

  return lines.join("\n");
}
