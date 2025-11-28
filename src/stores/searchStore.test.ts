import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { useSearchStore } from "./searchStore";
import type { SearchResult } from "@/types";

const mockInvoke = vi.mocked(invoke);

const createMockSearchResult = (id: string, name: string): SearchResult => ({
  entity_type: "character",
  entity_id: id,
  entity_name: name,
  snippet: `Description of ${name}`,
  rank: 1.0,
});

describe("searchStore", () => {
  beforeEach(() => {
    mockInvoke.mockClear();
    useSearchStore.setState({
      query: "",
      results: [],
      isSearching: false,
      entityTypeFilter: [],
    });
  });

  describe("setQuery", () => {
    it("updates the query state", () => {
      useSearchStore.getState().setQuery("dragon");

      const state = useSearchStore.getState();
      expect(state.query).toBe("dragon");
    });

    it("allows clearing the query", () => {
      useSearchStore.setState({ query: "old query" });
      useSearchStore.getState().setQuery("");

      const state = useSearchStore.getState();
      expect(state.query).toBe("");
    });
  });

  describe("search (legacy string format)", () => {
    it("searches using campaign ID with query from state using snake_case", async () => {
      useSearchStore.setState({ query: "dragon" });

      const mockResults = [
        createMockSearchResult("char-1", "Dragon Knight"),
        createMockSearchResult("char-2", "Dragon Slayer"),
      ];
      mockInvoke.mockResolvedValue(mockResults);

      const store = useSearchStore.getState();
      await store.search("camp-123");

      expect(mockInvoke).toHaveBeenCalledWith("search_entities", {
        campaign_id: "camp-123",
        query: "dragon",
        entity_types: null,
        limit: 50,
      });

      // Verify snake_case is used
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("entity_types");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("entityTypes");

      const state = useSearchStore.getState();
      expect(state.results).toEqual(mockResults);
      expect(state.isSearching).toBe(false);
    });

    it("uses entity type filter when set", async () => {
      useSearchStore.setState({
        query: "tavern",
        entityTypeFilter: ["location", "organization"],
      });

      mockInvoke.mockResolvedValue([]);

      await useSearchStore.getState().search("camp-123");

      expect(mockInvoke).toHaveBeenCalledWith("search_entities", {
        campaign_id: "camp-123",
        query: "tavern",
        entity_types: ["location", "organization"],
        limit: 50,
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.entity_types).toEqual(["location", "organization"]);
    });

    it("clears results when query is empty", async () => {
      useSearchStore.setState({ query: "" });

      await useSearchStore.getState().search("camp-123");

      expect(mockInvoke).not.toHaveBeenCalled();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
    });

    it("clears results when query is whitespace only", async () => {
      useSearchStore.setState({ query: "   " });

      await useSearchStore.getState().search("camp-123");

      expect(mockInvoke).not.toHaveBeenCalled();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
    });

    it("sets isSearching during search", async () => {
      useSearchStore.setState({ query: "test" });

      mockInvoke.mockImplementation(
        () =>
          new Promise((resolve) => {
            // Check loading state while promise is pending
            const state = useSearchStore.getState();
            expect(state.isSearching).toBe(true);
            resolve([]);
          })
      );

      await useSearchStore.getState().search("camp-123");

      const state = useSearchStore.getState();
      expect(state.isSearching).toBe(false);
    });

    it("handles search errors gracefully", async () => {
      useSearchStore.setState({ query: "error test" });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Search failed"));

      await useSearchStore.getState().search("camp-123");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Search error:",
        expect.any(Error)
      );

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.isSearching).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("search (object format)", () => {
    it("searches with provided parameters using snake_case", async () => {
      const mockResults = [createMockSearchResult("loc-1", "Castle")];
      mockInvoke.mockResolvedValue(mockResults);

      await useSearchStore.getState().search({
        campaign_id: "camp-123",
        query: "castle",
        entity_types: ["location"],
        limit: 10,
      });

      expect(mockInvoke).toHaveBeenCalledWith("search_entities", {
        campaign_id: "camp-123",
        query: "castle",
        entity_types: ["location"],
        limit: 10,
      });

      // Verify snake_case
      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs).toHaveProperty("campaign_id");
      expect(callArgs).toHaveProperty("entity_types");
      expect(callArgs).not.toHaveProperty("campaignId");
      expect(callArgs).not.toHaveProperty("entityTypes");

      const state = useSearchStore.getState();
      expect(state.results).toEqual(mockResults);
    });

    it("uses default limit of 50 when not specified", async () => {
      mockInvoke.mockResolvedValue([]);

      await useSearchStore.getState().search({
        campaign_id: "camp-123",
        query: "test",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.limit).toBe(50);
    });

    it("uses null for entity_types when not specified", async () => {
      mockInvoke.mockResolvedValue([]);

      await useSearchStore.getState().search({
        campaign_id: "camp-123",
        query: "test",
      });

      const callArgs = mockInvoke.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.entity_types).toBeNull();
    });

    it("clears results when object query is empty", async () => {
      await useSearchStore.getState().search({
        campaign_id: "camp-123",
        query: "",
      });

      expect(mockInvoke).not.toHaveBeenCalled();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
    });

    it("handles errors in object format search", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockInvoke.mockRejectedValue(new Error("Search failed"));

      await useSearchStore.getState().search({
        campaign_id: "camp-123",
        query: "test",
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.isSearching).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("setEntityTypeFilter", () => {
    it("updates the entity type filter", () => {
      useSearchStore.getState().setEntityTypeFilter(["character", "location"]);

      const state = useSearchStore.getState();
      expect(state.entityTypeFilter).toEqual(["character", "location"]);
    });

    it("allows clearing the filter", () => {
      useSearchStore.setState({ entityTypeFilter: ["character"] });
      useSearchStore.getState().setEntityTypeFilter([]);

      const state = useSearchStore.getState();
      expect(state.entityTypeFilter).toEqual([]);
    });
  });

  describe("clearSearch", () => {
    it("clears query, results, and filter", () => {
      useSearchStore.setState({
        query: "test query",
        results: [createMockSearchResult("char-1", "Test")],
        entityTypeFilter: ["character"],
      });

      useSearchStore.getState().clearSearch();

      const state = useSearchStore.getState();
      expect(state.query).toBe("");
      expect(state.results).toEqual([]);
      expect(state.entityTypeFilter).toEqual([]);
    });

    it("preserves isSearching state", () => {
      useSearchStore.setState({
        query: "test",
        results: [createMockSearchResult("char-1", "Test")],
        isSearching: true,
      });

      useSearchStore.getState().clearSearch();

      const state = useSearchStore.getState();
      expect(state.isSearching).toBe(true); // Preserved
    });
  });

  describe("clearResults", () => {
    it("clears only the results", () => {
      useSearchStore.setState({
        query: "test query",
        results: [createMockSearchResult("char-1", "Test")],
        entityTypeFilter: ["character"],
      });

      useSearchStore.getState().clearResults();

      const state = useSearchStore.getState();
      expect(state.results).toEqual([]);
      expect(state.query).toBe("test query"); // Preserved
      expect(state.entityTypeFilter).toEqual(["character"]); // Preserved
    });
  });
});
