'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        revalidateOnMount: true,
        keepPreviousData: true,
        errorRetryCount: 2,
        onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
          // Don't retry on 4xx client errors
          if (error?.status >= 400 && error?.status < 500) return;
          // Only retry up to 2 times with exponential backoff
          if (retryCount >= 2) return;
          setTimeout(() => revalidate({ retryCount }), Math.min(1000 * 2 ** retryCount, 5000));
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
