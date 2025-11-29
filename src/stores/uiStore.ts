import { create } from "zustand";

type ViewMode = "list" | "grid";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  worldNavigatorOpen: boolean;
  aiChatOpen: boolean;
  viewMode: ViewMode;
  createDialogOpen: string | null; // entity type or null

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  toggleWorldNavigator: () => void;
  setWorldNavigatorOpen: (open: boolean) => void;
  toggleAIChat: () => void;
  setAIChatOpen: (open: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  openCreateDialog: (entityType: string) => void;
  closeCreateDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  worldNavigatorOpen: true, // Default open
  aiChatOpen: false, // Default closed
  viewMode: "list",
  createDialogOpen: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  toggleWorldNavigator: () =>
    set((state) => ({ worldNavigatorOpen: !state.worldNavigatorOpen })),
  setWorldNavigatorOpen: (open) => set({ worldNavigatorOpen: open }),
  toggleAIChat: () => set((state) => ({ aiChatOpen: !state.aiChatOpen })),
  setAIChatOpen: (open) => set({ aiChatOpen: open }),
  setViewMode: (mode) => set({ viewMode: mode }),
  openCreateDialog: (entityType) => set({ createDialogOpen: entityType }),
  closeCreateDialog: () => set({ createDialogOpen: null }),
}));
