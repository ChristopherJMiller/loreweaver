/**
 * AI Chat Store
 *
 * Manages chat conversation state for the AI assistant panel.
 * Handles message history, agent execution, streaming updates, and proposals.
 * Supports persistence to database via Tauri commands.
 */

import { create } from "zustand";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";
import { aiConversations, type AiMessageResponse } from "@/lib/tauri";
import type { AiContextType } from "@/types";

/** Tool category determines UI behavior */
export type ToolCategory = "read" | "write" | "internal";

/** Display mode for message rendering */
export type MessageDisplayMode = "normal" | "ephemeral" | "fading" | "hidden";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error" | "proposal";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  /** Structured data from tool result (for rich rendering) */
  toolData?: unknown;
  timestamp: Date;
  /** Proposal data for proposal messages */
  proposal?: EntityProposal;
  /** UI display mode for this message */
  displayMode?: MessageDisplayMode;
  /** When the fade animation started (for cleanup timing) */
  fadeStartedAt?: number;
  /** Tool category for routing display logic */
  toolCategory?: ToolCategory;
  /** AI-provided flavor text for ephemeral indicators */
  flavor?: string;
}

interface ChatState {
  // State
  messages: ChatMessage[];
  isRunning: boolean;
  error: string | null;
  /** ID of message currently being streamed (null if not streaming) */
  streamingMessageId: string | null;
  /** AbortController for cancelling the current operation */
  abortController: AbortController | null;
  /** Session token usage tracking */
  sessionInputTokens: number;
  sessionOutputTokens: number;
  /** Session cache token tracking */
  sessionCacheReadTokens: number;
  sessionCacheCreationTokens: number;

  // Persistence state
  /** Current conversation ID in database */
  conversationId: string | null;
  /** Current context type (sidebar or fullpage) */
  contextType: AiContextType | null;
  /** Current campaign ID */
  campaignId: string | null;
  /** Whether conversation is being loaded */
  isLoading: boolean;

  // Ephemeral indicator state
  /** Currently active ephemeral indicator ID (one at a time) */
  activeEphemeralId: string | null;
  /** Whether thinking indicator is active (for internal tools) */
  thinkingActive: boolean;

  // Agent conversation memory
  /** Full Anthropic-format message history for agent continuity */
  agentMessages: MessageParam[];

  // Actions
  addUserMessage: (content: string) => Promise<string>;
  addAssistantMessage: (content: string, toolName?: string) => string;
  addToolResult: (content: string, toolName: string, toolData?: unknown) => Promise<string>;
  addError: (error: string) => Promise<string>;
  updateMessage: (id: string, content: string) => void;
  setRunning: (running: boolean) => void;
  clearMessages: () => Promise<void>;
  clearError: () => void;
  /** Update agent message history (for conversation memory) */
  setAgentMessages: (messages: MessageParam[]) => Promise<void>;
  /** Add token usage from an agent run (includes cache metrics) */
  addTokenUsage: (usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  }) => Promise<void>;

  // Persistence actions
  /** Load conversation from database for given campaign and context */
  loadConversation: (campaignId: string, contextType: AiContextType) => Promise<void>;

  // Streaming actions
  /** Start streaming a new assistant message, returns the message ID */
  startStreaming: () => string;
  /** Append text delta to the currently streaming message */
  appendToStreaming: (delta: string) => void;
  /** Finish streaming (clears streamingMessageId and persists) */
  finishStreaming: () => Promise<void>;

  // Cancellation actions
  /** Store the abort controller for the current operation */
  setAbortController: (controller: AbortController | null) => void;
  /** Cancel the current operation */
  cancelOperation: () => void;

  // Proposal actions
  /** Add a proposal message, returns the message ID */
  addProposal: (proposal: EntityProposal) => Promise<string>;
  /** Update a proposal's status in its message (persists to database) */
  updateProposalStatus: (
    proposalId: string,
    status: EntityProposal["status"]
  ) => Promise<void>;
  /** Get a proposal message by proposal ID */
  getProposalMessage: (proposalId: string) => ChatMessage | undefined;

  // Ephemeral indicator actions
  /** Add ephemeral indicator for read tools (returns message ID) */
  addEphemeralIndicator: (
    toolName: string,
    toolInput?: unknown,
    flavor?: string
  ) => string;
  /** Start fade animation on current ephemeral indicator */
  fadeEphemeralIndicator: () => void;
  /** Remove faded ephemeral messages after animation completes */
  cleanupFadedMessages: () => void;
  /** Show thinking indicator for internal tools */
  showThinkingIndicator: () => void;
  /** Hide thinking indicator */
  hideThinkingIndicator: () => void;
}

