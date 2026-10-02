import { create } from 'zustand';

interface User {
  user_id: string;
  username: string;
  role: string;
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Run
  currentRunId: string | null;
  setCurrentRunId: (id: string | null) => void;

  // Selected alert/account
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string | null) => void;

  // Drawer
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;

  // Locale
  locale: 'en' | 'hi';
  setLocale: (l: 'en' | 'hi') => void;

  // Density
  density: 'comfortable' | 'compact';
  toggleDensity: () => void;

  // Reduce motion
  reduceMotion: boolean;
  toggleReduceMotion: () => void;

  // Pipeline events
  pipelineStage: string | null;
  pipelineProgress: number;
  setPipelineState: (stage: string | null, progress: number) => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: !!localStorage.getItem('muletrace_token'),
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    localStorage.removeItem('muletrace_token');
    localStorage.removeItem('muletrace_refresh');
    set({ user: null, isAuthenticated: false });
  },

  // Theme
  theme: (localStorage.getItem('muletrace_theme') as 'dark' | 'light') || 'dark',
  toggleTheme: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('muletrace_theme', next);
    document.documentElement.setAttribute('data-theme', next);
    return { theme: next };
  }),

  // Run
  currentRunId: null,
  setCurrentRunId: (id) => set({ currentRunId: id }),

  // Selected
  selectedAccountId: null,
  setSelectedAccountId: (id) => set({ selectedAccountId: id, drawerOpen: !!id }),

  // Drawer
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),

  // Locale
  locale: 'en',
  setLocale: (l) => set({ locale: l }),

  // Density
  density: 'comfortable',
  toggleDensity: () => set((s) => ({
    density: s.density === 'comfortable' ? 'compact' : 'comfortable',
  })),

  // Motion
  reduceMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
  toggleReduceMotion: () => set((s) => ({ reduceMotion: !s.reduceMotion })),

  // Pipeline
  pipelineStage: null,
  pipelineProgress: 0,
  setPipelineState: (stage, progress) => set({ pipelineStage: stage, pipelineProgress: progress }),

  // Command palette
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
