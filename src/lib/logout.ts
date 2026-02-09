import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

const LOGOUT_TIMEOUT_MS = 5_000;

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

  // Sign out with timeout — don't hang forever on slow mobile networks
  await Promise.race([
    supabase.auth.signOut(),
    new Promise((resolve) => setTimeout(resolve, LOGOUT_TIMEOUT_MS)),
  ]);
}

/**
 * Emergency logout: clears local state and redirects immediately.
 * Use when the normal logout flow hangs or auth is completely stuck.
 */
export function forceLogout() {
  useAuthStore.getState().logout();
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') || key.startsWith('auth-storage')) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // localStorage may not be available
  }
  window.location.href = '/login';
}
