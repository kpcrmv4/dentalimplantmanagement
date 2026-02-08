'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading, setHasHydrated } = useAuthStore();

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Only show loading if there's no cached user from hydration.
      // This prevents a flash of empty state on mobile when navigating
      // Only show loading if there's no cached user from hydration.
      // This prevents a flash of empty state on mobile when navigating
      // between pages — the cached user stays visible while we silently
      // re-validate the session in the background.
      const cachedUser = useAuthStore.getState().user;
      // Set loading to true only if we don't have a cached user and haven't hydrated yet
      if (!cachedUser && !useAuthStore.getState()._hasHydrated) {
        setLoading(true);
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const userData = await fetchUserProfile(user.id);
          setUser(userData ?? null);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        // Only clear user if there's no cached version — a transient
        // network error on mobile shouldn't wipe the UI.
        if (!useAuthStore.getState().user) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    // Wait for Zustand to rehydrate before initializing auth
    const unsubscribeHydration = useAuthStore.persist.onFinishHydration(() => {
      initAuth();
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await fetchUserProfile(session.user.id);
          if (userData) {
            setUser(userData);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      unsubscribeHydration();
      authSubscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchUserProfile, setHasHydrated]);

  return <>{children}</>;
}
