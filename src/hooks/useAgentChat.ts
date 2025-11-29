/**
 * useAgentChat Hook
 *
 * Connects the chat UI to the AI agent loop.
 * Manages message flow and agent execution.
 */

import { useCallback } from "react";
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
  const { addUserMessage, addAssistantMessage, addToolResult, addError, setRunning } =
    useChatStore();
  const { apiKey, modelPreference } = useAIStore();

  const sendMessage = useCallback(
    async (content: string, campaignId: string) => {
      if (!apiKey) {
        addError("API key not configured");
        return;
      }

      // Add user message to chat
      addUserMessage(content);
      setRunning(true);

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

        // Run the agent
        const result = await runAgent(content, toolRegistry, {
          model,
          systemPrompt,
          maxIterations: 15,
          onMessage: (msg) => {
            if (msg.role === "assistant") {
              if (msg.toolName) {
                // Tool call announcement
                addAssistantMessage(`Using ${msg.toolName}...`, msg.toolName);
              } else if (msg.content) {
                // Regular assistant message
                addAssistantMessage(msg.content);
              }
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

        // Add final response if different from last message
        if (result.response && result.completed) {
          // The final response was already added via onMessage
        }

        if (!result.completed && result.error) {
          addError(result.error);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        addError(message);
      } finally {
        setRunning(false);
      }
    },
    [apiKey, modelPreference, addUserMessage, addAssistantMessage, addToolResult, addError, setRunning]
  );

  return { sendMessage };
}
