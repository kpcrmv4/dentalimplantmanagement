import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/database';

const STORE_VERSION = 1;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  _hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isAuthReady: false,
      _hasHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false, isAuthReady: true }),
      setLoading: (isLoading) => set({ isLoading, isAuthReady: !isLoading && useAuthStore.getState()._hasHydrated }),
      logout: () => set({ user: null, isAuthenticated: false, isAuthReady: true }),
      setHasHydrated: (state) => set({ _hasHydrated: state, isAuthReady: state && !useAuthStore.getState().isLoading }),
    }),
    {
      name: `auth-storage:v${STORE_VERSION}`,
      version: STORE_VERSION,
      partialize: (state): { user: User | null; isAuthenticated: boolean } => ({
        // Store only the fields UI needs — no tokens, no internal flags
        user: state.user
          ? ({
              id: state.user.id,
              email: state.user.email,
              full_name: state.user.full_name,
              role: state.user.role,
              is_active: state.user.is_active,
              line_user_id: state.user.line_user_id,
            } as User)
          : null,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persisted, version) => {
        // Clear stale data from old versions
        if (version < STORE_VERSION) {
          return { user: null, isAuthenticated: false };
        }
        return persisted as { user: User | null; isAuthenticated: boolean };
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
