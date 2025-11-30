import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import {
  characters,
  locations,
  organizations,
  quests,
  heroes,
  players,
  sessions,
  timelineEvents,
  secrets,
  relationships,
  tags,
  search,
  aiConversations,
} from "./tauri";

const mockInvoke = vi.mocked(invoke);

describe("Tauri Command Contracts - Argument Naming", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    mockInvoke.mockResolvedValue([]);
  });

  describe("List commands use snake_case campaign_id", () => {
    const testCases = [
      { name: "characters", fn: characters.list, cmd: "list_characters" },
      { name: "locations", fn: locations.list, cmd: "list_locations" },
      { name: "organizations", fn: organizations.list, cmd: "list_organizations" },
      { name: "quests", fn: quests.list, cmd: "list_quests" },
      { name: "heroes", fn: heroes.list, cmd: "list_heroes" },
      { name: "players", fn: players.list, cmd: "list_players" },
      { name: "sessions", fn: sessions.list, cmd: "list_sessions" },
      { name: "timelineEvents", fn: timelineEvents.list, cmd: "list_timeline_events" },
      { name: "secrets", fn: secrets.list, cmd: "list_secrets" },
      { name: "relationships", fn: relationships.list, cmd: "list_relationships" },
      { name: "tags", fn: tags.list, cmd: "list_tags" },
    ];

    it.each(testCases)(
      "$name.list uses campaign_id (not campaignId)",
      async ({ fn, cmd }) => {
        await fn({ campaign_id: "test-campaign-uuid" });

        expect(mockInvoke).toHaveBeenCalledWith(cmd, {
          campaign_id: "test-campaign-uuid",
        });

        // Verify no camelCase keys
        const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
        expect(callArgs).toHaveProperty("campaign_id");
        expect(callArgs).not.toHaveProperty("campaignId");
      }
    );
  });

  describe("Location getChildren uses snake_case parent_id", () => {
    it("uses parent_id (not parentId)", async () => {
      await locations.getChildren({ parent_id: "parent-uuid" });

      expect(mockInvoke).toHaveBeenCalledWith("get_location_children", {
        parent_id: "parent-uuid",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("parent_id");
      expect(callArgs).not.toHaveProperty("parentId");
    });
  });

  describe("Entity-scoped queries use snake_case", () => {
    it("relationships.getForEntity uses entity_type and entity_id", async () => {
      await relationships.getForEntity({
        entity_type: "character",
        entity_id: "char-uuid",
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_entity_relationships", {
        entity_type: "character",
        entity_id: "char-uuid",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("entity_type");
      expect(callArgs).toHaveProperty("entity_id");
      expect(callArgs).not.toHaveProperty("entityType");
      expect(callArgs).not.toHaveProperty("entityId");
    });

    it("tags.getForEntity uses entity_type and entity_id", async () => {
      await tags.getForEntity({
        entity_type: "location",
        entity_id: "loc-uuid",
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_entity_tags", {
        entity_type: "location",
        entity_id: "loc-uuid",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("entity_type");
      expect(callArgs).toHaveProperty("entity_id");
      expect(callArgs).not.toHaveProperty("entityType");
      expect(callArgs).not.toHaveProperty("entityId");
    });
  });

  describe("Search uses snake_case", () => {
    it("search.entities uses campaign_id and entity_types", async () => {
      await search.entities({
        campaign_id: "camp-uuid",
        query: "dragon",
        entity_types: ["character", "location"],
        limit: 10,
      });

      expect(mockInvoke).toHaveBeenCalledWith("search_entities", {
        campaign_id: "camp-uuid",
        query: "dragon",
        entity_types: ["character", "location"],
        limit: 10,
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("entity_types");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("entityTypes");
    });
  });

  describe("All invoke arguments use snake_case (no camelCase)", () => {
    it("verifies no camelCase keys in any entity list call", async () => {
      const entities = [
        characters,
        locations,
        organizations,
        quests,
        heroes,
        players,
        sessions,
        timelineEvents,
        secrets,
        relationships,
        tags,
      ];

      for (const entity of entities) {
        mockInvoke.mockClear();
        await entity.list({ campaign_id: "test" });

        const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
        const keys = Object.keys(callArgs);

        // Check that no key contains uppercase letters (camelCase)
        keys.forEach((key) => {
          const hasCamelCase = /[A-Z]/.test(key);
          expect(
            hasCamelCase,
            `Found camelCase key "${key}" - should be snake_case`
          ).toBe(false);
        });
      }
    });
  });

  describe("aiConversations", () => {
    it("getOrCreate uses campaign_id and context_type", async () => {
      mockInvoke.mockResolvedValue({
        id: "conv-uuid",
        campaign_id: "camp-uuid",
        context_type: "sidebar",
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_cache_read_tokens: 0,
        total_cache_creation_tokens: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      await aiConversations.getOrCreate({
        campaign_id: "camp-uuid",
        context_type: "sidebar",
      });

      expect(mockInvoke).toHaveBeenCalledWith("get_or_create_ai_conversation", {
        campaign_id: "camp-uuid",
        context_type: "sidebar",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("context_type");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("contextType");
    });

    it("load uses campaign_id and context_type", async () => {
      mockInvoke.mockResolvedValue({
        conversation: {
          id: "conv-uuid",
          campaign_id: "camp-uuid",
          context_type: "fullpage",
          total_input_tokens: 100,
          total_output_tokens: 50,
          total_cache_read_tokens: 25,
          total_cache_creation_tokens: 10,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        messages: [],
      });

      await aiConversations.load({
        campaign_id: "camp-uuid",
        context_type: "fullpage",
      });

      expect(mockInvoke).toHaveBeenCalledWith("load_ai_conversation", {
        campaign_id: "camp-uuid",
        context_type: "fullpage",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("context_type");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("contextType");
    });

    it("addMessage uses conversation_id and snake_case fields", async () => {
      mockInvoke.mockResolvedValue({
        id: "msg-uuid",
        conversation_id: "conv-uuid",
        role: "user",
        content: "Test message",
        tool_name: "get_entity",
        tool_input_json: '{"entity_id": "123"}',
        tool_data_json: '{"name": "Test"}',
        proposal_json: null,
        message_order: 1,
        created_at: "2024-01-01T00:00:00Z",
      });

      await aiConversations.addMessage({
        conversation_id: "conv-uuid",
        role: "user",
        content: "Test message",
        tool_name: "get_entity",
        tool_input_json: '{"entity_id": "123"}',
        tool_data_json: '{"name": "Test"}',
        proposal_json: '{"id": "prop1"}',
      });

      expect(mockInvoke).toHaveBeenCalledWith("add_ai_message", {
        conversation_id: "conv-uuid",
        role: "user",
        content: "Test message",
        tool_name: "get_entity",
        tool_input_json: '{"entity_id": "123"}',
        tool_data_json: '{"name": "Test"}',
        proposal_json: '{"id": "prop1"}',
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("conversation_id");
      expect(callArgs).toHaveProperty("tool_name");
      expect(callArgs).toHaveProperty("tool_input_json");
      expect(callArgs).toHaveProperty("tool_data_json");
      expect(callArgs).toHaveProperty("proposal_json");
      expect(callArgs).not.toHaveProperty("conversationId");
      expect(callArgs).not.toHaveProperty("toolName");
      expect(callArgs).not.toHaveProperty("toolInputJson");
      expect(callArgs).not.toHaveProperty("toolDataJson");
      expect(callArgs).not.toHaveProperty("proposalJson");
    });

    it("updateTokenCounts uses conversation_id and all snake_case token fields", async () => {
      mockInvoke.mockResolvedValue({
        id: "conv-uuid",
        campaign_id: "camp-uuid",
        context_type: "sidebar",
        total_input_tokens: 100,
        total_output_tokens: 50,
        total_cache_read_tokens: 25,
        total_cache_creation_tokens: 10,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      await aiConversations.updateTokenCounts({
        conversation_id: "conv-uuid",
        input_tokens: 100,
        output_tokens: 50,
        cache_read_tokens: 25,
        cache_creation_tokens: 10,
      });

      expect(mockInvoke).toHaveBeenCalledWith("update_ai_token_counts", {
        conversation_id: "conv-uuid",
        input_tokens: 100,
        output_tokens: 50,
        cache_read_tokens: 25,
        cache_creation_tokens: 10,
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
    });

    it("clear uses conversation_id", async () => {
      mockInvoke.mockResolvedValue(true);

      await aiConversations.clear({ conversation_id: "conv-uuid" });

      expect(mockInvoke).toHaveBeenCalledWith("clear_ai_conversation", {
        conversation_id: "conv-uuid",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("conversation_id");
      expect(callArgs).not.toHaveProperty("conversationId");
    });
  });
});
