import { create } from "zustand";
import { search } from "@/lib/tauri";
import type { EntityType, SearchResult } from "@/types";

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  entityTypeFilter: EntityType[];

  // Actions
  setQuery: (query: string) => void;
  search: (campaignId: string) => Promise<void>;
  setEntityTypeFilter: (types: EntityType[]) => void;
  clearSearch: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: "",
  results: [],
  isSearching: false,
  entityTypeFilter: [],

  setQuery: (query) => set({ query }),

  search: async (campaignId) => {
    const { query, entityTypeFilter } = get();
    if (!query.trim()) {
      set({ results: [] });
      return;
    }

    set({ isSearching: true });
    try {
      const results = await search.entities({
        campaign_id: campaignId,
        query,
        entity_types: entityTypeFilter.length > 0 ? entityTypeFilter : null,
        limit: 50,
      });
      set({ results, isSearching: false });
    } catch (e) {
      console.error("Search error:", e);
      set({ results: [], isSearching: false });
    }
  },

  setEntityTypeFilter: (types) => set({ entityTypeFilter: types }),

  clearSearch: () => set({ query: "", results: [], entityTypeFilter: [] }),
}));
