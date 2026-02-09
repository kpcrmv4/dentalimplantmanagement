'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { supabase } from '@/lib/supabase';

// How long the page must be hidden before we force a full revalidation
// on return — 10 s catches most "phone locked then unlocked" scenarios.
const HIDDEN_THRESHOLD_MS = 10_000;

/**
 * Inner component that lives inside SWRConfig — detects when the page
 * has been hidden for longer than HIDDEN_THRESHOLD_MS and forces
 * a full revalidation (+ session refresh) when the user comes back.
 */
function VisibilityRevalidator({ children }: { children: React.ReactNode }) {
  const { mutate } = useSWRConfig();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
      } else if (
        hiddenAtRef.current &&
        Date.now() - hiddenAtRef.current > HIDDEN_THRESHOLD_MS
      ) {
        // Refresh auth session first, then revalidate all SWR keys
        supabase.auth.getUser().catch(() => {});
        mutate(() => true, undefined, { revalidate: true });
        hiddenAtRef.current = null;
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [mutate]);

  return <>{children}</>;
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
        onErrorRetry: handleErrorRetry,
      }}
    >
      <VisibilityRevalidator>{children}</VisibilityRevalidator>
    </SWRConfig>
  );
}
