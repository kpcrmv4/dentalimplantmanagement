'use client';

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { resetSessionState } from '@/lib/session';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setLoading } = useAuthStore();

  // Use a ref to read the cached user inside the effect without
  // adding it to the dependency array (which caused an infinite loop:
  // setUser → cachedUser changes → effect re-runs → setUser → …).
  const cachedUserRef = useRef(useAuthStore.getState().user);
  useEffect(() => {
    // Keep the ref in sync via Zustand subscribe (runs outside React render)
    const unsub = useAuthStore.subscribe((s) => {
      cachedUserRef.current = s.user;
    });
    return unsub;
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (cancelled) return;

        if (user) {
          const userData = await fetchUserProfile(user.id);
          if (!cancelled) setUser(userData ?? null);
        } else {
          if (!cancelled) setUser(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Auth init error:', error);
        // Only clear user if there's no cached version — a transient
        // network error on mobile shouldn't wipe the UI.
        if (!cachedUserRef.current) {
          setUser(null);
        }
        setLoading(false);
      }
    };

    initAuth();

    // This subscription lives for the entire app lifetime.
    // It must NOT be torn down and recreated on state changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;

        if (event === 'SIGNED_IN' && session?.user) {
          resetSessionState(); // fresh login → reset failure counter
          const userData = await fetchUserProfile(session.user.id);
          if (userData && !cancelled) {
            setUser(userData);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Token was refreshed successfully (e.g. after mobile wake-up).
          // No need to re-fetch the profile — the cached user data is
          // still valid.  Triggering a profile fetch here would add
          // unnecessary latency and network traffic on every refresh.
        } else if (event === 'SIGNED_OUT') {
          if (!cancelled) setUser(null);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // Intentionally empty deps — this effect runs once on mount.
    // We read mutable state via refs and Zustand subscribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
