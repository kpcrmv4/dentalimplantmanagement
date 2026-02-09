import { supabase } from '@/lib/supabase';

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
  await supabase.auth.signOut();
}
