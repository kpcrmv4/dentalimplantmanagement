import { supabase } from '@/lib/supabase';

/**
 * Centralized session manager.
 *
 * Instead of having three independent systems (useSessionRefresh,
 * SWR error retry, Supabase auto-refresh) all racing to refresh the
 * token, this module provides a single point of coordination.
 *
 * Key guarantees:
 * - Only ONE refresh request is in-flight at any time
 * - Callers can `await` the result so they know the token is fresh
 *   before firing data queries
 * - After a configurable number of failures the session is considered
 *   dead and the caller is told to redirect to login
 */

let inflightRefresh: Promise<boolean> | null = null;
let consecutiveFailures = 0;
const MAX_FAILURES = 2;

/**
 * Ensures a valid Supabase session exists.
 *
 * - If a refresh is already in-flight, returns the same promise
 *   (deduplication).
 * - Returns `true` if the session is valid, `false` if the session is
 *   dead and the user should be redirected to login.
 */
export function ensureSession(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        consecutiveFailures++;
        if (consecutiveFailures >= MAX_FAILURES) {
          return false; // Session is dead
        }
        // One-off failure — maybe transient network blip
        return true;
      }

      // Success — reset counter
      consecutiveFailures = 0;
      return true;
    } catch {
      consecutiveFailures++;
      return consecutiveFailures < MAX_FAILURES;
    } finally {
      inflightRefresh = null;
    }
  })();

  return inflightRefresh;
}

/** Reset failure counter (call on fresh login). */
export function resetSessionState() {
  consecutiveFailures = 0;
  inflightRefresh = null;
}
