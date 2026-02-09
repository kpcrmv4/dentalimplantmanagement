'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { supabase } from '@/lib/supabase';

// How long the page must be hidden before we force-recover on return (ms)
const HIDDEN_THRESHOLD_MS = 30_000; // 30 seconds

/**
 * Inner component that lives inside <SWRConfig> so it can call useSWRConfig().
 * Handles page visibility changes to recover from stale / hung requests
 * that commonly occur on mobile devices after OS-level page freeze.
 */
function VisibilityRecovery() {
  const { mutate } = useSWRConfig();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      // Page just became visible
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;

      if (hiddenAt === null) return;

      const elapsed = Date.now() - hiddenAt;
      if (elapsed < HIDDEN_THRESHOLD_MS) return;

      // Page was hidden for a long time — likely frozen by the OS.
      // 1. Refresh the Supabase session so the JWT is valid again.
      try {
        await supabase.auth.getUser();
      } catch {
        // If the session is truly dead the auth listener will handle sign-out.
      }

      // 2. Force SWR to discard every in-flight request and re-fetch.
      //    Using `mutate(() => true)` matches all keys.
      await mutate(
        () => true, // match every key
        undefined,  // don't set data
        { revalidate: true },
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mutate]);

  return null;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const handleErrorRetry = useCallback(
    async (
      error: any,
      _key: string,
      _config: any,
      revalidate: (opts: { retryCount: number }) => void,
      { retryCount }: { retryCount: number }
    ) => {
      // Don't retry on 4xx client errors (except 401/403 which may be auth-related)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 401 && error?.status !== 403) return;
      if (retryCount >= 3) return;

      // On first retry, refresh the Supabase session in case the token expired
      // (e.g. user left the page open for a long time then navigated)
      if (retryCount === 0) {
        try {
          await supabase.auth.getUser();
        } catch {
          // ignore — the retry itself will test if it worked
        }
      }

      setTimeout(
        () => revalidate({ retryCount }),
        Math.min(1000 * 2 ** retryCount, 5000)
      );
    },
    []
  );

  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        revalidateOnMount: true,
        keepPreviousData: true,
        errorRetryCount: 3,
        // Lower the throttle so focus-revalidation fires faster after resume
        focusThrottleInterval: 3000,
        onErrorRetry: handleErrorRetry,
      }}
    >
      <VisibilityRecovery />
      {children}
    </SWRConfig>
  );
}
