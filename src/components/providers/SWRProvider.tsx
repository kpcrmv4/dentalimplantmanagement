'use client';

import { useCallback } from 'react';
import { SWRConfig } from 'swr';
import { supabase } from '@/lib/supabase';
import { useSessionRefresh } from '@/hooks/useSessionRefresh';

/**
 * Coalesces concurrent session refresh attempts into a single call.
 * When multiple SWR hooks fail at the same time (e.g. after mobile
 * wake-up with expired JWT), only one refresh request is made.
 */
let pendingRefresh: Promise<void> | null = null;

async function refreshSessionOnce(): Promise<void> {
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = supabase.auth.refreshSession()
    .then(({ error }) => {
      if (error) {
        console.warn('[SWR] Session refresh failed:', error.message);
      }
    })
    .catch(() => {
      // Network error — retries will handle it
    })
    .finally(() => {
      // Allow a new refresh after this one settles
      pendingRefresh = null;
    });

  return pendingRefresh;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  // Proactively refresh session when page becomes visible (before SWR fires)
  useSessionRefresh();

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

      // On first retry, refresh the Supabase session in case the token expired.
      // Uses coalesced refresh so concurrent hook failures share one request.
      if (retryCount === 0) {
        await refreshSessionOnce();
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
        // Throttle focus revalidation so rapid focus/blur cycles don't
        // hammer the backend. Also gives the visibility-change session
        // refresh time to complete before SWR fires.
        focusThrottleInterval: 10000,
        onErrorRetry: handleErrorRetry,
      }}
    >
      {children}
    </SWRConfig>
  );
}
