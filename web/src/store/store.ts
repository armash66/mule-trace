/**
 * Zustand global application state store for MuleTrace.
 */

import { create } from 'zustand';

interface ToastState {
  id: string;
  message: string;
  undoAction?: () => void;
}

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Selected Entity
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  selectedRingId: string | null;
  setSelectedRingId: (id: string | null) => void;

  // Graph state
  currentHops: number;
  setCurrentHops: (hops: number) => void;

  // Modals & Panels
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  shortcutSheetOpen: boolean;
  setShortcutSheetOpen: (open: boolean) => void;

  whyScoreDrawerOpen: boolean;
  setWhyScoreDrawerOpen: (open: boolean) => void;

  // Toast with 5s Undo
  toast: ToastState | null;
  showToast: (message: string, undoAction?: () => void) => void;
  clearToast: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  theme: 'light',
  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },

  selectedAccountId: 'ACC_05001',
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),

  selectedRingId: 'fan_1',
  setSelectedRingId: (id) => set({ selectedRingId: id }),

  currentHops: 1,
  setCurrentHops: (hops) => set({ currentHops: hops }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  shortcutSheetOpen: false,
  setShortcutSheetOpen: (open) => set({ shortcutSheetOpen: open }),

  whyScoreDrawerOpen: false,
  setWhyScoreDrawerOpen: (open) => set({ whyScoreDrawerOpen: open }),

  toast: null,
  showToast: (message, undoAction) => {
    const id = String(Date.now());
    set({ toast: { id, message, undoAction } });
    setTimeout(() => {
      if (get().toast?.id === id) {
        set({ toast: null });
      }
    }, 5000);
  },
  clearToast: () => set({ toast: null }),
}));
