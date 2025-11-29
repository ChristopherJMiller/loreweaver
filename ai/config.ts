/**
 * AI Configuration Constants
 *
 * Centralizes all AI-related configuration including model selection,
 * tool permissions, and MCP server settings.
 */

export const AI_CONFIG = {
  models: {
    fast: "claude-haiku-4-5-20251001",
    balanced: "claude-sonnet-4-5-20250929",
    quality: "claude-sonnet-4-5-20250929",
  },

  defaults: {
    maxTurns: 5,
  },

  mcpServer: {
    name: "campaign-context",
    version: "1.0.0",
  },

  // Disable all built-in tools except web search/fetch
  // Agents should only access campaign data through our MCP tools
  disabledTools: [
    "Read",
    "Write",
    "Edit",
    "MultiEdit",
    "Bash",
    "Glob",
    "Grep",
    "NotebookEdit",
    "TodoRead",
    "TodoWrite",
  ],

  // Keep web tools for research capabilities (TTRPG lore, inspiration)
  allowedTools: ["WebSearch", "WebFetch"],
} as const;

export type ModelTier = keyof typeof AI_CONFIG.models;
export type QualityPreference = "speed" | "balanced" | "quality";
