/**
 * MCP Server Setup
 *
 * Creates an MCP server that provides campaign context tools to Claude agents.
 * These tools allow agents to query the campaign database for context when
 * generating or modifying content.
 *
 * @see https://platform.claude.com/docs/en/agent-sdk/typescript
 */

// TODO: Implement once @anthropic-ai/claude-agent-sdk is installed (#55)
//
// import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
// import { AI_CONFIG } from "../config";
// import * as tools from "./tools";
//
// export const campaignContextServer = createSdkMcpServer({
//   name: AI_CONFIG.mcpServer.name,
//   version: AI_CONFIG.mcpServer.version,
//   tools: Object.values(tools),
// });

/**
 * Placeholder export until SDK is installed
 */
export const campaignContextServer = null;

/**
 * Get MCP server info for debugging/logging
 */
export function getMcpServerInfo() {
  return {
    name: "campaign-context",
    version: "1.0.0",
    tools: [
      "search_entities",
      "get_entity",
      "get_relationships",
      "get_location_hierarchy",
      "get_timeline",
      "get_campaign_context",
    ],
  };
}
