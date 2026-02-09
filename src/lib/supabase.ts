import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Timeout in ms — prevents fetch from hanging indefinitely
// when the device resumes from sleep on slow mobile networks
const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // If the caller already provided a signal, forward its abort
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: fetchWithTimeout },
  });
}

// Singleton instance for client-side use
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
});
