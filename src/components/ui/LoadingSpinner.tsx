'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  /** milliseconds before showing the "tap to retry" fallback (default 15 000) */
  timeoutMs?: number;
  /** called when the user taps the retry button */
  onRetry?: () => void;
}

/**
 * A loading spinner that automatically detects when a request has been
 * taking too long and offers a manual retry button.
 *
 * Solves the mobile-specific issue where fetch requests hang indefinitely
 * after the OS freezes / resumes the page.
 */
export function LoadingSpinner({ timeoutMs = 15_000, onRetry }: LoadingSpinnerProps) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    const id = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(id);
  }, [timeoutMs]);

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <p className="text-sm text-gray-500">โหลดข้อมูลนานเกินไป</p>
        <button
          type="button"
          onClick={() => {
            setTimedOut(false);
            onRetry?.();
            // If no onRetry provided, hard-reload as last resort
            if (!onRetry) {
              window.location.reload();
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-95 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}
