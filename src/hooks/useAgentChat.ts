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
import type { PageContext } from "@/ai/context/types";

export function useAgentChat() {
  const {
    addUserMessage,
    addToolResult,
    addError,
    setRunning,
    startStreaming,
    appendToStreaming,
    finishStreaming,
    addProposal,
    setAbortController,
    addTokenUsage,
    // New ephemeral indicator actions
    addEphemeralIndicator,
    fadeEphemeralIndicator,
    cleanupFadedMessages,
    showThinkingIndicator,
    hideThinkingIndicator,
    // Conversation memory
    agentMessages,
    setAgentMessages,
  } = useChatStore();
  const { apiKey, modelPreference } = useAIStore();

  // Track if we've started streaming for the current iteration
  const isStreamingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string, campaignId: string, pageContext?: PageContext) => {
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

        // Create tool registry with both trackers and page context
        const toolRegistry = createToolRegistry(
          workItemTracker,
          campaignId,
          proposalTracker,
          pageContext
        );

        // Infer task type and get appropriate prompt with page context
        const taskType = inferTaskType(content);
        const systemPrompt = getSystemPrompt(taskType, pageContext);

        // Select model based on preference
        const model = selectModel(modelPreference);

        // Run the agent with streaming, passing existing conversation history
        const result = await runAgent(
          content,
          toolRegistry,
          {
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

              switch (msg.role) {
                case "tool_start":
                  // Show ephemeral indicator for read tools
                  addEphemeralIndicator(msg.toolName!, msg.toolInput, msg.flavor);
                  break;

                case "thinking":
                  // Show subtle thinking dots for internal tools
                  showThinkingIndicator();
                  break;

                case "tool_result":
                  if (msg.toolCategory === "internal") {
                    // Hide thinking indicator, don't show any result card
                    hideThinkingIndicator();
                  } else if (msg.toolCategory === "read") {
                    // Start fade on ephemeral indicator, then add result card
                    fadeEphemeralIndicator();
                    // Add result after brief delay so fade animation is visible
                    setTimeout(() => {
                      const displayContent =
                        msg.content.length > 500
                          ? msg.content.slice(0, 500) + "..."
                          : msg.content;
                      addToolResult(displayContent, msg.toolName!, msg.toolData);
                      // Cleanup faded messages after animation completes
                      setTimeout(() => cleanupFadedMessages(), 350);
                    }, 50);
                  }
                  // Note: "write" category (proposals) handled via ProposalTracker callback
                  break;

                case "assistant":
                  // Regular assistant text is handled via streaming,
                  // so we don't add duplicate messages here
                  break;
              }
            },
          },
          agentMessages // Pass existing conversation history
        );

        // Ensure streaming is finished
        if (isStreamingRef.current) {
          finishStreaming();
          isStreamingRef.current = false;
        }

        // Track token usage including cache metrics (always, even on cancellation/error)
        if (result.usage) {
          addTokenUsage(result.usage);
        }

        // Store updated conversation history for multi-turn memory
        if (result.messages) {
          setAgentMessages(result.messages);
        }

        // Handle cancellation gracefully (don't show error)
        if (result.cancelled) {
          return;
        }

        // Log errors to console but don't show to user - AI handles gracefully
        if (!result.completed && result.error) {
          console.error("[Agent Error]", result.error);
        }
      } catch (err) {
        // Finish streaming on error
        if (isStreamingRef.current) {
          finishStreaming();
          isStreamingRef.current = false;
        }
        // Log to console - critical errors only shown to user
        const message = err instanceof Error ? err.message : "Unknown error occurred";
        console.error("[Agent Error]", message);
        // Only show critical errors (network, auth) to user
        if (message.includes("API") || message.includes("network") || message.includes("unauthorized")) {
          addError(message);
        }
      } finally {
        setAbortController(null);
        setRunning(false);
      }
    },
    [
      apiKey,
      modelPreference,
      addUserMessage,
      addToolResult,
      addError,
      setRunning,
      startStreaming,
      appendToStreaming,
      finishStreaming,
      addProposal,
      setAbortController,
      addTokenUsage,
      addEphemeralIndicator,
      fadeEphemeralIndicator,
      cleanupFadedMessages,
      showThinkingIndicator,
      hideThinkingIndicator,
      agentMessages,
      setAgentMessages,
    ]
  );

  return { sendMessage };
}
