/**
 * Agent Loop
 *
 * Core agent execution loop that iterates until the task is complete.
 * Handles tool calling, message accumulation, and stop conditions.
 * Supports streaming for real-time text output.
 */

import type {
  MessageParam,
  ContentBlock,
  ToolUseBlock,
  ToolResultBlockParam,
  Message,
} from "@anthropic-ai/sdk/resources/messages";
import { createMessageStream, APIUserAbortError } from "../client";
import type { ToolRegistry, ToolResult } from "../tools";
import { WorkItemTracker } from "./work-items";

/**
 * Agent configuration options
 */
export interface AgentConfig {
  /** Model to use (e.g., "claude-sonnet-4-20250514") */
  model: string;
  /** System prompt for the agent */
  systemPrompt: string;
  /** Maximum iterations to prevent runaway loops */
  maxIterations?: number;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Callback for streaming text deltas (real-time character-by-character) */
  onTextDelta?: (delta: string) => void;
  /** Callback for complete messages (tool calls, tool results, final text) */
  onMessage?: (message: AgentMessage) => void;
  /** Callback for token usage after each iteration (for live display) */
  onTokenUsage?: (usage: { inputTokens: number; outputTokens: number }) => void;
  /** Optional AbortSignal to cancel the agent run */
  signal?: AbortSignal;
}

/** Tool category determines UI behavior */
export type ToolCategory = "read" | "write" | "internal";

/**
 * Message from the agent (for UI display)
 */
export interface AgentMessage {
  role: "assistant" | "tool_result" | "tool_start" | "thinking";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  /** Structured data from tool result (for rich rendering) */
  toolData?: unknown;
  /** Tool category for routing UI behavior */
  toolCategory?: ToolCategory;
  /** AI-provided flavor text for ephemeral indicators */
  flavor?: string;
}

/**
 * Determine tool category based on tool name
 */
function getToolCategory(toolName: string): ToolCategory {
  const internalTools = ["add_work_item", "update_work_item", "list_work_items"];
  const writeTools = ["propose_create", "propose_update", "propose_patch", "propose_relationship"];

  if (internalTools.includes(toolName)) return "internal";
  if (writeTools.includes(toolName)) return "write";
  return "read";
}

/**
 * Token usage with cache metrics
 */
export interface AgentUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

/**
 * Result of an agent run
 */
export interface AgentResult {
  /** Final text response from the agent */
  response: string;
  /** Total iterations performed */
  iterations: number;
  /** Token usage across all iterations (includes cache metrics) */
  usage: AgentUsage;
  /** Work items tracked during the run */
  workItems: ReturnType<WorkItemTracker["list"]>;
  /** Whether the agent completed normally */
  completed: boolean;
  /** Error if the agent failed */
  error?: string;
  /** Whether the agent was cancelled by user */
  cancelled?: boolean;
  /** Full message history (for conversation memory) */
  messages: MessageParam[];
}

/**
 * Extract text content from ContentBlocks
 */
function extractText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is ContentBlock & { type: "text" } => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Check if response contains tool use
 */
function hasToolUse(blocks: ContentBlock[]): boolean {
  return blocks.some((b) => b.type === "tool_use");
}

/**
 * Extract tool use blocks
 */
function getToolUseBlocks(blocks: ContentBlock[]): ToolUseBlock[] {
  return blocks.filter((b): b is ToolUseBlock => b.type === "tool_use");
}

/**
 * Check if an error is a JSON parse error from incomplete streaming
 */
function isJsonParseError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("json parse") ||
      msg.includes("json.parse") ||
      msg.includes("unexpected end of json") ||
      msg.includes("expected '}'") ||
      msg.includes('expected "}"')
    );
  }
  return false;
}

/**
 * Run the agent loop until completion or max iterations
 * Uses streaming for real-time text output via onTextDelta callback
 *
 * @param userMessage - The new user message to process
 * @param toolRegistry - Registry of available tools
 * @param config - Agent configuration options
 * @param existingMessages - Optional prior conversation history for multi-turn conversations
 */
