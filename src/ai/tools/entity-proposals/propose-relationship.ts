/**
 * propose_relationship Tool
 *
 * Proposes creating a relationship between two existing entities.
 * The proposal requires user approval before the relationship is created.
 */

import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { ProposalTracker } from "@/ai/proposals/tracker";
import type { ProposeRelationshipInput } from "./types";
import type { EntityType } from "@/types";

const ENTITY_COMMANDS: Record<string, string> = {
  campaign: "get_campaign",
  character: "get_character",
  location: "get_location",
  organization: "get_organization",
  quest: "get_quest",
  hero: "get_hero",
  player: "get_player",
  session: "get_session",
  timeline_event: "get_timeline_event",
  secret: "get_secret",
};

/**
 * Get entity name by type and ID
 */
async function getEntityName(
  entityType: string,
  entityId: string
): Promise<string | null> {
  const command = ENTITY_COMMANDS[entityType];
  if (!command) return null;

  try {
    const entity = await invoke<Record<string, unknown>>(command, {
      id: entityId,
    });
    return (entity.name as string) || (entity.title as string) || entityId;
  } catch {
    return null;
  }
}

/**
 * Factory to create the propose_relationship tool with a tracker instance
 */
export function createProposeRelationshipTool(
  tracker: ProposalTracker
): ToolDefinition {
  return {
    name: "propose_relationship",
    description: `Propose creating a relationship between two existing entities. The user will review and approve before the relationship is created.

Use this when you want to link two entities together, such as:
- A character being a member of an organization
- A location being inside another location
- Two characters being allies or enemies
- A quest being related to a location

IMPORTANT: Both entities must already exist. Use search_entities first to find their IDs.

Common relationship types:
- member_of: Character/Hero is part of an organization
- located_in: Entity is physically located at a location
- ally_of / enemy_of: Two characters/organizations have this relationship
- parent_of / child_of: Hierarchical relationships
- works_for: Employment/service relationship
- owns: Ownership of an item or location
- related_to: Generic connection`,
    input_schema: {
      type: "object",
      properties: {
        source_type: {
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
          description: "Entity type of the source (the 'from' entity)",
        },
        source_id: {
          type: "string",
          description: "ID of the source entity",
        },
        target_type: {
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
          description: "Entity type of the target (the 'to' entity)",
        },
        target_id: {
          type: "string",
          description: "ID of the target entity",
        },
        relationship_type: {
          type: "string",
          description:
            "Type of relationship (e.g., member_of, located_in, ally_of, enemy_of, works_for)",
        },
        description: {
          type: "string",
          description: "Optional description explaining this relationship",
        },
        is_bidirectional: {
          type: "boolean",
          description:
            "Whether the relationship goes both ways (default: true). Set to false for directed relationships like 'parent_of'.",
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of why you're suggesting this relationship (shown to user)",
        },
      },
      required: [
        "source_type",
        "source_id",
        "target_type",
        "target_id",
        "relationship_type",
      ],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const {
        source_type,
        source_id,
        target_type,
        target_id,
        relationship_type,
        description,
        is_bidirectional,
        reasoning,
      } = input as ProposeRelationshipInput;

      // Validate entity types
      const validTypes = [
        "character",
        "location",
        "organization",
        "quest",
        "hero",
        "player",
        "session",
        "timeline_event",
        "secret",
      ];
      if (!validTypes.includes(source_type)) {
        return {
          success: false,
          content: `Invalid source_type: ${source_type}. Must be one of: ${validTypes.join(", ")}`,
        };
      }
      if (!validTypes.includes(target_type)) {
        return {
          success: false,
          content: `Invalid target_type: ${target_type}. Must be one of: ${validTypes.join(", ")}`,
        };
      }

      // Validate relationship_type
      if (!relationship_type || typeof relationship_type !== "string") {
        return {
          success: false,
          content: "relationship_type is required",
        };
      }

      // Fetch entity names for display
      const sourceName = await getEntityName(source_type, source_id);
      if (!sourceName) {
        return {
          success: false,
          content: `Could not find ${source_type} with ID "${source_id}". Use search_entities to find the correct ID.`,
        };
      }

      const targetName = await getEntityName(target_type, target_id);
      if (!targetName) {
        return {
          success: false,
          content: `Could not find ${target_type} with ID "${target_id}". Use search_entities to find the correct ID.`,
        };
      }

      // Create the proposal
      const proposal = tracker.addRelationshipProposal(
        source_type as EntityType,
        source_id,
        sourceName,
        target_type as EntityType,
        target_id,
        targetName,
        relationship_type,
        {
          description,
          isBidirectional: is_bidirectional ?? true,
          reasoning,
        }
      );

      // Format response for the agent
      const directionSymbol =
        is_bidirectional === false ? "→" : "↔";
      const lines: string[] = [
        `Created proposal to link entities:`,
        "",
        `**${sourceName}** (${source_type}) ${directionSymbol} **${relationship_type}** ${directionSymbol} **${targetName}** (${target_type})`,
        "",
        `**Proposal ID:** ${proposal.id}`,
        `**Bidirectional:** ${is_bidirectional !== false ? "Yes" : "No"}`,
      ];

      if (description) {
        lines.push(`**Description:** ${description}`);
      }

      if (reasoning) {
        lines.push(`**Reasoning:** ${reasoning}`);
      }

      lines.push("");
      lines.push(
        "The user will see this proposal in the chat and can accept or reject it."
      );

      return {
        success: true,
        content: lines.join("\n"),
        data: proposal,
      };
    },
  };
}
