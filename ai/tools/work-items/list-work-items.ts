/**
 * list_work_items Tool
 *
 * Allows the agent to see all current work items and their status.
 */

import type { ToolDefinition, ToolResult, ToolContext } from "../types";
import type { WorkItemTracker } from "../../agent/work-items";

export function createListWorkItemsTool(
  tracker: WorkItemTracker
): ToolDefinition {
  return {
    name: "list_work_items",
    description:
      "List all work items with their current status. Use this to see your research plan and track progress.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
    handler: async (
      _input: unknown,
      _context: ToolContext
    ): Promise<ToolResult> => {
      const items = tracker.list();

      if (items.length === 0) {
        return {
          success: true,
          content:
            "No work items yet. Use `add_work_item` to plan your research.",
          data: [],
        };
      }

      const summary = tracker.getSummary();
      const markdown = tracker.toMarkdown();

      const content = `## Work Items (${summary.completed}/${summary.total} completed)\n\n${markdown}`;

      return {
        success: true,
        content,
        data: items,
      };
    },
  };
}
