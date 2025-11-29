/**
 * Anthropic SDK Client Wrapper
 *
 * Provides a configured client for interacting with Claude API.
 * Uses the standard Anthropic SDK with browser compatibility enabled.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ContentBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";

/** Beta flag for structured outputs */
const STRUCTURED_OUTPUT_BETA = "structured-outputs-2025-11-13";

let clientInstance: Anthropic | null = null;

/**
 * Initialize the Anthropic client with the provided API key.
 * Must be called before any AI operations.
 */
export function initializeClient(apiKey: string): void {
  clientInstance = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for Tauri webview context
  });
}

/**
 * Get the initialized client instance.
 * Throws if client has not been initialized.
 */
export function getClient(): Anthropic {
  if (!clientInstance) {
    throw new Error("AI client not initialized. Set API key first.");
  }
  return clientInstance;
}

/**
 * Check if the client has been initialized.
 */
export function isClientInitialized(): boolean {
  return clientInstance !== null;
}

/**
 * Reset the client (e.g., when API key changes).
 */
export function resetClient(): void {
  clientInstance = null;
}

/**
 * Create a message using the Claude API.
 */
export async function createMessage(options: {
  model: string;
  system: string;
  messages: MessageParam[];
  tools?: Tool[];
  maxTokens?: number;
}): Promise<{
  content: ContentBlock[];
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const client = getClient();

  const response = await client.messages.create({
    model: options.model,
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    max_tokens: options.maxTokens ?? 4096,
  });

  return {
    content: response.content,
    stop_reason: response.stop_reason,
    usage: response.usage,
  };
}

/**
 * Create a message with structured JSON output using Anthropic's beta API.
 *
 * Uses Zod schema for:
 * 1. Generating JSON Schema for Anthropic API (guarantees format)
 * 2. Runtime validation of response (catches semantic errors)
 * 3. TypeScript type inference
 */
export async function createStructuredMessage<T>(options: {
  model: string;
  system: string;
  messages: MessageParam[];
  schema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<{
  data: T;
  raw: string;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const client = getClient();

  // Convert Zod schema to JSON Schema for Anthropic API
  // Zod v4 has built-in toJSONSchema
  const jsonSchema = z.toJSONSchema(options.schema);

  const response = await client.beta.messages.create({
    model: options.model,
    system: options.system,
    messages: options.messages,
    max_tokens: options.maxTokens ?? 4096,
    betas: [STRUCTURED_OUTPUT_BETA],
    output_format: {
      type: "json_schema",
      schema: jsonSchema,
    },
  });

  // Extract text content from response
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in structured output response");
  }

  // Parse JSON and validate with Zod
  const parsed = JSON.parse(textBlock.text);
  const validated = options.schema.parse(parsed);

  return {
    data: validated,
    raw: textBlock.text,
    usage: response.usage,
  };
}

// Re-export useful types
export type { MessageParam, Tool, ContentBlock };
