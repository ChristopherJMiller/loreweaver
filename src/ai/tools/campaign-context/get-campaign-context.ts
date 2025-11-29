/**
 * get_campaign_context Tool
 *
 * Provides high-level campaign overview and statistics.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type {
  Campaign,
  Character,
  Location,
  Organization,
  Quest,
  Hero,
  Session,
  TimelineEvent,
} from "@/types";

interface CampaignStats {
  characters: number;
  locations: number;
  organizations: number;
  quests: number;
  heroes: number;
  sessions: number;
  timelineEvents: number;
}

export const getCampaignContextTool: ToolDefinition = {
  name: "get_campaign_context",
  description:
    "Get a high-level overview of the campaign including its description, game system, and entity counts. Use this to understand the campaign before diving into specifics.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_input: unknown, context: ToolContext): Promise<ToolResult> => {
    try {
      // Get campaign details
      const campaign = await invoke<Campaign>("get_campaign", {
        id: context.campaignId,
      });

      // Get entity counts in parallel
      const [
        characters,
        locations,
        organizations,
        quests,
        heroes,
        sessions,
        timelineEvents,
      ] = await Promise.all([
        invoke<Character[]>("list_characters", {
          campaign_id: context.campaignId,
        }),
        invoke<Location[]>("list_locations", {
          campaign_id: context.campaignId,
        }),
        invoke<Organization[]>("list_organizations", {
          campaign_id: context.campaignId,
        }),
        invoke<Quest[]>("list_quests", { campaign_id: context.campaignId }),
        invoke<Hero[]>("list_heroes", { campaign_id: context.campaignId }),
        invoke<Session[]>("list_sessions", { campaign_id: context.campaignId }),
        invoke<TimelineEvent[]>("list_timeline_events", {
          campaign_id: context.campaignId,
        }),
      ]);

      const stats: CampaignStats = {
        characters: characters.length,
        locations: locations.length,
        organizations: organizations.length,
        quests: quests.length,
        heroes: heroes.length,
        sessions: sessions.length,
        timelineEvents: timelineEvents.length,
      };

      // Build overview
      const lines: string[] = [];
      lines.push("---");
      lines.push(`name: ${campaign.name}`);
      if (campaign.system) lines.push(`system: ${campaign.system}`);
      lines.push(`id: ${campaign.id}`);
      lines.push("---");
      lines.push("");

      if (campaign.description) {
        lines.push("## Description");
        lines.push(campaign.description);
        lines.push("");
      }

      lines.push("## Campaign Statistics");
      lines.push("");
      lines.push(`| Entity Type | Count |`);
      lines.push(`|-------------|-------|`);
      lines.push(`| Characters | ${stats.characters} |`);
      lines.push(`| Locations | ${stats.locations} |`);
      lines.push(`| Organizations | ${stats.organizations} |`);
      lines.push(`| Quests | ${stats.quests} |`);
      lines.push(`| Player Heroes | ${stats.heroes} |`);
      lines.push(`| Sessions | ${stats.sessions} |`);
      lines.push(`| Timeline Events | ${stats.timelineEvents} |`);
      lines.push("");

      // Quick lists of entity names for context
      if (characters.length > 0) {
        lines.push("## Characters (names)");
        lines.push(
          characters
            .slice(0, 20)
            .map((c) => `- ${c.name}`)
            .join("\n")
        );
        if (characters.length > 20) {
          lines.push(`- ... and ${characters.length - 20} more`);
        }
        lines.push("");
      }

      if (locations.length > 0) {
        lines.push("## Locations (names)");
        lines.push(
          locations
            .slice(0, 20)
            .map((l) => `- ${l.name}`)
            .join("\n")
        );
        if (locations.length > 20) {
          lines.push(`- ... and ${locations.length - 20} more`);
        }
        lines.push("");
      }

      if (heroes.length > 0) {
        lines.push("## Player Heroes");
        lines.push(
          heroes
            .map(
              (h) => `- ${h.name}${h.classes ? ` (${h.classes})` : ""}`
            )
            .join("\n")
        );
        lines.push("");
      }

      return {
        success: true,
        content: lines.join("\n"),
        data: { campaign, stats },
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get campaign context: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
