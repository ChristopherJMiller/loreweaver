import { create } from "zustand";
import { search } from "@/lib/tauri";
import type { EntityType, SearchResult } from "@/types";

interface SearchInput {
  campaign_id: string;
  query: string;
  entity_types?: EntityType[] | null;
  limit?: number;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  entityTypeFilter: EntityType[];

  // Actions
  setQuery: (query: string) => void;
  search: (input: string | SearchInput) => Promise<void>;
  setEntityTypeFilter: (types: EntityType[]) => void;
  clearSearch: () => void;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: [],
  isSearching: false,
  entityTypeFilter: [],

  setQuery: (query) => set({ query }),

  search: async (input) => {
    // Handle both legacy string (campaignId) and new object format
    if (typeof input === "string") {
      // Legacy: just campaignId, use state for query/filter
      const { query, entityTypeFilter } = get();
      if (!query.trim()) {
        set({ results: [] });
        return;
      }

      set({ isSearching: true });
      try {
        const results = await search.entities({
          campaign_id: input,
          query,
          entity_types: entityTypeFilter.length > 0 ? entityTypeFilter : null,
          limit: 50,
        });
        set({ results, isSearching: false });
      } catch (e) {
        console.error("Search error:", e);
        set({ results: [], isSearching: false });
      }
    } else {
      // New: direct search with provided params
      if (!input.query.trim()) {
        set({ results: [] });
        return;
      }

      set({ isSearching: true });
      try {
        const results = await search.entities({
          campaign_id: input.campaign_id,
          query: input.query,
          entity_types: input.entity_types || null,
          limit: input.limit || 50,
        });
        set({ results, isSearching: false });
      } catch (e) {
        console.error("Search error:", e);
        set({ results: [], isSearching: false });
      }
    }
  },

  setEntityTypeFilter: (types) => set({ entityTypeFilter: types }),

  clearSearch: () => set({ query: "", results: [], entityTypeFilter: [] }),

  clearResults: () => set({ results: [] }),
}));
