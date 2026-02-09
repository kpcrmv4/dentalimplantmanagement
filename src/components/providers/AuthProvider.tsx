'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { forceLogout } from '@/lib/logout';

const AUTH_INIT_TIMEOUT_MS = 10_000;

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading } = useAuthStore();

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
      // between pages — the cached user stays visible while we silently
      // re-validate the session in the background.
      const cachedUser = useAuthStore.getState().user;
      if (!cachedUser) {
        setLoading(true);
      }

      // Safety net: if auth init takes too long, stop loading and
      // force-redirect to login so the user isn't stuck on a spinner.
      const timeout = setTimeout(() => {
        console.warn('Auth init timed out — forcing redirect to login');
        forceLogout();
      }, AUTH_INIT_TIMEOUT_MS);

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
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
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
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchUserProfile]);

  return <>{children}</>;
}
