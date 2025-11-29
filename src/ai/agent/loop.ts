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
  /** Optional AbortSignal to cancel the agent run */
  signal?: AbortSignal;
}

/**
 * Message from the agent (for UI display)
 */
export interface AgentMessage {
  role: "assistant" | "tool_result";
  content: string;
  toolName?: string;
  toolInput?: unknown;
}

/**
 * Result of an agent run
 */
export interface AgentResult {
  /** Final text response from the agent */
  response: string;
  /** Total iterations performed */
  iterations: number;
  /** Token usage across all iterations */
  usage: { inputTokens: number; outputTokens: number };
  /** Work items tracked during the run */
  workItems: ReturnType<WorkItemTracker["list"]>;
  /** Whether the agent completed normally */
  completed: boolean;
  /** Error if the agent failed */
  error?: string;
  /** Whether the agent was cancelled by user */
  cancelled?: boolean;
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
 * Run the agent loop until completion or max iterations
 * Uses streaming for real-time text output via onTextDelta callback
 */
export async function runAgent(
  userMessage: string,
  toolRegistry: ToolRegistry,
  config: AgentConfig
): Promise<AgentResult> {
  const maxIterations = config.maxIterations ?? 20;
  const maxTokens = config.maxTokens ?? 4096;

  const messages: MessageParam[] = [{ role: "user", content: userMessage }];
  const workItemTracker = new WorkItemTracker();

  let iterations = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalResponse = "";

  try {
    while (iterations < maxIterations) {
      // Check if aborted before starting iteration
      if (config.signal?.aborted) {
        return {
          response: finalResponse,
          iterations,
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          workItems: workItemTracker.list(),
          completed: false,
          cancelled: true,
        };
      }

      iterations++;

      // Create streaming message
      const stream = createMessageStream({
        model: config.model,
        system: config.systemPrompt,
        messages,
        tools: toolRegistry.tools,
        maxTokens,
      });

      // Track text content as it streams
      let iterationTextContent = "";

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

      // Wait for stream to complete and get final message
      let response;
      try {
        response = await stream.finalMessage();
      } catch (streamError) {
        // Check if this was an abort
        if (
          streamError instanceof APIUserAbortError ||
          (streamError instanceof Error && streamError.name === "AbortError")
        ) {
          return {
            response: finalResponse || iterationTextContent,
            iterations,
            usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
            workItems: workItemTracker.list(),
            completed: false,
            cancelled: true,
          };
        }
        throw streamError;
      }

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

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
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          workItems: workItemTracker.list(),
          completed: true,
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
              usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
              workItems: workItemTracker.list(),
              completed: false,
              cancelled: true,
            };
          }

          config.onMessage?.({
            role: "assistant",
            content: `Using tool: ${toolBlock.name}`,
            toolName: toolBlock.name,
            toolInput: toolBlock.input,
          });

          // Execute the tool
          const result: ToolResult = await toolRegistry.execute(
            toolBlock.name,
            toolBlock.input
          );

          config.onMessage?.({
            role: "tool_result",
            content: result.content,
            toolName: toolBlock.name,
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
          usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
          workItems: workItemTracker.list(),
          completed: true,
        };
      }
    }

    // Reached max iterations
    return {
      response: finalResponse,
      iterations,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      workItems: workItemTracker.list(),
      completed: false,
      error: `Reached maximum iterations (${maxIterations})`,
    };
  } catch (error) {
    return {
      response: finalResponse,
      iterations,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      workItems: workItemTracker.list(),
      completed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
