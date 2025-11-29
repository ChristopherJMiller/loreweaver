/**
 * AI Chat Store
 *
 * Manages chat conversation state for the AI assistant panel.
 * Handles message history, agent execution, streaming updates, and proposals.
 */

import { create } from "zustand";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error" | "proposal";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  timestamp: Date;
  /** Proposal data for proposal messages */
  proposal?: EntityProposal;
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

  // Actions
  addUserMessage: (content: string) => string;
  addAssistantMessage: (content: string, toolName?: string) => string;
  addToolResult: (content: string, toolName: string) => string;
  addError: (error: string) => string;
  updateMessage: (id: string, content: string) => void;
  setRunning: (running: boolean) => void;
  clearMessages: () => void;
  clearError: () => void;

  // Streaming actions
  /** Start streaming a new assistant message, returns the message ID */
  startStreaming: () => string;
  /** Append text delta to the currently streaming message */
  appendToStreaming: (delta: string) => void;
  /** Finish streaming (clears streamingMessageId) */
  finishStreaming: () => void;

  // Cancellation actions
  /** Store the abort controller for the current operation */
  setAbortController: (controller: AbortController | null) => void;
  /** Cancel the current operation */
  cancelOperation: () => void;

  // Proposal actions
  /** Add a proposal message, returns the message ID */
  addProposal: (proposal: EntityProposal) => string;
  /** Update a proposal's status in its message */
  updateProposalStatus: (
    proposalId: string,
    status: EntityProposal["status"]
  ) => void;
  /** Get a proposal message by proposal ID */
  getProposalMessage: (proposalId: string) => ChatMessage | undefined;
}

let messageCounter = 0;

function generateId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isRunning: false,
  error: null,
  streamingMessageId: null,
  abortController: null,

  addUserMessage: (content: string) => {
    const id = generateId();
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

  addToolResult: (content: string, toolName: string) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "tool",
          content,
          toolName,
          timestamp: new Date(),
        },
      ],
    }));
    return id;
  },

  addError: (error: string) => {
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

  clearMessages: () => {
    set({ messages: [], error: null });
  },

  clearError: () => {
    set({ error: null });
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

    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === streamingMessageId
          ? { ...msg, content: msg.content + delta }
          : msg
      ),
    }));
  },

  finishStreaming: () => {
    set({ streamingMessageId: null });
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

  addProposal: (proposal: EntityProposal) => {
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
    return id;
  },

  updateProposalStatus: (
    proposalId: string,
    status: EntityProposal["status"]
  ) => {
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.proposal?.id === proposalId) {
          return {
            ...msg,
            proposal: { ...msg.proposal, status },
          };
        }
        return msg;
      }),
    }));
  },

  getProposalMessage: (proposalId: string) => {
    return get().messages.find((msg) => msg.proposal?.id === proposalId);
  },
}));
