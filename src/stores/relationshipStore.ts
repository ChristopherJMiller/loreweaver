import { create } from "zustand";
import { relationships } from "@/lib/tauri";
import type { Relationship, EntityType } from "@/types";

interface RelationshipState {
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchForEntity: (entityType: EntityType, entityId: string) => Promise<void>;
  fetchForCampaign: (campaignId: string) => Promise<void>;
  create: (data: {
    campaign_id: string;
    source_type: EntityType;
    source_id: string;
    target_type: EntityType;
    target_id: string;
    relationship_type: string;
    description?: string;
    strength?: number;
    is_bidirectional?: boolean;
  }) => Promise<Relationship>;
  update: (
    id: string,
    data: {
      relationship_type?: string;
      description?: string;
      strength?: number;
      is_bidirectional?: boolean;
    }
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearRelationships: () => void;
}

export const useRelationshipStore = create<RelationshipState>((set) => ({
  relationships: [],
  isLoading: false,
  error: null,

  fetchForEntity: async (entityType: EntityType, entityId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await relationships.getForEntity({
        entity_type: entityType,
        entity_id: entityId,
      });
      set({ relationships: result, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  fetchForCampaign: async (campaignId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await relationships.list({ campaign_id: campaignId });
      set({ relationships: result, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  create: async (data) => {
    const relationship = await relationships.create(data);
    set((state) => ({
      relationships: [relationship, ...state.relationships],
    }));
    return relationship;
  },

  update: async (id, data) => {
    const updated = await relationships.update({ id, ...data });
    set((state) => ({
      relationships: state.relationships.map((r) =>
        r.id === id ? updated : r
      ),
    }));
  },

  remove: async (id: string) => {
    await relationships.delete(id);
    set((state) => ({
      relationships: state.relationships.filter((r) => r.id !== id),
    }));
  },

  clearRelationships: () => set({ relationships: [], error: null }),
}));
