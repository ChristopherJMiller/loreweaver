/**
 * Tool Definition Types
 *
 * Defines the structure for AI agent tools that can be called by Claude.
 */

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import type { PageContext } from "@/ai/context/types";

/**
 * JSON Schema type for tool input properties
 */
export interface JSONSchemaProperty {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

/**
 * Result returned by a tool handler
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;
  /** Markdown-formatted content for the agent to read */
  content: string;
  /** Optional structured data for programmatic use */
  data?: unknown;
}

/**
 * Context passed to tool handlers
 */
export interface ToolContext {
  /** Current campaign ID */
  campaignId: string;

  /** Current page context (optional) - what the user is viewing */
  pageContext?: PageContext;
}

/**
 * Definition of a tool that can be called by the AI agent
 */
export interface ToolDefinition {
  /** Unique tool name (snake_case) */
  name: string;
  /** Description of what the tool does (shown to Claude) */
  description: string;
  /** JSON Schema for the tool's input parameters */
  input_schema: {
    type: "object";
    properties: Record<string, JSONSchemaProperty>;
    required?: string[];
  };
  /** Handler function that executes the tool */
  handler: (input: unknown, context: ToolContext) => Promise<ToolResult>;
}

/**
 * Convert a ToolDefinition to the Anthropic SDK Tool format
 */
export function toAnthropicTool(def: ToolDefinition): Tool {
  return {
    name: def.name,
    description: def.description,
    input_schema: def.input_schema,
  };
}
