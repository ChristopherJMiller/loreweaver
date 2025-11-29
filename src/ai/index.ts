/**
 * AI Layer Main Exports
 *
 * Central export point for all AI-related functionality.
 * Includes both the legacy MCP server approach and the new in-browser agent.
 */

// Configuration
export { AI_CONFIG, type ModelTier, type QualityPreference } from "./config";

// Types
export type {
  AIClientConfig,
  AIQueryOptions,
  TaskType as LegacyTaskType,
  TaskContext,
  EntityType,
  SearchEntitiesInput,
  GetEntityInput,
  GetRelationshipsInput,
  GetLocationHierarchyInput,
  GetTimelineInput,
  GetCampaignContextInput,
  EntityMarkdownFormat,
  ContentPatch,
} from "./types";

// Legacy Model Selection
export {
  selectModel as selectModelLegacy,
  getModelDisplayName,
  estimateContentLength,
} from "./model-selector";

// MCP Server (legacy)
export { campaignContextServer, getMcpServerInfo } from "./mcp-server";

// ============================================
// New In-Browser Agent Architecture
// ============================================

// Client (direct Anthropic SDK)
export {
  initializeClient,
  getClient,
  isClientInitialized,
  resetClient,
  createMessageStream,
  createStructuredMessageStream,
} from "./client";
export type {
  StreamingCallbacks,
  StructuredStreamResult,
  MessageStream,
  MessageStreamEvent,
} from "./client";

// Agent
export {
  runAgent,
  WorkItemTracker,
  getSystemPrompt,
  inferTaskType,
} from "./agent";
export type {
  AgentConfig,
  AgentMessage,
  AgentResult,
  WorkItem,
  TaskType,
} from "./agent";

// Tools
export { createToolRegistry } from "./tools";
export type { ToolRegistry, ToolDefinition, ToolResult, ToolContext } from "./tools";

// Model selection (simplified)
export { selectModel, MODEL_CONFIGS } from "./models";
export type { ModelPreference, ModelConfig } from "./models";
