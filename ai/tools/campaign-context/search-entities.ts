/**
 * search_entities Tool
 *
 * Allows the agent to search for entities across the campaign.
 * Uses FTS5 full-text search in the backend.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { SearchResult } from "@/types";

export const searchEntitiesTool: ToolDefinition = {
  name: "search_entities",
  description:
    "Search for entities (characters, locations, organizations, quests, etc.) in the campaign. Returns matching entities with relevance snippets.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (supports FTS5 syntax)",
      },
      entity_types: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional filter by entity type(s): character, location, organization, quest, hero, player, session, timeline_event, secret",
      },
      limit: {
        type: "number",
        description: "Maximum results to return (default 20)",
      },
    },
    required: ["query"],
  },
  handler: async (input: unknown, context: ToolContext): Promise<ToolResult> => {
    const { query, entity_types, limit } = input as {
      query: string;
      entity_types?: string[];
      limit?: number;
    };

    try {
      const results = await invoke<SearchResult[]>("search_entities", {
        campaign_id: context.campaignId,
        query,
        entity_types: entity_types ?? null,
        limit: limit ?? 20,
      });

      if (results.length === 0) {
        return {
          success: true,
          content: `No results found for "${query}".`,
          data: [],
        };
      }

      const formatted = results
        .map((r, i) => {
          const snippet = r.snippet ? `: ${r.snippet}` : "";
          return `${i + 1}. **${r.name}** (${r.entity_type}, id: ${r.entity_id})${snippet}`;
        })
        .join("\n");

      return {
        success: true,
        content: `## Search Results for "${query}"\n\n${formatted}`,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        content: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
