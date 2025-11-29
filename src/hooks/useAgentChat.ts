/**
 * useAgentChat Hook
 *
 * Connects the chat UI to the AI agent loop.
 * Manages message flow and agent execution.
 * Supports streaming for real-time text output.
 * Supports entity proposals for create/update operations.
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
import { ProposalTracker } from "@/ai/proposals/tracker";

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
    addProposal,
    setAbortController,
    addTokenUsage,
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

      // Create AbortController for this request
      const abortController = new AbortController();
      setAbortController(abortController);

      try {
        // Initialize client if needed
        if (!isClientInitialized()) {
          initializeClient(apiKey);
        }

        // Create work item tracker for this session
        const workItemTracker = new WorkItemTracker();

        // Create proposal tracker for entity proposals
        const proposalTracker = new ProposalTracker();

        // Wire up proposal tracker to add proposals to chat
        proposalTracker.setOnProposalCreated((proposal) => {
          addProposal(proposal);
        });

        // Create tool registry with both trackers
        const toolRegistry = createToolRegistry(
          workItemTracker,
          campaignId,
          proposalTracker
        );

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
          signal: abortController.signal,
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
              addToolResult(displayContent, msg.toolName, msg.toolData);
            }
          },
        });

        // Ensure streaming is finished
        if (isStreamingRef.current) {
          finishStreaming();
          isStreamingRef.current = false;
        }

        // Track token usage including cache metrics (always, even on cancellation/error)
        if (result.usage) {
          addTokenUsage(result.usage);
        }

        // Handle cancellation gracefully (don't show error)
        if (result.cancelled) {
          return;
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
        setAbortController(null);
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
      addProposal,
      setAbortController,
      addTokenUsage,
    ]
  );

  return { sendMessage };
}
