/**
 * propose_patch Tool
 *
 * Proposes patching an existing entity using unified diffs (for text fields)
 * or JSON patches (for structured JSON fields). This enables surgical modifications
 * to large documents without requiring full field replacement.
 */

import { invoke } from "@tauri-apps/api/core";
import { prosemirrorToMarkdown } from "@/ai/utils/content-bridge";
import {
  tryApplyPatches,
  validatePatches,
  type FieldPatch,
} from "@/ai/utils/diff-utils";
import { RICH_TEXT_FIELDS } from "@/types";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { ProposalTracker } from "@/ai/proposals/tracker";
import type { ProposePatchInput, UPDATABLE_ENTITY_TYPES } from "./types";

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

const VALID_ENTITY_TYPES = [
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

/**
 * Factory to create the propose_patch tool with a tracker instance
 */
export function createProposePatchTool(
  tracker: ProposalTracker
): ToolDefinition {
  return {
    name: "propose_patch",
    description: `Propose targeted changes to an entity using diffs. Use this for surgical modifications to large text or JSON fields.

Use this tool instead of propose_update when:
- You're making targeted changes to a large document
- You want to preserve parts of the content you didn't read fully
- You're modifying structured JSON data (stat blocks, character sheets)

For text/markdown fields, provide a unified diff:
\`\`\`
@@ -line,count +line,count @@
-removed line
+added line
\`\`\`

For JSON fields (stat_block_json, character_sheet_json, settings_json), provide RFC 6902 JSON Patch:
\`\`\`json
[{"op": "replace", "path": "/hp/max", "value": 45}]
\`\`\`

IMPORTANT: This does NOT modify the entity immediately. It creates a proposal that the user must approve.`,
    input_schema: {
      type: "object",
      properties: {
        entity_type: {
          type: "string",
          enum: VALID_ENTITY_TYPES,
          description: "Type of entity to patch",
        },
        entity_id: {
          type: "string",
          description:
            "ID of the entity to patch (use search_entities or get_entity to find IDs)",
        },
        patches: {
          type: "array",
          description: "Array of patches to apply to specific fields",
          items: {
            type: "object",
            properties: {
              field: {
                type: "string",
                description: "Name of the field to patch",
              },
              patch_type: {
                type: "string",
                enum: ["unified_diff", "json_patch"],
                description:
                  "Type of patch: unified_diff for text fields, json_patch for JSON fields",
              },
              patch: {
                type: "string",
                description:
                  "The patch content (unified diff string or JSON patch array)",
              },
            },
            required: ["field", "patch_type", "patch"],
          },
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of why you're suggesting these changes (shown to user)",
        },
      },
      required: ["entity_type", "entity_id", "patches"],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const { entity_type, entity_id, patches, reasoning } =
        input as ProposePatchInput;

      // Validate entity type
      if (!VALID_ENTITY_TYPES.includes(entity_type)) {
        return {
          success: false,
          content: `Invalid entity type: ${entity_type}. Must be one of: ${VALID_ENTITY_TYPES.join(", ")}`,
        };
      }

      // Validate patches array
      if (!patches || !Array.isArray(patches) || patches.length === 0) {
        return {
          success: false,
          content: "Patches must be a non-empty array of field patches",
        };
      }

      // Validate each patch
      for (const patch of patches) {
        if (!patch.field || !patch.patch_type || !patch.patch) {
          return {
            success: false,
            content:
              "Each patch must have field, patch_type, and patch properties",
          };
        }
        if (!["unified_diff", "json_patch"].includes(patch.patch_type)) {
          return {
            success: false,
            content: `Invalid patch_type "${patch.patch_type}". Must be "unified_diff" or "json_patch"`,
          };
        }
      }

      // Fetch current entity data
      const command = ENTITY_COMMANDS[entity_type];
      let currentData: Record<string, unknown>;
      let entityName: string = entity_id;

      try {
        const entity = await invoke<Record<string, unknown>>(command, {
          id: entity_id,
        });
        currentData = convertEntityToMarkdown(entity);
        entityName =
          (entity.name as string) || (entity.title as string) || entity_id;
      } catch {
        return {
          success: false,
          content: `Could not find ${entity_type} with ID "${entity_id}". Use search_entities to find the correct ID.`,
        };
      }

      // Convert input patches to internal format
      const fieldPatches: FieldPatch[] = patches.map((p) => ({
        field: p.field,
        patchType: p.patch_type,
        patch: p.patch,
      }));

      // Validate that patches can be applied
      const validationErrors = validatePatches(currentData, fieldPatches);
      if (validationErrors.length > 0) {
        const errorMessages = validationErrors
          .map((e) => `- ${e.field}: ${e.message}`)
          .join("\n");
        return {
          success: false,
          content: `Patches cannot be applied:\n${errorMessages}\n\nTry re-reading the entity to get current content, or use propose_update for full field replacement.`,
        };
      }

      // Try to apply patches to generate preview
      const patchResult = tryApplyPatches(currentData, fieldPatches);
      const previewData = patchResult.result;

      // Create the proposal
      const proposal = tracker.addPatchProposal(
        entity_type as (typeof UPDATABLE_ENTITY_TYPES)[number],
        entity_id,
        fieldPatches,
        {
          reasoning,
          currentData,
          previewData,
        }
      );

      // Format response for the agent
      const lines: string[] = [
        `Created patch proposal for ${entity_type}: **${entityName}**`,
        "",
        `**Entity ID:** ${entity_id}`,
        `**Proposal ID:** ${proposal.id}`,
        "",
        "**Patches:**",
      ];

      for (const patch of fieldPatches) {
        const patchPreview =
          patch.patch.length > 100
            ? patch.patch.slice(0, 100) + "..."
            : patch.patch;
        lines.push(`- **${patch.field}** (${patch.patchType}):`);
        lines.push("```");
        lines.push(patchPreview);
        lines.push("```");
      }

      lines.push("");

      if (reasoning) {
        lines.push(`**Reasoning:** ${reasoning}`);
        lines.push("");
      }

      lines.push(
        "The user will see this proposal with a diff view and can accept, edit, or reject it."
      );

      return {
        success: true,
        content: lines.join("\n"),
        data: proposal,
      };
    },
  };
}
