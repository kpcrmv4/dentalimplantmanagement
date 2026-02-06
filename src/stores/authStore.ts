import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/database';

const STORE_VERSION = 1;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
      _hasHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, isAuthenticated: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: `auth-storage:v${STORE_VERSION}`,
      version: STORE_VERSION,
      partialize: (state) => ({
        // Store only the fields UI needs — no tokens, no internal flags
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              full_name: state.user.full_name,
              role: state.user.role,
              is_active: state.user.is_active,
              line_user_id: state.user.line_user_id,
            }
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