export async function runAgent(
  userMessage: string,
  toolRegistry: ToolRegistry,
  config: AgentConfig,
  existingMessages?: MessageParam[]
): Promise<AgentResult> {
  const maxIterations = config.maxIterations ?? 20;
  const maxTokens = config.maxTokens ?? 8192;

  // Initialize with existing conversation history if provided, plus new user message
  const messages: MessageParam[] = existingMessages
    ? [...existingMessages, { role: "user", content: userMessage }]
    : [{ role: "user", content: userMessage }];
  const workItemTracker = new WorkItemTracker();

  let iterations = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let finalResponse = "";

  try {
    while (iterations < maxIterations) {
      // Check if aborted before starting iteration
      if (config.signal?.aborted) {
        return {
          response: finalResponse,
          iterations,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
          workItems: workItemTracker.list(),
          completed: false,
          cancelled: true,
          messages,
        };
      }

      iterations++;

      // Track text content as it streams
      let iterationTextContent = "";

      // Helper to create and run a stream with retry on JSON parse errors
      const runStreamWithRetry = async (retryCount = 0): Promise<Message> => {
        // Create streaming message with prompt caching enabled
        // Cache breakpoints: system prompt, tools, and conversation history
        const stream = createMessageStream({
          model: config.model,
          system: config.systemPrompt,
          messages,
          tools: toolRegistry.tools,
          maxTokens,
          cacheSystem: true,
          cacheTools: true,
          cacheMessages: true,
        });

        // Reset text content on retry
        if (retryCount > 0) {
          iterationTextContent = "";
        }

        // Listen for abort signal to cancel stream
        if (config.signal) {
          const abortHandler = () => {
            stream.abort();
          };
          config.signal.addEventListener("abort", abortHandler, { once: true });
        }

        // Stream text deltas to callback
        stream.on("text", (textDelta: string) => {
          iterationTextContent += textDelta;
          config.onTextDelta?.(textDelta);
        });

        try {
          return await stream.finalMessage();
        } catch (streamError) {
          // Check if this was an abort
          if (
            streamError instanceof APIUserAbortError ||
            (streamError instanceof Error && streamError.name === "AbortError")
          ) {
            throw streamError; // Re-throw abort errors
          }

          // Retry once on JSON parse errors (usually from incomplete streaming)
          if (isJsonParseError(streamError) && retryCount < 1) {
            console.warn(
              `JSON parse error during streaming, retrying iteration ${iterations} (attempt ${retryCount + 2})...`,
              streamError
            );
            return runStreamWithRetry(retryCount + 1);
          }

          throw streamError;
        }
      };

      // Wait for stream to complete and get final message
      let response;
      try {
        response = await runStreamWithRetry();
      } catch (streamError) {
        // Check if this was an abort
        if (
          streamError instanceof APIUserAbortError ||
          (streamError instanceof Error && streamError.name === "AbortError")
        ) {
          return {
            response: finalResponse || iterationTextContent,
            iterations,
            usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
            workItems: workItemTracker.list(),
            completed: false,
            cancelled: true,
            messages,
          };
        }
        throw streamError;
      }

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      // Capture cache metrics (cast needed as SDK types may not include these yet)
      const usage = response.usage as {
        input_tokens: number;
        output_tokens: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      };
      totalCacheReadTokens += usage.cache_read_input_tokens ?? 0;
      totalCacheCreationTokens += usage.cache_creation_input_tokens ?? 0;

      // Emit token usage for live display
      config.onTokenUsage?.({
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      // Store text response (use streamed content or extract from blocks)
      const textContent = iterationTextContent || extractText(response.content);
      if (textContent) {
        finalResponse = textContent;
        // Notify that the complete text is ready (for non-streaming consumers)
        config.onMessage?.({
          role: "assistant",
          content: textContent,
        });
      }

      // Add assistant message to history
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Check stop condition
      if (response.stop_reason === "end_turn" && !hasToolUse(response.content)) {
        // Agent finished naturally
        return {
          response: finalResponse,
          iterations,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
          workItems: workItemTracker.list(),
          completed: true,
          messages,
        };
      }

      // Handle tool calls
      if (hasToolUse(response.content)) {
        const toolBlocks = getToolUseBlocks(response.content);
        const toolResults: ToolResultBlockParam[] = [];

        for (const toolBlock of toolBlocks) {
          // Check if aborted before executing tool
          if (config.signal?.aborted) {
            return {
              response: finalResponse,
              iterations,
              usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
              workItems: workItemTracker.list(),
              completed: false,
              cancelled: true,
              messages,
            };
          }

          // Determine tool category for UI behavior
          const category = getToolCategory(toolBlock.name);

          // Extract flavor text if AI provided it
          const input = toolBlock.input as Record<string, unknown> | undefined;
          const flavor = typeof input?.flavor === "string" ? input.flavor : undefined;

          // Emit category-aware UI message before tool execution
          if (category === "read") {
            // Show ephemeral indicator for read tools
            config.onMessage?.({
              role: "tool_start",
              content: "",
              toolName: toolBlock.name,
              toolInput: toolBlock.input,
              toolCategory: "read",
              flavor,
            });
          } else if (category === "internal") {
            // Show subtle thinking indicator for internal tools
            config.onMessage?.({
              role: "thinking",
              content: "",
              toolName: toolBlock.name,
              toolCategory: "internal",
            });
          }
          // Note: "write" tools (proposals) don't show indicators - AI narrates naturally

          // Execute the tool
          const result: ToolResult = await toolRegistry.execute(
            toolBlock.name,
            toolBlock.input
          );

          // Emit tool result with category (silent for errors - just log)
          if (!result.success) {
            console.error(`[Tool Error] ${toolBlock.name}:`, result.content);
          }

          config.onMessage?.({
            role: "tool_result",
            content: result.content,
            toolName: toolBlock.name,
            toolData: result.data,
            toolCategory: category,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: result.content,
            is_error: !result.success,
          });
        }

        // Add tool results to messages
        messages.push({
          role: "user",
          content: toolResults,
        });
      } else if (response.stop_reason === "end_turn") {
        // No tool use and end_turn - we're done
        return {
          response: finalResponse,
          iterations,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
          workItems: workItemTracker.list(),
          completed: true,
          messages,
        };
      }
    }

    // Reached max iterations
    return {
      response: finalResponse,
      iterations,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
      workItems: workItemTracker.list(),
      completed: false,
      error: `Reached maximum iterations (${maxIterations})`,
      messages,
    };
  } catch (error) {
    return {
      response: finalResponse,
      iterations,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, cacheReadTokens: totalCacheReadTokens, cacheCreationTokens: totalCacheCreationTokens },
      workItems: workItemTracker.list(),
      completed: false,
      error: error instanceof Error ? error.message : String(error),
      messages,
    };
  }
}
