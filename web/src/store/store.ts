/**
 * Zustand global application state store for MuleTrace.
 */

import { create } from 'zustand';
import { api } from '../api/client';
import type { RunItem } from '../api/types';

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

  // Runs & Data Intake
  runs: RunItem[];
  activeRunId: string | null;
  setRuns: (runs: RunItem[]) => void;
  setActiveRunId: (id: string | null) => void;
  fetchRuns: () => Promise<void>;

  // Global Drag & Intake files
  globalDragActive: boolean;
  setGlobalDragActive: (active: boolean) => void;
  stagedFiles: File[];
  setStagedFiles: (files: File[]) => void;

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

  // Runs state
  runs: [],
  activeRunId: null,
  setRuns: (runs) => {
    const active = runs.find((r) => r.is_active)?.id || runs[0]?.id || null;
    set({ runs, activeRunId: active });
  },
  setActiveRunId: (id) => {
    set({ activeRunId: id });
    if (id) {
      api.updateRun(id, { is_active: true }).catch(() => {});
    }
  },
  fetchRuns: async () => {
    try {
      const runs = await api.getRuns();
      const currentActive = get().activeRunId;
      const serverActive = runs.find((r) => r.is_active)?.id;
      const active = serverActive || currentActive || runs[0]?.id || null;
      set({ runs, activeRunId: active });
    } catch {
      // fallback
    }
  },

  globalDragActive: false,
  setGlobalDragActive: (active) => set({ globalDragActive: active }),
  stagedFiles: [],
  setStagedFiles: (files) => set({ stagedFiles: files }),

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

