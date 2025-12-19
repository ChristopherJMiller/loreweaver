/**
 * propose_update Tool
 *
 * Proposes updating an existing entity. The proposal is tracked and requires
 * user approval before the changes are actually applied.
 */

import { invoke } from "@tauri-apps/api/core";
import { prosemirrorToMarkdown } from "@/ai/utils/content-bridge";
import { RICH_TEXT_FIELDS } from "@/types";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { ProposalTracker } from "@/ai/proposals/tracker";
import type { ProposeUpdateInput, UPDATABLE_ENTITY_TYPES } from "./types";

/**
 * Convert a field value to markdown if it's ProseMirror JSON
 */
function fieldToMarkdown(value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;

  // Check if it looks like ProseMirror JSON
  if (value.startsWith('{"type":"doc"')) {
    try {
      const json = JSON.parse(value);
      return prosemirrorToMarkdown(json);
    } catch {
      // Not valid JSON, return as-is
      return value;
    }
  }

  return value;
}

/**
 * Convert all rich text fields in an entity to markdown for display
 */
function convertEntityToMarkdown(
  entity: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(entity)) {
    if (RICH_TEXT_FIELDS.has(key)) {
      result[key] = fieldToMarkdown(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

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
 * Factory to create the propose_update tool with a tracker instance
 */
export function createProposeUpdateTool(
  tracker: ProposalTracker
): ToolDefinition {
  return {
    name: "propose_update",
    description: `Propose updating an existing entity in the campaign. The user will review and approve before changes are applied.

Use this when you want to suggest modifications to an existing entity based on the conversation.

IMPORTANT: This does NOT modify the entity immediately. It creates a proposal that the user must approve. The user can edit the proposed changes before accepting.

You must first use search_entities or get_entity to find the entity_id before proposing an update.`,
    input_schema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: [
            "campaign",
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
          description: "Type of entity to update",
        },
        entity_id: {
          type: "string",
          description:
            "ID of the entity to update (use search_entities or get_entity to find IDs)",
        },
        changes: {
          type: "object",
          description: `Fields to update. Only include fields you want to change.

Common fields by entity type:
- character: name, lineage, occupation, description, personality, motivations, secrets, voice_notes, is_alive
- location: name, location_type, description, parent_id, gm_notes
- organization: name, org_type, description, goals, resources, is_active
- quest: name, plot_type, status, description, hook, objectives, complications, resolution, reward
- hero: name, classes, backstory, goals, bonds, is_active
- player: name, email, preferences, boundaries, notes
- session: session_number, title, summary, notes, planned_content, highlights
- timeline_event: name, event_date, description, significance, is_public
- secret: name, content, secret_type, reveal_conditions, revealed, known_by`,
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of why you're suggesting these changes (shown to user)",
        },
      },
      required: ["entity_type", "entity_id", "changes"],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const { entity_type, entity_id, changes, reasoning } =
        input as ProposeUpdateInput;

      // Validate entity type
      const validTypes = [
        "campaign",
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

      // Validate changes object
      if (!changes || typeof changes !== "object") {
        return {
          success: false,
          content: "Changes must be an object with fields to update",
        };
      }

      const changeKeys = Object.keys(changes);
      if (changeKeys.length === 0) {
        return {
          success: false,
          content: "Changes object is empty. Specify at least one field to update.",
        };
      }

      // Fetch current entity data for diff display
      const command = ENTITY_COMMANDS[entity_type];
      let currentData: Record<string, unknown> | undefined;
      let entityName: string = entity_id;

      try {
        const entity = await invoke<Record<string, unknown>>(command, {
          id: entity_id,
        });
        // Convert rich text fields to markdown for display
        currentData = convertEntityToMarkdown(entity);
        entityName =
          (entity.name as string) || (entity.title as string) || entity_id;
      } catch (error) {
        return {
          success: false,
          content: `Could not find ${entity_type} with ID "${entity_id}". Use search_entities to find the correct ID.`,
        };
      }

      // Create the proposal
      const proposal = tracker.addUpdateProposal(
        entity_type as typeof UPDATABLE_ENTITY_TYPES[number],
        entity_id,
        changes,
        {
          reasoning,
          currentData,
        }
      );

      // Format response for the agent
      const lines: string[] = [
        `Created proposal to update ${entity_type}: **${entityName}**`,
        "",
        `**Entity ID:** ${entity_id}`,
        `**Proposal ID:** ${proposal.id}`,
        "",
        "**Proposed Changes:**",
      ];

      for (const [key, value] of Object.entries(changes)) {
        const currentValue = currentData?.[key];
        const currentDisplay =
          currentValue !== undefined
            ? String(currentValue).slice(0, 50) +
              (String(currentValue).length > 50 ? "..." : "")
            : "(not set)";
        const newDisplay =
          String(value).slice(0, 50) +
          (String(value).length > 50 ? "..." : "");
        lines.push(`- **${key}:** "${currentDisplay}" → "${newDisplay}"`);
      }

      lines.push("");

      if (reasoning) {
        lines.push(`**Reasoning:** ${reasoning}`);
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
