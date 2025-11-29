/**
 * Agent Module
 *
 * Exports the core agent components for running AI-assisted tasks.
 */

export { WorkItemTracker } from "./work-items";
export type { WorkItem } from "./work-items";

export { runAgent } from "./loop";
export type { AgentConfig, AgentMessage, AgentResult } from "./loop";

export { getSystemPrompt, inferTaskType } from "./prompts";
export type { TaskType } from "./prompts";
