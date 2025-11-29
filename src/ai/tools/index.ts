/**
 * Tool Registry
 *
 * Central registry for all AI agent tools.
 * Combines work item tools, campaign context tools, and proposal tools.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { ToolDefinition, ToolResult, ToolContext } from "./types";
import { toAnthropicTool } from "./types";
import type { WorkItemTracker } from "../agent/work-items";
import type { ProposalTracker } from "../proposals/tracker";
import { createWorkItemTools } from "./work-items";
import { getCampaignContextTools } from "./campaign-context";
import { createProposalTools } from "./entity-proposals";

/**
 * Collection of tools with both Anthropic format and handlers
 */
export interface ToolRegistry {
  /** Tools in Anthropic SDK format for API calls */
  tools: Tool[];
  /** Map of tool name to handler function */
  handlers: Map<string, ToolDefinition["handler"]>;
  /** Execute a tool by name (context is optional, uses default if not provided) */
  execute: (
    name: string,
    input: unknown,
    context?: ToolContext
  ) => Promise<ToolResult>;
}

/**
 * Create a tool registry for an agent session
 *
 * @param workItemTracker - Tracker for work items
 * @param campaignId - Current campaign ID
 * @param proposalTracker - Optional tracker for entity proposals
 */
export function createToolRegistry(
  workItemTracker: WorkItemTracker,
  campaignId: string,
  proposalTracker?: ProposalTracker
): ToolRegistry {
  const definitions: ToolDefinition[] = [
    // Work item tools for tracking research
    ...createWorkItemTools(workItemTracker),

    // Campaign context tools for accessing campaign data
    ...getCampaignContextTools(),

    // Proposal tools for creating/updating entities (if tracker provided)
    ...(proposalTracker ? createProposalTools(proposalTracker) : []),
  ];

  const tools = definitions.map(toAnthropicTool);
  const handlers = new Map<string, ToolDefinition["handler"]>();

  for (const def of definitions) {
    handlers.set(def.name, def.handler);
  }

  const context: ToolContext = { campaignId };

  return {
    tools,
    handlers,
    execute: async (
      name: string,
      input: unknown,
      ctx?: ToolContext
    ): Promise<ToolResult> => {
      const handler = handlers.get(name);
      if (!handler) {
        return {
          success: false,
          content: `Unknown tool: ${name}`,
        };
      }
      return handler(input, ctx ?? context);
    },
  };
}

// Re-export types
export type { ToolDefinition, ToolResult, ToolContext } from "./types";
export { toAnthropicTool } from "./types";
