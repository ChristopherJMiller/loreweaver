import { create, type StateCreator } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { ListByCampaignInput } from "@/types";

export interface BaseEntity {
  id: string;
  campaign_id: string;
  created_at: string;
  updated_at: string;
}

interface EntityState<T extends BaseEntity> {
  entities: T[];
  selectedId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAll: (campaignId: string) => Promise<void>;
  fetchOne: (id: string) => Promise<T>;
  create: (data: Partial<T>) => Promise<T>;
  update: (id: string, data: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  setSelected: (id: string | null) => void;
  clearEntities: () => void;
}

type EntityStoreCreator<T extends BaseEntity> = StateCreator<EntityState<T>>;

export function createEntityStore<T extends BaseEntity>(
  entityName: string,
  pluralName?: string
) {
  const plural = pluralName ?? `${entityName}s`;

  const storeCreator: EntityStoreCreator<T> = (set) => ({
    entities: [],
    selectedId: null,
    isLoading: false,
    error: null,

    fetchAll: async (campaignId: string) => {
      set({ isLoading: true, error: null });
      try {
        const input: ListByCampaignInput = { campaign_id: campaignId };
        const entities = await invoke<T[]>(`list_${plural}`, input);
        set({ entities, isLoading: false });
      } catch (e) {
        set({ error: String(e), isLoading: false });
      }
    },

    fetchOne: async (id: string) => {
      const entity = await invoke<T>(`get_${entityName}`, { id });
      set((state) => ({
        entities: state.entities.some((e) => e.id === id)
          ? state.entities.map((e) => (e.id === id ? entity : e))
          : [...state.entities, entity],
      }));
      return entity;
    },

    create: async (data: Partial<T>) => {
      const entity = await invoke<T>(`create_${entityName}`, data);
      set((state) => ({ entities: [entity, ...state.entities] }));
      return entity;
    },

    update: async (id: string, data: Partial<T>) => {
      const entity = await invoke<T>(`update_${entityName}`, { id, ...data });
      set((state) => ({
        entities: state.entities.map((e) => (e.id === id ? entity : e)),
      }));
      return entity;
    },

    remove: async (id: string) => {
      await invoke(`delete_${entityName}`, { id });
      set((state) => ({
        entities: state.entities.filter((e) => e.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
      }));
    },

    setSelected: (id: string | null) => set({ selectedId: id }),

    clearEntities: () => set({ entities: [], selectedId: null, error: null }),
  });

  return create<EntityState<T>>(storeCreator);
}
