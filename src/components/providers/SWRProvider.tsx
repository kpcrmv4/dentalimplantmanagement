'use client';

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 5000,
        revalidateOnFocus: false,
        revalidateIfStale: true,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}
