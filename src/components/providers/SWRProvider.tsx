'use client';

import { useCallback } from 'react';
import { SWRConfig } from 'swr';
import { supabase } from '@/lib/supabase';

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
      {children}
    </SWRConfig>
  );
}
