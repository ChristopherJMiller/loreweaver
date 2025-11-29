/**
 * update_work_item Tool
 *
 * Allows the agent to update a work item's status and record findings.
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { WorkItemTracker, WorkItem } from "../../agent/work-items";

export function createUpdateWorkItemTool(
  tracker: WorkItemTracker
): ToolDefinition {
  return {
    name: "update_work_item",
    description:
      "Update a work item's status and optionally record what was found. Use this to mark items as in_progress when starting, or completed when done.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The work item ID (e.g., 'wi_1')",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed"],
          description: "New status for the work item",
        },
        result: {
          type: "string",
          description:
            "Summary of what was found or done (required when marking completed)",
        },
      },
      required: ["id", "status"],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const { id, status, result } = input as {
        id: string;
        status: WorkItem["status"];
        result?: string;
      };

      const item = tracker.update(id, status, result);

      if (!item) {
        return {
          success: false,
          content: `Work item ${id} not found.`,
        };
      }

      const statusEmoji =
        status === "completed" ? "✓" : status === "in_progress" ? "⟳" : "○";

      let content = `${statusEmoji} Updated **${item.id}** to ${status}`;
      if (result) {
        content += `\n→ ${result}`;
      }

      return {
        success: true,
        content,
        data: item,
      };
    },
  };
}
