import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useRelationshipStore } from "./relationshipStore";
import type { Relationship } from "@/types";

const mockInvoke = vi.mocked(invoke);

const createMockRelationship = (id: string): Relationship => ({
  id,
  campaign_id: "camp-123",
  source_type: "character",
  source_id: "char-123",
  target_type: "location",
  target_id: "loc-123",
  relationship_type: "lives_in",
  description: "Test relationship",
  strength: 75,
  is_bidirectional: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
});

describe("relationshipStore", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    useRelationshipStore.setState({
      relationships: [],
      isLoading: false,
      error: null,
    });
  });

  describe("fetchForEntity", () => {
    it("fetches relationships for an entity using snake_case", async () => {
      const mockRelationships = [
        createMockRelationship("rel-1"),
        createMockRelationship("rel-2"),
      ];
      mockInvoke.mockResolvedValue(mockRelationships);

      const store = useRelationshipStore.getState();
      await store.fetchForEntity("character", "char-123");

      expect(mockInvoke).toHaveBeenCalledWith("get_entity_relationships", {
        entity_type: "character",
        entity_id: "char-123",
      });

      // Verify snake_case is used
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("entity_type");
      expect(callArgs).toHaveProperty("entity_id");
      expect(callArgs).not.toHaveProperty("entityType");
      expect(callArgs).not.toHaveProperty("entityId");

      const state = useRelationshipStore.getState();
      expect(state.relationships).toEqual(mockRelationships);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("sets loading state during fetch", async () => {
      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Check loading state while promise is pending
            const state = useRelationshipStore.getState();
            expect(state.isLoading).toBe(true);
            resolve([]);
          })
      );

      await useRelationshipStore.getState().fetchForEntity("location", "loc-1");
    });

    it("handles fetch errors", async () => {
      mockInvoke.mockRejectedValue(new Error("Database error"));

      const store = useRelationshipStore.getState();
      await store.fetchForEntity("quest", "quest-1");

      const state = useRelationshipStore.getState();
      expect(state.error).toBe("Error: Database error");
      expect(state.isLoading).toBe(false);
      expect(state.relationships).toEqual([]);
    });
  });

  describe("fetchForCampaign", () => {
    it("fetches all relationships for a campaign using snake_case", async () => {
      const mockRelationships = [
        createMockRelationship("rel-1"),
        createMockRelationship("rel-2"),
        createMockRelationship("rel-3"),
      ];
      mockInvoke.mockResolvedValue(mockRelationships);

      const store = useRelationshipStore.getState();
      await store.fetchForCampaign("camp-123");

      expect(mockInvoke).toHaveBeenCalledWith("list_relationships", {
        campaign_id: "camp-123",
      });

      // Verify snake_case is used
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).not.toHaveProperty("campaignId");

      const state = useRelationshipStore.getState();
      expect(state.relationships).toEqual(mockRelationships);
    });

    it("handles errors in campaign fetch", async () => {
      mockInvoke.mockRejectedValue(new Error("Network error"));

      await useRelationshipStore.getState().fetchForCampaign("camp-123");

      const state = useRelationshipStore.getState();
      expect(state.error).toBe("Error: Network error");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("create", () => {
    it("creates a relationship and adds to store using snake_case", async () => {
      const newRelationship = createMockRelationship("rel-new");
      mockInvoke.mockResolvedValue(newRelationship);

      const store = useRelationshipStore.getState();
      const result = await store.create({
        campaign_id: "camp-123",
        source_type: "character",
        source_id: "char-1",
        target_type: "location",
        target_id: "loc-1",
        relationship_type: "lives_in",
        description: "Lives here",
        strength: 80,
        is_bidirectional: false,
      });

      expect(mockInvoke).toHaveBeenCalledWith("create_relationship", {
        campaign_id: "camp-123",
        source_type: "character",
        source_id: "char-1",
        target_type: "location",
        target_id: "loc-1",
        relationship_type: "lives_in",
        description: "Lives here",
        strength: 80,
        is_bidirectional: false,
      });

      // Verify snake_case throughout
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("source_type");
      expect(callArgs).toHaveProperty("source_id");
      expect(callArgs).toHaveProperty("target_type");
      expect(callArgs).toHaveProperty("target_id");
      expect(callArgs).toHaveProperty("relationship_type");
      expect(callArgs).toHaveProperty("is_bidirectional");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("sourceType");

      expect(result).toEqual(newRelationship);

      const state = useRelationshipStore.getState();
      expect(state.relationships).toContain(newRelationship);
      expect(state.relationships[0]).toEqual(newRelationship); // Added to start
    });

    it("prepends new relationship to the list", async () => {
      const existing = createMockRelationship("rel-1");
      useRelationshipStore.setState({ relationships: [existing] });

      const newRelationship = createMockRelationship("rel-new");
      mockInvoke.mockResolvedValue(newRelationship);

      await useRelationshipStore.getState().create({
        campaign_id: "camp-123",
        source_type: "character",
        source_id: "char-1",
        target_type: "location",
        target_id: "loc-1",
        relationship_type: "knows",
      });

      const state = useRelationshipStore.getState();
      expect(state.relationships).toHaveLength(2);
      expect(state.relationships[0]).toEqual(newRelationship);
      expect(state.relationships[1]).toEqual(existing);
    });
  });

  describe("update", () => {
    it("updates a relationship in the store using snake_case", async () => {
      const existing = createMockRelationship("rel-1");
      useRelationshipStore.setState({ relationships: [existing] });

      const updated = {
        ...existing,
        relationship_type: "allies",
        strength: 90,
      };
      mockInvoke.mockResolvedValue(updated);

      const store = useRelationshipStore.getState();
      await store.update("rel-1", {
        relationship_type: "allies",
        strength: 90,
      });

      expect(mockInvoke).toHaveBeenCalledWith("update_relationship", {
        id: "rel-1",
        relationship_type: "allies",
        strength: 90,
      });

      // Verify snake_case
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("relationship_type");
      expect(callArgs).not.toHaveProperty("relationshipType");

      const state = useRelationshipStore.getState();
      expect(state.relationships[0]).toEqual(updated);
    });

    it("only updates the matching relationship", async () => {
      const rel1 = createMockRelationship("rel-1");
      const rel2 = createMockRelationship("rel-2");
      useRelationshipStore.setState({ relationships: [rel1, rel2] });

      const updated = { ...rel1, strength: 100 };
      mockInvoke.mockResolvedValue(updated);

      await useRelationshipStore.getState().update("rel-1", { strength: 100 });

      const state = useRelationshipStore.getState();
      expect(state.relationships[0].strength).toBe(100);
      expect(state.relationships[1]).toEqual(rel2); // Unchanged
    });

    it("supports updating is_bidirectional using snake_case", async () => {
      const existing = createMockRelationship("rel-1");
      useRelationshipStore.setState({ relationships: [existing] });

      const updated = { ...existing, is_bidirectional: true };
      mockInvoke.mockResolvedValue(updated);

      await useRelationshipStore
        .getState()
        .update("rel-1", { is_bidirectional: true });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("is_bidirectional", true);
      expect(callArgs).not.toHaveProperty("isBidirectional");
    });
  });

  describe("remove", () => {
    it("deletes a relationship and removes from store", async () => {
      const rel1 = createMockRelationship("rel-1");
      const rel2 = createMockRelationship("rel-2");
      useRelationshipStore.setState({ relationships: [rel1, rel2] });

      mockInvoke.mockResolvedValue(true);

      const store = useRelationshipStore.getState();
      await store.remove("rel-1");

      expect(mockInvoke).toHaveBeenCalledWith("delete_relationship", {
        id: "rel-1",
      });

      const state = useRelationshipStore.getState();
      expect(state.relationships).toHaveLength(1);
      expect(state.relationships[0]).toEqual(rel2);
    });

    it("handles removing non-existent relationship gracefully", async () => {
      const existing = createMockRelationship("rel-1");
      useRelationshipStore.setState({ relationships: [existing] });

      mockInvoke.mockResolvedValue(true);

      await useRelationshipStore.getState().remove("rel-nonexistent");

      const state = useRelationshipStore.getState();
      expect(state.relationships).toHaveLength(1); // Unchanged
      expect(state.relationships[0]).toEqual(existing);
    });
  });

  describe("clearRelationships", () => {
    it("clears all relationships and errors", () => {
      useRelationshipStore.setState({
        relationships: [
          createMockRelationship("rel-1"),
          createMockRelationship("rel-2"),
        ],
        error: "Some error",
      });

      useRelationshipStore.getState().clearRelationships();

      const state = useRelationshipStore.getState();
      expect(state.relationships).toEqual([]);
      expect(state.error).toBeNull();
    });

    it("preserves loading state when clearing", () => {
      useRelationshipStore.setState({
        relationships: [createMockRelationship("rel-1")],
        isLoading: true,
      });

      useRelationshipStore.getState().clearRelationships();

      const state = useRelationshipStore.getState();
      expect(state.relationships).toEqual([]);
      expect(state.isLoading).toBe(true); // Preserved
    });
  });
});
