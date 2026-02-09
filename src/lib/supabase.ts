import { createBrowserClient } from '@supabase/ssr';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Timeout in ms — prevents fetch from hanging indefinitely on mobile
// when the device resumes from sleep / background freeze.
const FETCH_TIMEOUT_MS = 30_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  // If caller already supplies a signal, forward its abort as well
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort(init.signal!.reason));
  }
  const timeout = setTimeout(() => controller.abort('timeout'), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

// Create Supabase client for browser
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout },
  });
}

// Export a singleton instance for client-side use
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
