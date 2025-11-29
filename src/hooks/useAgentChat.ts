/**
 * useAgentChat Hook
 *
 * Connects the chat UI to the AI agent loop.
 * Manages message flow and agent execution.
 * Supports streaming for real-time text output.
 */

import { useCallback, useRef } from "react";
import { useChatStore } from "@/stores";
import { useAIStore } from "@/stores/aiStore";
import {
  initializeClient,
  isClientInitialized,
  runAgent,
  createToolRegistry,
  WorkItemTracker,
  getSystemPrompt,
  inferTaskType,
  selectModel,
} from "@/ai";

export function useAgentChat() {
  const {
    addUserMessage,
    addAssistantMessage,
    addToolResult,
    addError,
    setRunning,
    startStreaming,
    appendToStreaming,
    finishStreaming,
  } = useChatStore();
  const { apiKey, modelPreference } = useAIStore();

  // Track if we've started streaming for the current iteration
  const isStreamingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string, campaignId: string) => {
      if (!apiKey) {
        addError("API key not configured");
        return;
      }

      // Add user message to chat
      addUserMessage(content);
      setRunning(true);
      isStreamingRef.current = false;

      try {
        // Initialize client if needed
        if (!isClientInitialized()) {
          initializeClient(apiKey);
        }

        // Create work item tracker for this session
        const workItemTracker = new WorkItemTracker();

        // Create tool registry
        const toolRegistry = createToolRegistry(workItemTracker, campaignId);

        // Infer task type and get appropriate prompt
        const taskType = inferTaskType(content);
        const systemPrompt = getSystemPrompt(taskType);

        // Select model based on preference
        const model = selectModel(modelPreference);

        // Run the agent with streaming
        const result = await runAgent(content, toolRegistry, {
          model,
          systemPrompt,
          maxIterations: 15,
          onTextDelta: (delta) => {
            // Start streaming message on first delta
            if (!isStreamingRef.current) {
              startStreaming();
              isStreamingRef.current = true;
            }
            appendToStreaming(delta);
          },
          onMessage: (msg) => {
            // Finish current streaming message before adding new messages
            if (isStreamingRef.current) {
              finishStreaming();
              isStreamingRef.current = false;
            }

            if (msg.role === "assistant") {
              if (msg.toolName) {
                // Tool call announcement
                addAssistantMessage(`Using ${msg.toolName}...`, msg.toolName);
              }
              // Note: Regular assistant text is now handled via streaming,
              // so we don't add duplicate messages here
            } else if (msg.role === "tool_result" && msg.toolName) {
              // Truncate long tool results for display
              const displayContent =
                msg.content.length > 500
                  ? msg.content.slice(0, 500) + "..."
                  : msg.content;
              addToolResult(displayContent, msg.toolName);
            }
          },
        });

        // Ensure streaming is finished
        if (isStreamingRef.current) {
          finishStreaming();
          isStreamingRef.current = false;
        }

        if (!result.completed && result.error) {
          addError(result.error);
        }
      } catch (err) {
        // Finish streaming on error
        if (isStreamingRef.current) {
          finishStreaming();
          isStreamingRef.current = false;
        }
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        addError(message);
      } finally {
        setRunning(false);
      }
    },
    [
      apiKey,
      modelPreference,
      addUserMessage,
      addAssistantMessage,
      addToolResult,
      addError,
      setRunning,
      startStreaming,
      appendToStreaming,
      finishStreaming,
    ]
  );

  return { sendMessage };
}
