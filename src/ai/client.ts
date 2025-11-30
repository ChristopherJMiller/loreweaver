/**
 * Anthropic SDK Client Wrapper
 *
 * Provides a configured client for interacting with Claude API.
 * Uses the standard Anthropic SDK with browser compatibility enabled.
 * Includes both non-streaming and streaming variants for all operations.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  Tool,
  ContentBlock,
  Message,
  MessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import type { MessageStream } from "@anthropic-ai/sdk/lib/MessageStream";
import { z } from "zod";

/** Beta flag for structured outputs */
const STRUCTURED_OUTPUT_BETA = "structured-outputs-2025-11-13";

/**
 * Cache control marker for prompt caching
 * Ephemeral caches have a 5-minute TTL by default
 */
interface CacheControl {
  type: "ephemeral";
}

/**
 * System content block with optional cache control
 */
interface SystemContentBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

/**
 * Extended usage including cache metrics
 */
export interface UsageWithCache {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

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

/**
 * Streaming callbacks for message creation
 */
export interface StreamingCallbacks {
  /** Called with each text delta as it arrives */
  onTextDelta?: (delta: string) => void;
  /** Called when a content block is completed */
  onContentBlock?: (block: ContentBlock) => void;
  /** Called with each streaming event (for advanced use) */
  onEvent?: (event: MessageStreamEvent) => void;
}

/**
 * Add cache_control to the last content block of a message
 * Supports text, tool_use, and tool_result content types
 */
function addCacheControlToMessage(message: MessageParam): MessageParam {
  const content = message.content;

  // If content is a string, convert to content block with cache_control
  if (typeof content === "string") {
    return {
      ...message,
      content: [
        {
          type: "text" as const,
          text: content,
          cache_control: { type: "ephemeral" as const },
        },
      ],
    };
  }

  // If content is an array, add cache_control to the last block
  if (Array.isArray(content) && content.length > 0) {
    const newContent = [...content];
    const lastIndex = content.length - 1;
    const lastBlock = content[lastIndex];

    // Add cache_control to supported block types
    // text, tool_use, and tool_result all support cache_control
    if (
      lastBlock.type === "text" ||
      lastBlock.type === "tool_use" ||
      lastBlock.type === "tool_result"
    ) {
      newContent[lastIndex] = {
        ...lastBlock,
        cache_control: { type: "ephemeral" as const },
      };
      return { ...message, content: newContent };
    }
  }

  return message;
}

/**
 * Create a streaming message using the Claude API.
 *
 * Returns a MessageStream that can be used to listen for events.
 * The stream emits 'text' events for each text delta and provides
 * finalMessage() for the complete response.
 *
 * @param options.cacheSystem - If true, adds cache_control to system prompt
 * @param options.cacheTools - If true, adds cache_control to the last tool definition
 * @param options.cacheMessages - If true, adds cache_control to previous conversation turns
 */
export function createMessageStream(options: {
  model: string;
  system: string;
  messages: MessageParam[];
  tools?: Tool[];
  maxTokens?: number;
  cacheSystem?: boolean;
  cacheTools?: boolean;
  cacheMessages?: boolean;
}): MessageStream {
  const client = getClient();

  // Convert system string to content block array with optional caching
  const systemBlocks: SystemContentBlock[] = [
    {
      type: "text",
      text: options.system,
      ...(options.cacheSystem && { cache_control: { type: "ephemeral" as const } }),
    },
  ];

  // Add cache_control to the last tool if caching is enabled
  // The SDK's Tool type already supports cache_control
  const tools = options.tools?.map((tool, i, arr) => {
    if (options.cacheTools && i === arr.length - 1) {
      return { ...tool, cache_control: { type: "ephemeral" as const } };
    }
    return tool;
  });

  // Add cache_control to conversation history if enabled
  // We cache all messages except the last one (which is the new user message)
  // This allows the conversation history to be cached across turns
  let messages = options.messages;
  if (options.cacheMessages && messages.length > 1) {
    messages = messages.map((msg, i) => {
      // Add cache_control to the second-to-last message
      // This creates a cache breakpoint right before the new user input
      if (i === messages.length - 2) {
        return addCacheControlToMessage(msg);
      }
      return msg;
    });
  }

  return client.messages.stream({
    model: options.model,
    system: systemBlocks,
    messages,
    tools,
    max_tokens: options.maxTokens ?? 4096,
  });
}

/**
 * Streaming result for structured output
 */
export interface StructuredStreamResult<T> {
  /** The validated data */
  data: T;
  /** The raw JSON string */
  raw: string;
  /** Token usage */
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Create a streaming message with structured JSON output.
 *
 * Streams text deltas via callback and returns the validated result.
 * Use partial-json library in the callback to parse incomplete JSON.
 */
export async function createStructuredMessageStream<T>(options: {
  model: string;
  system: string;
  messages: MessageParam[];
  schema: z.ZodType<T>;
  maxTokens?: number;
  onTextDelta?: (delta: string, accumulated: string) => void;
}): Promise<StructuredStreamResult<T>> {
  const client = getClient();

  // Convert Zod schema to JSON Schema for Anthropic API
  const jsonSchema = z.toJSONSchema(options.schema);

  const stream = client.beta.messages.stream({
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

  // Accumulate text and emit deltas
  let accumulated = "";
  stream.on("text", (textDelta: string) => {
    accumulated += textDelta;
    options.onTextDelta?.(textDelta, accumulated);
  });

  // Wait for stream to complete
  const finalMessage = await stream.finalMessage();

  // Extract text content from response
  const textBlock = finalMessage.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content in structured output response");
  }

  // Parse JSON and validate with Zod
  const parsed = JSON.parse(textBlock.text);
  const validated = options.schema.parse(parsed);

  return {
    data: validated,
    raw: textBlock.text,
    usage: finalMessage.usage,
  };
}

// Re-export useful types
export type { MessageParam, Tool, ContentBlock, Message, MessageStreamEvent, MessageStream };

// Re-export error type for abort handling
export { APIUserAbortError } from "@anthropic-ai/sdk";
