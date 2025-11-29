/**
 * propose_create Tool
 *
 * Proposes creating a new entity. The proposal is tracked and requires
 * user approval before the entity is actually created.
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { ProposalTracker } from "@/ai/proposals/tracker";
import type {
  ProposeCreateInput,
  CREATABLE_ENTITY_TYPES,
} from "./types";
import type { SuggestedRelationship } from "@/ai/agents/types";

/**
 * Factory to create the propose_create tool with a tracker instance
 */
export function createProposeCreateTool(
  tracker: ProposalTracker
): ToolDefinition {
  return {
    name: "propose_create",
    description: `Propose creating a new entity in the campaign. The user will review and approve before creation.

Use this when you want to suggest creating a new character, location, organization, quest, or other entity based on the conversation.

IMPORTANT: This does NOT create the entity immediately. It creates a proposal that the user must approve. The user can edit the proposal before accepting.

After calling this tool, the user will see a preview card in the chat where they can:
- Review the proposed entity data
- Edit any fields they want to change
- Accept or reject the proposal`,
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
          description: "Type of entity to create",
        },
        data: {
          type: "object",
          description: `Entity data. Required fields vary by entity_type but 'name' is always required.

Common fields by entity type:
- character: name, lineage, occupation, description, personality, motivations, secrets, voice_notes
- location: name, location_type, description
- organization: name, org_type, description, goals, resources
- quest: name, plot_type, status, description, hook, objectives
- hero: name, classes, backstory, notes
- player: name, email, preferences, boundaries, notes
- session: session_number, title, summary, notes
- timeline_event: name, event_date, description
- secret: name, content, secret_type, reveal_conditions`,
          properties: {
            name: {
              type: "string",
              description: "Name of the entity (required for most types)",
            },
          },
          required: ["name"],
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of why you're suggesting this entity (shown to user)",
        },
        suggested_relationships: {
          type: "array",
          description:
            "Optional relationships to create with existing entities after this entity is created",
          items: {
            type: "object",
            properties: {
              target_type: {
                type: "string",
                description: "Entity type of the target (e.g., location, character)",
              },
              target_name: {
                type: "string",
                description: "Name of the target entity (must exist in campaign)",
              },
              relationship_type: {
                type: "string",
                description:
                  "Type of relationship (e.g., located_in, member_of, ally_of, enemy_of)",
              },
              description: {
                type: "string",
                description: "Optional description of the relationship",
              },
              is_new_entity: {
                type: "boolean",
                description:
                  "Set to true if target doesn't exist yet (will be skipped during creation)",
              },
            },
            required: ["target_type", "target_name", "relationship_type"],
          },
        },
        parent_id: {
          type: "string",
          description:
            "Parent location ID (only for location entities to set hierarchy)",
        },
      },
      required: ["entity_type", "data"],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const {
        entity_type,
        data,
        reasoning,
        suggested_relationships,
        parent_id,
      } = input as ProposeCreateInput;

      // Validate entity type
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
      if (!validTypes.includes(entity_type)) {
        return {
          success: false,
          content: `Invalid entity type: ${entity_type}. Must be one of: ${validTypes.join(", ")}`,
        };
      }

      // Validate required name field
      if (!data.name || typeof data.name !== "string") {
        return {
          success: false,
          content: "Entity data must include a 'name' field",
        };
      }

      // Convert suggested relationships to the internal format
      const relationships: SuggestedRelationship[] | undefined =
        suggested_relationships?.map((r) => ({
          targetType: r.target_type,
          targetName: r.target_name,
          relationshipType: r.relationship_type,
          description: r.description,
          isNewEntity: r.is_new_entity,
        }));

      // Create the proposal
      const proposal = tracker.addCreateProposal(
        entity_type as typeof CREATABLE_ENTITY_TYPES[number],
        data,
        {
          reasoning,
          suggestedRelationships: relationships,
          parentId: parent_id,
        }
      );

      // Format response for the agent
      const lines: string[] = [
        `Created proposal to make a new ${entity_type}:`,
        "",
        `**Name:** ${data.name}`,
        `**Proposal ID:** ${proposal.id}`,
        "",
      ];

      if (reasoning) {
        lines.push(`**Reasoning:** ${reasoning}`);
        lines.push("");
      }

      if (relationships && relationships.length > 0) {
        lines.push("**Suggested Relationships:**");
        for (const rel of relationships) {
          const newTag = rel.isNewEntity ? " (new entity)" : "";
          lines.push(
            `- ${rel.relationshipType} → ${rel.targetType}: ${rel.targetName}${newTag}`
          );
        }
        lines.push("");
      }

      lines.push(
        "The user will see this proposal in the chat and can accept, edit, or reject it."
      );

      return {
        success: true,
        content: lines.join("\n"),
        data: proposal,
      };
    },
  };
}
