'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { user: cachedUser, setUser, setLoading } = useAuthStore();

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
      setLoading(true);

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
        if (!cachedUser) {
          setUser(null);
        }
        setLoading(false);
      } finally {
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
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token was refreshed successfully (e.g. after mobile wake-up).
          // Re-fetch the profile to ensure data is current, but only if
          // the cached user id matches (don't overwrite a different session).
          if (cachedUser?.id === session.user.id) {
            try {
              const userData = await fetchUserProfile(session.user.id);
              if (userData) {
                setUser(userData);
              }
            } catch {
              // Profile fetch failed — keep cached data, don't clear UI
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchUserProfile, cachedUser]);

  return <>{children}</>;
}
