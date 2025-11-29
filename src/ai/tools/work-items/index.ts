/**
 * Work Item Tools
 *
 * Tools for the AI agent to track its research plan and progress.
 * These act like a todo list for the agent during a session.
 */

export { createAddWorkItemTool } from "./add-work-item";
export { createUpdateWorkItemTool } from "./update-work-item";
export { createListWorkItemsTool } from "./list-work-items";

import type { ToolDefinition } from "../types";
import type { WorkItemTracker } from "../../agent/work-items";
import { createAddWorkItemTool } from "./add-work-item";
import { createUpdateWorkItemTool } from "./update-work-item";
import { createListWorkItemsTool } from "./list-work-items";

/**
 * Create all work item tools for a given tracker instance
 */
export function createWorkItemTools(
  tracker: WorkItemTracker
): ToolDefinition[] {
  return [
    createAddWorkItemTool(tracker),
    createUpdateWorkItemTool(tracker),
    createListWorkItemsTool(tracker),
  ];
}
