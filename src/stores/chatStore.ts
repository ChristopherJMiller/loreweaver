/**
 * AI Chat Store
 *
 * Manages chat conversation state for the AI assistant panel.
 * Handles message history, agent execution, and streaming updates.
 */

import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  timestamp: Date;
}

interface ChatState {
  // State
  messages: ChatMessage[];
  isRunning: boolean;
  error: string | null;
  /** ID of message currently being streamed (null if not streaming) */
  streamingMessageId: string | null;

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
}));