let messageCounter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// Streaming buffer for batching updates
let streamingBuffer = "";
let streamingRafId: number | null = null;

/**
 * Convert a database message to a ChatMessage
 */
function dbMessageToChatMessage(msg: AiMessageResponse): ChatMessage {
  return {
    id: msg.id,
    role: msg.role as ChatMessage["role"],
    content: msg.content,
    toolName: msg.tool_name ?? undefined,
    toolInput: msg.tool_input_json ? JSON.parse(msg.tool_input_json) : undefined,
    toolData: msg.tool_data_json ? JSON.parse(msg.tool_data_json) : undefined,
    proposal: msg.proposal_json ? JSON.parse(msg.proposal_json) : undefined,
    timestamp: new Date(msg.created_at),
  };
}

/**
 * Persist a message to the database
 */
async function persistMessage(
  conversationId: string,
  role: string,
  content: string,
  toolName?: string,
  toolInput?: unknown,
  toolData?: unknown,
  proposal?: EntityProposal
): Promise<AiMessageResponse> {
  return aiConversations.addMessage({
    conversation_id: conversationId,
    role,
    content,
    tool_name: toolName,
    tool_input_json: toolInput ? JSON.stringify(toolInput) : undefined,
    tool_data_json: toolData ? JSON.stringify(toolData) : undefined,
    proposal_json: proposal ? JSON.stringify(proposal) : undefined,
  });
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isRunning: false,
  error: null,
  streamingMessageId: null,
  abortController: null,
  sessionInputTokens: 0,
  sessionOutputTokens: 0,
  sessionCacheReadTokens: 0,
  sessionCacheCreationTokens: 0,
  conversationId: null,
  contextType: null,
  campaignId: null,
  isLoading: false,
  activeEphemeralId: null,
  thinkingActive: false,
  agentMessages: [],

  loadConversation: async (campaignId: string, contextType: AiContextType) => {
    const state = get();

    // Skip if already loaded for this campaign/context
    if (state.campaignId === campaignId && state.contextType === contextType && state.conversationId) {
      return;
    }

    set({ isLoading: true });

    try {
      // Load or create conversation
      const result = await aiConversations.load({
        campaign_id: campaignId,
        context_type: contextType,
      });

      if (result) {
        // Conversation exists, hydrate messages
        const messages = result.messages.map(dbMessageToChatMessage);
        // Hydrate agent messages from JSON (for conversation memory)
        const agentMessages = result.conversation.agent_messages_json
          ? JSON.parse(result.conversation.agent_messages_json)
          : [];
        set({
          conversationId: result.conversation.id,
          contextType,
          campaignId,
          messages,
          agentMessages,
          sessionInputTokens: result.conversation.total_input_tokens,
          sessionOutputTokens: result.conversation.total_output_tokens,
          sessionCacheReadTokens: result.conversation.total_cache_read_tokens,
          sessionCacheCreationTokens: result.conversation.total_cache_creation_tokens,
          isLoading: false,
          error: null,
        });
      } else {
        // No conversation exists, create one
        const conversation = await aiConversations.getOrCreate({
          campaign_id: campaignId,
          context_type: contextType,
        });
        set({
          conversationId: conversation.id,
          contextType,
          campaignId,
          messages: [],
          sessionInputTokens: 0,
          sessionOutputTokens: 0,
          sessionCacheReadTokens: 0,
          sessionCacheCreationTokens: 0,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
      set({ isLoading: false, error: String(err) });
    }
  },

  addUserMessage: async (content: string) => {
    const { conversationId } = get();
    const id = generateId();

    // Add to local state immediately
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "user",
          content,
          timestamp: new Date(),
        },
      ],
      error: null,
    }));

    // Persist to database
    if (conversationId) {
      try {
        const dbMsg = await persistMessage(conversationId, "user", content);
        // Update ID to match database
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, id: dbMsg.id } : msg
          ),
        }));
        return dbMsg.id;
      } catch (err) {
        console.error("Failed to persist user message:", err);
      }
    }

    return id;
  },

  addAssistantMessage: (content: string, toolName?: string) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "assistant",
          content,
          toolName,
          timestamp: new Date(),
        },
      ],
    }));
    return id;
  },

  addToolResult: async (content: string, toolName: string, toolData?: unknown) => {
    const { conversationId } = get();
    const id = generateId();

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "tool",
          content,
          toolName,
          toolData,
          timestamp: new Date(),
        },
      ],
    }));

    // Persist to database
    if (conversationId) {
      try {
        const dbMsg = await persistMessage(
          conversationId,
          "tool",
          content,
          toolName,
          undefined,
          toolData
        );
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, id: dbMsg.id } : msg
          ),
        }));
        return dbMsg.id;
      } catch (err) {
        console.error("Failed to persist tool result:", err);
      }
    }

    return id;
  },

  addError: async (error: string) => {
    const { conversationId } = get();
    const id = generateId();

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "error",
          content: error,
          timestamp: new Date(),
        },
      ],
      error,
      isRunning: false,
    }));

    // Persist to database
    if (conversationId) {
      try {
        const dbMsg = await persistMessage(conversationId, "error", error);
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, id: dbMsg.id } : msg
          ),
        }));
        return dbMsg.id;
      } catch (err) {
        console.error("Failed to persist error:", err);
      }
    }

    return id;
  },

  updateMessage: (id: string, content: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content } : msg
      ),
    }));
  },

  setRunning: (running: boolean) => {
    set({ isRunning: running });
  },

  clearMessages: async () => {
    const { conversationId } = get();

    // Clear local state (including agent conversation memory)
    set({
      messages: [],
      agentMessages: [],
      error: null,
      sessionInputTokens: 0,
      sessionOutputTokens: 0,
      sessionCacheReadTokens: 0,
      sessionCacheCreationTokens: 0,
    });

    // Clear in database
    if (conversationId) {
      try {
        await aiConversations.clear({ conversation_id: conversationId });
      } catch (err) {
        console.error("Failed to clear conversation:", err);
      }
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setAgentMessages: async (messages: MessageParam[]) => {
    const { conversationId } = get();
    set({ agentMessages: messages });

    // Persist to database
    if (conversationId) {
      try {
        await aiConversations.updateAgentMessages({
          conversation_id: conversationId,
          agent_messages_json: JSON.stringify(messages),
        });
      } catch (err) {
        console.error("Failed to persist agent messages:", err);
      }
    }
  },

  addTokenUsage: async (usage) => {
    const { conversationId } = get();

    set((state) => ({
      sessionInputTokens: state.sessionInputTokens + usage.inputTokens,
      sessionOutputTokens: state.sessionOutputTokens + usage.outputTokens,
      sessionCacheReadTokens: state.sessionCacheReadTokens + usage.cacheReadTokens,
      sessionCacheCreationTokens: state.sessionCacheCreationTokens + usage.cacheCreationTokens,
    }));

    // Update in database
    if (conversationId) {
      try {
        await aiConversations.updateTokenCounts({
          conversation_id: conversationId,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cache_read_tokens: usage.cacheReadTokens,
          cache_creation_tokens: usage.cacheCreationTokens,
        });
      } catch (err) {
        console.error("Failed to update token counts:", err);
      }
    }
  },

  startStreaming: () => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ],
      streamingMessageId: id,
    }));
    return id;
  },

  appendToStreaming: (delta: string) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;

    // Buffer the delta and batch updates using requestAnimationFrame
    streamingBuffer += delta;

    if (streamingRafId === null) {
      streamingRafId = requestAnimationFrame(() => {
        const bufferedContent = streamingBuffer;
        streamingBuffer = "";
        streamingRafId = null;

        const { streamingMessageId: currentId } = get();
        if (!currentId) return;

        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === currentId
              ? { ...msg, content: msg.content + bufferedContent }
              : msg
          ),
        }));
      });
    }
  },

  finishStreaming: async () => {
    const { streamingMessageId, conversationId } = get();

    // Flush any remaining buffered content
    if (streamingRafId !== null) {
      cancelAnimationFrame(streamingRafId);
      streamingRafId = null;
    }

    let finalContent = "";

    if (streamingBuffer) {
      if (streamingMessageId) {
        const bufferedContent = streamingBuffer;
        streamingBuffer = "";
        set((state) => {
          const updatedMessages = state.messages.map((msg) => {
            if (msg.id === streamingMessageId) {
              finalContent = msg.content + bufferedContent;
              return { ...msg, content: finalContent };
            }
            return msg;
          });
          return {
            messages: updatedMessages,
            streamingMessageId: null,
          };
        });
      }
    } else {
      // Get the final content
      const state = get();
      const msg = state.messages.find((m) => m.id === streamingMessageId);
      finalContent = msg?.content || "";
      streamingBuffer = "";
      set({ streamingMessageId: null });
    }

    // Persist the completed streaming message
    if (conversationId && streamingMessageId && finalContent) {
      try {
        const dbMsg = await persistMessage(conversationId, "assistant", finalContent);
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === streamingMessageId ? { ...msg, id: dbMsg.id } : msg
          ),
        }));
      } catch (err) {
        console.error("Failed to persist streaming message:", err);
      }
    }
  },

  setAbortController: (controller: AbortController | null) => {
    set({ abortController: controller });
  },

  cancelOperation: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null });
    }
  },

  addProposal: async (proposal: EntityProposal) => {
    const { conversationId } = get();
    const id = generateId();

    // Generate a summary for the proposal content
    let content: string;
    if (proposal.operation === "create") {
      content = `Proposing to create ${proposal.entityType}: **${proposal.data.name}**`;
    } else if (proposal.operation === "update") {
      const fields = Object.keys(proposal.changes).join(", ");
      content = `Proposing to update ${proposal.entityType}: fields [${fields}]`;
    } else {
      content = `Proposing relationship: ${proposal.sourceName} → ${proposal.relationshipType} → ${proposal.targetName}`;
    }

    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "proposal",
          content,
          proposal,
          timestamp: new Date(),
        },
      ],
    }));

    // Persist to database
    if (conversationId) {
      try {
        const dbMsg = await persistMessage(
          conversationId,
          "proposal",
          content,
          undefined,
          undefined,
          undefined,
          proposal
        );
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, id: dbMsg.id } : msg
          ),
        }));
        return dbMsg.id;
      } catch (err) {
        console.error("Failed to persist proposal:", err);
      }
    }

    return id;
  },

  updateProposalStatus: async (
    proposalId: string,
    status: EntityProposal["status"]
  ) => {
    const state = get();

    // Find the message containing this proposal
    const message = state.messages.find((msg) => msg.proposal?.id === proposalId);
    if (!message?.proposal) return;

    // Create updated proposal
    const updatedProposal = { ...message.proposal, status };

    // Update local state immediately for responsiveness
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.proposal?.id === proposalId) {
          return {
            ...msg,
            proposal: updatedProposal,
          };
        }
        return msg;
      }),
    }));

    // Persist to database
    try {
      await aiConversations.updateProposal({
        message_id: message.id,
        proposal_json: JSON.stringify(updatedProposal),
      });
    } catch (err) {
      console.error("Failed to persist proposal status:", err);
    }
  },

  getProposalMessage: (proposalId: string) => {
    return get().messages.find((msg) => msg.proposal?.id === proposalId);
  },

  // Ephemeral indicator implementations

  addEphemeralIndicator: (
    toolName: string,
    toolInput?: unknown,
    flavor?: string
  ) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "tool",
          content: "",
          toolName,
          toolInput,
          displayMode: "ephemeral",
          toolCategory: "read",
          flavor,
          timestamp: new Date(),
        },
      ],
      activeEphemeralId: id,
    }));
    return id;
  },

  fadeEphemeralIndicator: () => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === state.activeEphemeralId
          ? { ...msg, displayMode: "fading" as const, fadeStartedAt: Date.now() }
          : msg
      ),
      activeEphemeralId: null,
    }));
  },

  cleanupFadedMessages: () => {
    const now = Date.now();
    set((state) => ({
      messages: state.messages.filter((msg) => {
        // Keep non-fading messages
        if (msg.displayMode !== "fading") return true;
        // Remove faded messages after 350ms (300ms fade + 50ms buffer)
        if (msg.fadeStartedAt && now - msg.fadeStartedAt >= 350) return false;
        return true;
      }),
    }));
  },

  showThinkingIndicator: () => {
    set({ thinkingActive: true });
  },

  hideThinkingIndicator: () => {
    set({ thinkingActive: false });
  },
}));
