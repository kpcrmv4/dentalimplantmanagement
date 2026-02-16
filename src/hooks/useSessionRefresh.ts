'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Proactively refreshes the Supabase session when the page becomes visible
 * after being backgrounded (e.g. mobile screen lock, tab switch).
 *
 * This MUST run before SWR's revalidateOnFocus fires so that all data
 * fetches use a fresh JWT. We achieve this by listening to
 * `visibilitychange` which fires before the `focus` event that SWR uses.
 */
export function useSessionRefresh() {
  const lastRefreshRef = useRef<number>(Date.now());
  // Minimum interval between session refreshes (2 minutes)
  const MIN_REFRESH_INTERVAL = 2 * 60 * 1000;

  const refreshSession = useCallback(async () => {
    const now = Date.now();
    const elapsed = now - lastRefreshRef.current;

    // Only refresh if enough time has passed since the last refresh
    if (elapsed < MIN_REFRESH_INTERVAL) return;

    lastRefreshRef.current = now;

    try {
      // refreshSession() explicitly requests a new JWT from Supabase,
      // unlike getUser() which only verifies the current token.
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[SessionRefresh] Token refresh failed:', error.message);
      }
    } catch (err) {
      console.warn('[SessionRefresh] Network error during refresh:', err);
    }
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Fire session refresh immediately when page becomes visible.
        // This runs before SWR's focus handler, ensuring a fresh token.
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshSession]);
}
