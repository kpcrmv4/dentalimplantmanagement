import { supabase } from '@/lib/supabase';
import { resetSessionState } from '@/lib/session';

/** Race a promise against a timeout. Resolves with the promise or rejects after ms. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Logout timed out')), ms)
    ),
  ]);
}

export async function performLogout(user: { id: string; email: string } | null) {
  // Log the logout event (fire-and-forget)
  if (user) {
    fetch('/api/auth/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'LOGOUT',
        userId: user.id,
        email: user.email,
      }),
    }).catch(() => {});
  }

  // Reset session manager so it doesn't think the session is still alive
  resetSessionState();

  // Clear persisted auth store FIRST so the UI doesn't show stale data
  // even if the network call below hangs.
  try {
    localStorage.removeItem('auth-storage:v1');
  } catch {
    // localStorage may be unavailable in some contexts
  }

  // Sign out with a 5-second timeout — don't hang forever on slow
  // mobile networks or when the session is already expired.
  try {
    await withTimeout(supabase.auth.signOut(), 5000);
  } catch {
    // Timeout or network error — we still proceed with the redirect.
    // The server-side session will expire on its own.
  }
}
