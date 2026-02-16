'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { ensureSession } from '@/lib/session';

/**
 * Inner component that handles visibility-change → session refresh →
 * SWR revalidation in one coordinated sequence.
 *
 * Why a separate inner component?  We need access to SWR's `mutate`
 * which is only available inside <SWRConfig>.
 */
function SessionGate() {
  const { mutate } = useSWRConfig();
  const lastWakeRef = useRef(0);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;

      // Debounce: ignore if we already handled a wake-up <5s ago
      const now = Date.now();
      if (now - lastWakeRef.current < 5_000) return;
      lastWakeRef.current = now;

      // 1. Refresh the session (deduplicated — safe to call from anywhere)
      const alive = await ensureSession();

      if (!alive) {
        // Session is dead — force redirect to login.
        // Clear local auth cache so the login page starts clean.
        try { localStorage.removeItem('auth-storage:v1'); } catch {}
        window.location.href = '/login';
        return;
      }

      // 2. Session is good — now revalidate ALL SWR caches with
      //    the fresh token.  This replaces revalidateOnFocus.
      mutate(
        () => true,           // match every key
        undefined,            // don't update cached data directly
        { revalidate: true }, // trigger background revalidation
      );
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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
      // Don't retry 4xx client errors (except auth-related)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 401 && error?.status !== 403) return;
      if (retryCount >= 3) return;

      // On first retry for auth errors, try one session refresh.
      // This covers edge cases NOT triggered by visibility change
      // (e.g. token expires while the tab is in the foreground).
      if (retryCount === 0 && (error?.status === 401 || error?.status === 403 || error?.code === 'PGRST301')) {
        const alive = await ensureSession();
        if (!alive) {
          try { localStorage.removeItem('auth-storage:v1'); } catch {}
          window.location.href = '/login';
          return;
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
        // IMPORTANT: revalidateOnFocus is OFF.
        // SessionGate handles wake-up: refresh token first, THEN
        // trigger revalidation.  This is the key fix — the old
        // approach let SWR fire with an expired token.
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        revalidateOnMount: true,
        keepPreviousData: true,
        errorRetryCount: 3,
        onErrorRetry: handleErrorRetry,
      }}
    >
      <SessionGate />
      {children}
    </SWRConfig>
  );
}
