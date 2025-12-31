import { create } from "zustand";
import { persist } from "zustand/middleware";

type ViewMode = "list" | "grid";

// Sidebar width constraints
const SIDEBAR_MIN_WIDTH = 56; // Collapsed size
const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_DEFAULT_WIDTH = 224; // 14rem = 224px

const WORLD_NAV_MIN_WIDTH = 180;
const WORLD_NAV_MAX_WIDTH = 400;
const WORLD_NAV_DEFAULT_WIDTH = 256; // 16rem = 256px

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  commandPaletteOpen: boolean;
  worldNavigatorOpen: boolean;
  worldNavigatorWidth: number;
  aiChatOpen: boolean;
  viewMode: ViewMode;
  createDialogOpen: string | null; // entity type or null

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  toggleWorldNavigator: () => void;
  setWorldNavigatorOpen: (open: boolean) => void;
  setWorldNavigatorWidth: (width: number) => void;
  toggleAIChat: () => void;
  setAIChatOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  openCreateDialog: (entityType: string) => void;
  closeCreateDialog: () => void;
}

export { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH, WORLD_NAV_MIN_WIDTH, WORLD_NAV_MAX_WIDTH };

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      commandPaletteOpen: false,
      worldNavigatorOpen: true, // Default open
      worldNavigatorWidth: WORLD_NAV_DEFAULT_WIDTH,
      aiChatOpen: false, // Default closed
      viewMode: "list",
      createDialogOpen: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) =>
        set({
          sidebarWidth: Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, width)),
        }),
      openCommandPalette: () => set({ commandPaletteOpen: true }),
      closeCommandPalette: () => set({ commandPaletteOpen: false }),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      toggleWorldNavigator: () =>
        set((state) => ({ worldNavigatorOpen: !state.worldNavigatorOpen })),
      setWorldNavigatorOpen: (open) => set({ worldNavigatorOpen: open }),
      setWorldNavigatorWidth: (width) =>
        set({
          worldNavigatorWidth: Math.max(WORLD_NAV_MIN_WIDTH, Math.min(WORLD_NAV_MAX_WIDTH, width)),
        }),
      toggleAIChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen })),
      setAIChatOpen: (open) => set({ aiChatOpen: open }),
      setViewMode: (mode) => set({ viewMode: mode }),
      openCreateDialog: (entityType) => set({ createDialogOpen: entityType }),
      closeCreateDialog: () => set({ createDialogOpen: null }),
    }),
    {
      name: "loreweaver-ui",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        worldNavigatorOpen: state.worldNavigatorOpen,
        worldNavigatorWidth: state.worldNavigatorWidth,
        viewMode: state.viewMode,
      }),
    }
  )
);
