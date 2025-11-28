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
});
