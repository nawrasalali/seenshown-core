import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Auth
  userId: string | null;
  userTier: 'free' | 'pro' | 'team';
  setUser: (id: string | null, tier?: 'free' | 'pro' | 'team') => void;

  // Global UI
  showAuthModal: boolean;
  authMode: 'signin' | 'signup';
  openAuthModal: (mode?: 'signin' | 'signup') => void;
  closeAuthModal: () => void;

  // Onboarding
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;

  // Query history (last 10)
  queryHistory: string[];
  addQuery: (query: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      userId: null,
      userTier: 'free',
      setUser: (id, tier = 'free') => set({ userId: id, userTier: tier }),

      showAuthModal: false,
      authMode: 'signup',
      openAuthModal: (mode = 'signup') => set({ showAuthModal: true, authMode: mode }),
      closeAuthModal: () => set({ showAuthModal: false }),

      hasSeenOnboarding: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),

      queryHistory: [],
      addQuery: (query) => set((state) => ({
        queryHistory: [query, ...state.queryHistory.filter(q => q !== query)].slice(0, 10),
      })),
    }),
    {
      name: 'seenshown-ui',
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        queryHistory: state.queryHistory,
        userTier: state.userTier,
      }),
    }
  )
);
