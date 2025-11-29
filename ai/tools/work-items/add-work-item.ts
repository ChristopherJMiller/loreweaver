/**
 * add_work_item Tool
 *
 * Allows the agent to add a new work item to track.
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { WorkItemTracker } from "../../agent/work-items";

// The tracker is passed via a closure when creating the tool
export function createAddWorkItemTool(
  tracker: WorkItemTracker
): ToolDefinition {
  return {
    name: "add_work_item",
    description:
      "Add a work item to track something you need to look up or do. Use this to plan your research before executing it.",
    input_schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description:
            "What needs to be looked up or done (e.g., 'Look up character relationships', 'Find timeline events')",
        },
      },
      required: ["description"],
    },
    handler: async (
      input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const { description } = input as { description: string };

      const item = tracker.add(description);

      return {
        success: true,
        content: `Added work item **${item.id}**: ${item.description}`,
        data: item,
      };
    },
  };
}
