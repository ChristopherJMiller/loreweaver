/**
 * get_location_hierarchy Tool
 *
 * Retrieves location hierarchy (parent chain and children).
 */

import { invoke } from "@tauri-apps/api/core";
import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { Location } from "@/types";

/**
 * Build the parent chain for a location
 */
async function getAncestors(location: Location): Promise<Location[]> {
  const ancestors: Location[] = [];
  let current = location;

  while (current.parent_id) {
    try {
      const parent = await invoke<Location>("get_location", {
        id: current.parent_id,
      });
      ancestors.unshift(parent); // Add to front for top-down order
      current = parent;
    } catch {
      break; // Parent not found, stop traversing
    }
  }

  return ancestors;
}

export const getLocationHierarchyTool: ToolDefinition = {
  name: "get_location_hierarchy",
  description:
    "Get the location hierarchy for a location: its parent chain and immediate children.",
  input_schema: {
    type: "object",
    properties: {
      location_id: {
        type: "string",
        description: "The location ID to get hierarchy for",
      },
    },
    required: ["location_id"],
  },
  handler: async (input: unknown, context: ToolContext): Promise<ToolResult> => {
    const { location_id } = input as { location_id: string };

    try {
      // Get the location itself
      const location = await invoke<Location>("get_location", {
        id: location_id,
      });

      // Get ancestors (parent chain)
      const ancestors = await getAncestors(location);

      // Get children
      const children = await invoke<Location[]>("get_location_children", {
        campaign_id: context.campaignId,
        parent_id: location_id,
      });

      // Build hierarchy visualization
      const lines: string[] = [];
      lines.push(`## Location Hierarchy for ${location.name}`);
      lines.push("");

      // Parent chain
      if (ancestors.length > 0) {
        lines.push("### Ancestors (top to bottom)");
        ancestors.forEach((a, i) => {
          const indent = "  ".repeat(i);
          const type = a.location_type ? ` (${a.location_type})` : "";
          lines.push(`${indent}└─ **${a.name}**${type} [${a.id}]`);
        });
        const indent = "  ".repeat(ancestors.length);
        const type = location.location_type
          ? ` (${location.location_type})`
          : "";
        lines.push(`${indent}└─ **${location.name}**${type} ← current`);
        lines.push("");
      } else {
        lines.push("*No parent locations (this is a top-level location)*");
        lines.push("");
      }

      // Children
      if (children.length > 0) {
        lines.push("### Children");
        children.forEach((c) => {
          const type = c.location_type ? ` (${c.location_type})` : "";
          lines.push(`- **${c.name}**${type} [${c.id}]`);
        });
      } else {
        lines.push("*No child locations*");
      }

      return {
        success: true,
        content: lines.join("\n"),
        data: { location, ancestors, children },
      };
    } catch (error) {
      return {
        success: false,
        content: `Failed to get location hierarchy: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
