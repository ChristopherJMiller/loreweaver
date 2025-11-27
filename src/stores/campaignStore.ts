import { create } from "zustand";
import { persist } from "zustand/middleware";
import { campaigns } from "@/lib/tauri";
import type { Campaign } from "@/types";

interface CampaignState {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  isLoading: boolean;
  error: string | null;

  // Computed
  activeCampaign: Campaign | null;

  // Actions
  fetchCampaigns: () => Promise<void>;
  setActiveCampaign: (id: string | null) => void;
  createCampaign: (
    name: string,
    description?: string,
    system?: string
  ) => Promise<Campaign>;
  updateCampaign: (
    id: string,
    data: {
      name?: string;
      description?: string;
      system?: string;
      settings_json?: string;
    }
  ) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

export const useCampaignStore = create<CampaignState>()(
  persist(
    (set, get) => ({
      campaigns: [],
      activeCampaignId: null,
      isLoading: false,
      error: null,

      get activeCampaign() {
        const { campaigns, activeCampaignId } = get();
        return campaigns.find((c) => c.id === activeCampaignId) ?? null;
      },

      fetchCampaigns: async () => {
        set({ isLoading: true, error: null });
        try {
          const result = await campaigns.list();
          set({ campaigns: result, isLoading: false });
        } catch (e) {
          set({ error: String(e), isLoading: false });
        }
      },

      setActiveCampaign: (id) => set({ activeCampaignId: id }),

      createCampaign: async (name, description, system) => {
        const campaign = await campaigns.create({ name, description, system });
        set((state) => ({
          campaigns: [campaign, ...state.campaigns],
        }));
        return campaign;
      },

      updateCampaign: async (id, data) => {
        const updated = await campaigns.update({ id, ...data });
        set((state) => ({
          campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)),
        }));
      },

      deleteCampaign: async (id) => {
        await campaigns.delete(id);
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          activeCampaignId:
            state.activeCampaignId === id ? null : state.activeCampaignId,
        }));
      },
    }),
    {
      name: "loreweaver-campaign",
      partialize: (state) => ({ activeCampaignId: state.activeCampaignId }),
    }
  )
);
