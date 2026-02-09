'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Re-validate the session when the page has been hidden for this long
const SESSION_REVALIDATE_THRESHOLD_MS = 60_000; // 1 minute

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading } = useAuthStore();
  const hiddenAtRef = useRef<number | null>(null);

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
        setUser(null);
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
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading, fetchUserProfile]);

  // Re-validate session when page becomes visible after a long idle.
  // This catches the mobile scenario where the OS froze the page and
  // the JWT expired while the app was in the background.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt === null) return;

      const elapsed = Date.now() - hiddenAt;
      if (elapsed < SESSION_REVALIDATE_THRESHOLD_MS) return;

      // Silently re-validate — don't set loading to avoid flicker
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userData = await fetchUserProfile(user.id);
          setUser(userData ?? null);
        } else {
          setUser(null);
        }
      } catch {
        // Network might still be recovering; leave current user in place
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [setUser, fetchUserProfile]);

  return <>{children}</>;
}
