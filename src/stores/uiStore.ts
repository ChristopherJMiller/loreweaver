import { create } from "zustand";

type ViewMode = "list" | "grid";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  viewMode: ViewMode;
  createDialogOpen: string | null; // entity type or null

  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setViewMode: (mode: ViewMode) => void;
  openCreateDialog: (entityType: string) => void;
  closeCreateDialog: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  viewMode: "list",
  createDialogOpen: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),
  openCreateDialog: (entityType) => set({ createDialogOpen: entityType }),
  closeCreateDialog: () => set({ createDialogOpen: null }),
}));
