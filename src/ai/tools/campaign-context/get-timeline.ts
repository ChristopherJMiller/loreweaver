/**
 * get_timeline Tool
 *
 * Retrieves timeline events for the campaign.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { TimelineEvent } from "@/types";

export const getTimelineTool: ToolDefinition = {
  name: "get_timeline",
  description:
    "Get timeline events for the campaign. Returns events sorted by date.",
  input_schema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of events to return (default: all)",
      },
      include_hidden: {
        type: "boolean",
        description:
          "Include non-public events (default: true since you're the GM)",
      },
    },
    required: [],
  },
  handler: async (input: unknown, context: ToolContext): Promise<ToolResult> => {
    const { limit, include_hidden = true } = input as {
      limit?: number;
      include_hidden?: boolean;
    };

    try {
      let events = await invoke<TimelineEvent[]>("list_timeline_events", {
        campaign_id: context.campaignId,
      });

      // Filter non-public if requested
      if (!include_hidden) {
        events = events.filter((e) => e.is_public);
      }

      // Sort by sort_order
      events.sort((a, b) => Number(a.sort_order) - Number(b.sort_order));

      // Apply limit
      if (limit && limit > 0) {
        events = events.slice(0, limit);
      }

      if (events.length === 0) {
        return {
          success: true,
          content: "No timeline events found for this campaign.",
          data: [],
        };
      }

      const formatted = events
        .map((e) => {
          const visibility = e.is_public ? "" : " [SECRET]";
          const significance = e.significance ? ` [${e.significance}]` : "";

          let line = `### ${e.title}${visibility}`;
          line += `\n**Date:** ${e.date_display}${significance}`;
          if (e.description) {
            line += `\n\n${e.description}`;
          }
          return line;
        })
        .join("\n\n---\n\n");

      return {
        success: true,
        content: `## Campaign Timeline\n\n${formatted}`,
        data: events,
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get timeline: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
