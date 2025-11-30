/**
 * get_relationships Tool
 *
 * Retrieves relationships for an entity.
 */

import { invoke } from "@tauri-apps/api/core";
import { isUUID, createInvalidIdError } from "@/ai/utils/uuid";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { Relationship } from "@/types";

export const getRelationshipsTool: ToolDefinition = {
  name: "get_relationships",
  description:
    "Get all relationships involving a specific entity. Shows how entities are connected.",
  input_schema: {
    type: "object",
    properties: {
      entity_type: {
        type: "string",
        enum: [
          "character",
          "location",
          "organization",
          "quest",
          "hero",
          "player",
          "session",
          "timeline_event",
          "secret",
        ],
        description: "The type of entity",
      },
      entity_id: {
        type: "string",
        description:
          "The entity's UUID. Use search_entities to find IDs by name.",
      },
      flavor: {
        type: "string",
        description:
          "Brief status text shown to user while this tool runs (e.g., 'Finding connections...'). Keep under 50 chars.",
      },
    },
    required: ["entity_type", "entity_id"],
  },
  handler: async (input: unknown, _context: ToolContext): Promise<ToolResult> => {
    const { entity_type, entity_id } = input as {
      entity_type: string;
      entity_id: string;
    };

    // Validate UUID format before hitting the database
    if (!isUUID(entity_id)) {
      return {
        success: false,
        content: createInvalidIdError(entity_id),
      };
    }

    try {
      const relationships = await invoke<Relationship[]>(
        "get_entity_relationships",
        {
          entity_type,
          entity_id,
        }
      );

      if (relationships.length === 0) {
        return {
          success: true,
          content: `No relationships found for ${entity_type} ${entity_id}.`,
          data: [],
        };
      }

      const formatted = relationships
        .map((r) => {
          const direction = r.is_bidirectional
            ? "↔"
            : r.source_id === entity_id
              ? "→"
              : "←";

          const otherType =
            r.source_id === entity_id ? r.target_type : r.source_type;
          const otherId = r.source_id === entity_id ? r.target_id : r.source_id;

          let line = `- **${r.relationship_type}** ${direction} ${otherType} (${otherId})`;
          if (r.strength !== null) line += ` [strength: ${r.strength}]`;
          if (r.description) line += `\n  ${r.description}`;

          return line;
        })
        .join("\n");

      return {
        success: true,
        content: `## Relationships for ${entity_type} ${entity_id}\n\n${formatted}`,
        data: relationships,
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get relationships: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
