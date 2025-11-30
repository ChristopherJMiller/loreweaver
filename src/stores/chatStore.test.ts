import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useChatStore } from "./chatStore";
import type { EntityProposal } from "@/ai/tools/entity-proposals/types";

const mockInvoke = vi.mocked(invoke);

describe("chatStore - Persistence", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    useChatStore.setState({
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
    });
  });

  describe("loadConversation", () => {
    it("loads existing conversation with messages using snake_case", async () => {
      mockInvoke.mockResolvedValueOnce({
        conversation: {
          id: "conv-uuid",
          campaign_id: "camp-uuid",
          context_type: "sidebar",
          total_input_tokens: 100,
          total_output_tokens: 50,
          total_cache_read_tokens: 25,
          total_cache_creation_tokens: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        messages: [
          {
            id: "msg-1",
            conversation_id: "conv-uuid",
            role: "user",
            content: "Hello",
            tool_name: null,
            tool_input_json: null,
            tool_data_json: null,
            proposal_json: null,
            message_order: 1,
            created_at: "2024-01-01T00:00:00Z",
          },
          {
            id: "msg-2",
            conversation_id: "conv-uuid",
            role: "assistant",
            content: "Hi there",
            tool_name: null,
            tool_input_json: null,
            tool_data_json: null,
            proposal_json: null,
            message_order: 2,
            created_at: "2024-01-01T00:00:01Z",
          },
        ],
      });

      const store = useChatStore.getState();
      await store.loadConversation("camp-uuid", "sidebar");

      // Verify load command was called with snake_case
      expect(mockInvoke).toHaveBeenCalledWith("load_ai_conversation", {
        campaign_id: "camp-uuid",
        context_type: "sidebar",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("context_type");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("contextType");

      // Verify state is updated
      const state = useChatStore.getState();
      expect(state.conversationId).toBe("conv-uuid");
      expect(state.contextType).toBe("sidebar");
      expect(state.campaignId).toBe("camp-uuid");
      expect(state.messages).toHaveLength(2);
      expect(state.messages[0].content).toBe("Hello");
      expect(state.sessionInputTokens).toBe(100);
      expect(state.sessionOutputTokens).toBe(50);
      expect(state.sessionCacheReadTokens).toBe(25);
      expect(state.sessionCacheCreationTokens).toBe(10);
    });

    it("creates new conversation when none exists", async () => {
      mockInvoke
        .mockResolvedValueOnce(null) // load returns null
        .mockResolvedValueOnce({
          // getOrCreate returns new conversation
          id: "new-conv-uuid",
          campaign_id: "camp-uuid",
          context_type: "fullpage",
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cache_read_tokens: 0,
          total_cache_creation_tokens: 0,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        });

      const store = useChatStore.getState();
      await store.loadConversation("camp-uuid", "fullpage");

      // Verify both commands were called
      expect(mockInvoke).toHaveBeenNthCalledWith(1, "load_ai_conversation", {
        campaign_id: "camp-uuid",
        context_type: "fullpage",
      });
      expect(mockInvoke).toHaveBeenNthCalledWith(
        2,
        "get_or_create_ai_conversation",
        {
          campaign_id: "camp-uuid",
          context_type: "fullpage",
        }
      );

      const state = useChatStore.getState();
      expect(state.conversationId).toBe("new-conv-uuid");
      expect(state.messages).toHaveLength(0);
    });

    it("skips loading if already loaded for same campaign/context", async () => {
      useChatStore.setState({
        conversationId: "existing-conv",
        campaignId: "camp-uuid",
        contextType: "sidebar",
      });

      const store = useChatStore.getState();
      await store.loadConversation("camp-uuid", "sidebar");

      // Should not call invoke
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("addUserMessage", () => {
    it("persists user message with snake_case", async () => {
      useChatStore.setState({ conversationId: "conv-uuid" });

      mockInvoke.mockResolvedValue({
        id: "msg-db-uuid",
        conversation_id: "conv-uuid",
        role: "user",
        content: "Test message",
        tool_name: null,
        tool_input_json: null,
        tool_data_json: null,
        proposal_json: null,
        message_order: 1,
        created_at: "2024-01-01T00:00:00Z",
      });

      const store = useChatStore.getState();
      await store.addUserMessage("Test message");

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "user",
        content: "Test message",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("conversation_id");
      expect(callArgs).not.toHaveProperty("conversationId");

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].id).toBe("msg-db-uuid");
      expect(state.messages[0].content).toBe("Test message");
    });

    it("does not persist when conversationId is null", async () => {
      useChatStore.setState({ conversationId: null });

      const store = useChatStore.getState();
      await store.addUserMessage("Test message");

      expect(mockInvoke).not.toHaveBeenCalled();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe("Test message");
    });
  });

  describe("addToolResult", () => {
    it("persists tool result with tool_data_json", async () => {
      useChatStore.setState({ conversationId: "conv-uuid" });

      const toolData = { entity_id: "123", name: "Test Entity" };

      mockInvoke.mockResolvedValue({
        id: "msg-tool-uuid",
        conversation_id: "conv-uuid",
        role: "tool",
        content: "Found entity",
        tool_name: "get_entity",
        tool_input_json: null,
        tool_data_json: JSON.stringify(toolData),
        proposal_json: null,
        message_order: 2,
        created_at: "2024-01-01T00:00:00Z",
      });

      const store = useChatStore.getState();
      await store.addToolResult("Found entity", "get_entity", toolData);

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "tool",
        content: "Found entity",
        tool_name: "get_entity",
        tool_input_json: undefined,
        tool_data_json: JSON.stringify(toolData),
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("tool_name");
      expect(callArgs).toHaveProperty("tool_data_json");
      expect(callArgs).not.toHaveProperty("toolName");
      expect(callArgs).not.toHaveProperty("toolDataJson");

      const state = useChatStore.getState();
      expect(state.messages[0].toolData).toEqual(toolData);
    });
  });

  describe("addError", () => {
    it("persists error messages", async () => {
      useChatStore.setState({ conversationId: "conv-uuid" });

      mockInvoke.mockResolvedValue({
        id: "msg-error-uuid",
        conversation_id: "conv-uuid",
        role: "error",
        content: "Something went wrong",
        tool_name: null,
        tool_input_json: null,
        tool_data_json: null,
        proposal_json: null,
        message_order: 3,
        created_at: "2024-01-01T00:00:00Z",
      });

      const store = useChatStore.getState();
      await store.addError("Something went wrong");

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "error",
        content: "Something went wrong",
      });

      const state = useChatStore.getState();
      expect(state.messages[0].role).toBe("error");
      expect(state.error).toBe("Something went wrong");
      expect(state.isRunning).toBe(false);
    });
  });

  describe("addProposal", () => {
    it("persists proposal with proposal_json", async () => {
      useChatStore.setState({ conversationId: "conv-uuid" });

      const proposal: EntityProposal = {
        id: "prop-1",
        operation: "create",
        entityType: "character",
        status: "pending",
        data: { name: "Gandalf" },
      };

      mockInvoke.mockResolvedValue({
        id: "msg-proposal-uuid",
        conversation_id: "conv-uuid",
        role: "proposal",
        content: "Proposing to create character: **Gandalf**",
        tool_name: null,
        tool_input_json: null,
        tool_data_json: null,
        proposal_json: JSON.stringify(proposal),
        message_order: 4,
        created_at: "2024-01-01T00:00:00Z",
      });

      const store = useChatStore.getState();
      await store.addProposal(proposal);

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "proposal",
        content: expect.stringContaining("Gandalf"),
        proposal_json: JSON.stringify(proposal),
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("proposal_json");
      expect(callArgs).not.toHaveProperty("proposalJson");

      const state = useChatStore.getState();
      expect(state.messages[0].proposal).toEqual(proposal);
    });
  });

  describe("finishStreaming", () => {
    it("persists streamed assistant message", async () => {
      useChatStore.setState({
        conversationId: "conv-uuid",
      });

      const store = useChatStore.getState();
      const msgId = store.startStreaming();

      // Simulate streaming
      store.appendToStreaming("Hello ");
      store.appendToStreaming("world");

      mockInvoke.mockResolvedValue({
        id: "msg-streamed-uuid",
        conversation_id: "conv-uuid",
        role: "assistant",
        content: "Hello world",
        tool_name: null,
        tool_input_json: null,
        tool_data_json: null,
        proposal_json: null,
        message_order: 5,
        created_at: "2024-01-01T00:00:00Z",
      });

      // Wait for RAF to flush
      await new Promise((resolve) => setTimeout(resolve, 20));

      await store.finishStreaming();

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "assistant",
        content: "Hello world",
      });

      const state = useChatStore.getState();
      expect(state.messages[0].id).toBe("msg-streamed-uuid");
      expect(state.streamingMessageId).toBeNull();
    });
  });

  describe("addTokenUsage", () => {
    it("updates token counts with snake_case fields", async () => {
      useChatStore.setState({
        conversationId: "conv-uuid",
        sessionInputTokens: 100,
        sessionOutputTokens: 50,
        sessionCacheReadTokens: 25,
        sessionCacheCreationTokens: 10,
      });

      mockInvoke.mockResolvedValue({
        id: "conv-uuid",
        campaign_id: "camp-uuid",
        context_type: "sidebar",
        total_input_tokens: 300,
        total_output_tokens: 150,
        total_cache_read_tokens: 75,
        total_cache_creation_tokens: 30,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      const store = useChatStore.getState();
      await store.addTokenUsage({
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 50,
        cacheCreationTokens: 20,
      });

      expect(mockInvoke).toHaveBeenCalledWith("update_ai_token_counts", {
        conversation_id: "conv-uuid",
        input_tokens: 200,
        output_tokens: 100,
        cache_read_tokens: 50,
        cache_creation_tokens: 20,
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("conversation_id");
      expect(callArgs).toHaveProperty("input_tokens");
      expect(callArgs).toHaveProperty("output_tokens");
      expect(callArgs).toHaveProperty("cache_read_tokens");
      expect(callArgs).toHaveProperty("cache_creation_tokens");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("inputTokens");
      expect(callArgs).not.toHaveProperty("outputTokens");
      expect(callArgs).not.toHaveProperty("cacheReadTokens");
      expect(callArgs).not.toHaveProperty("cacheCreationTokens");

      // Verify local state is updated
      const state = useChatStore.getState();
      expect(state.sessionInputTokens).toBe(300);
      expect(state.sessionOutputTokens).toBe(150);
      expect(state.sessionCacheReadTokens).toBe(75);
      expect(state.sessionCacheCreationTokens).toBe(30);
    });

    it("does not persist when conversationId is null", async () => {
      useChatStore.setState({ conversationId: null });

      const store = useChatStore.getState();
      await store.addTokenUsage({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 25,
        cacheCreationTokens: 10,
      });

      expect(mockInvoke).not.toHaveBeenCalled();

      // Local state should still be updated
      const state = useChatStore.getState();
      expect(state.sessionInputTokens).toBe(100);
      expect(state.sessionOutputTokens).toBe(50);
    });
  });

  describe("clearMessages", () => {
    it("clears messages and resets tokens using snake_case", async () => {
      useChatStore.setState({
        conversationId: "conv-uuid",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Test",
            timestamp: new Date(),
          },
        ],
        sessionInputTokens: 100,
        sessionOutputTokens: 50,
        sessionCacheReadTokens: 25,
        sessionCacheCreationTokens: 10,
      });

      mockInvoke.mockResolvedValue(true);

      const store = useChatStore.getState();
      await store.clearMessages();

      expect(mockInvoke).toHaveBeenCalledWith("clear_ai_conversation", {
        conversation_id: "conv-uuid",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("conversation_id");
      expect(callArgs).not.toHaveProperty("conversationId");

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(0);
      expect(state.sessionInputTokens).toBe(0);
      expect(state.sessionOutputTokens).toBe(0);
      expect(state.sessionCacheReadTokens).toBe(0);
      expect(state.sessionCacheCreationTokens).toBe(0);
    });

    it("does not call backend when conversationId is null", async () => {
      useChatStore.setState({
        conversationId: null,
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Test",
            timestamp: new Date(),
          },
        ],
      });

      const store = useChatStore.getState();
      await store.clearMessages();

      expect(mockInvoke).not.toHaveBeenCalled();

      const state = useChatStore.getState();
      expect(state.messages).toHaveLength(0);
    });
  });
});
