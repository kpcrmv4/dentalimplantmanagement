import { createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * Verify the current user is authenticated and return their profile.
 * Centralized auth check for API routes and Server Actions.
 */
export async function verifyAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('id, role, full_name, email')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

/**
 * Verify the current user is an admin.
 * Returns the auth user if admin, null otherwise.
 */
export async function verifyAdmin() {
  const { user, profile } = await verifyAuth();

  if (!user || !profile || profile.role !== 'admin') {
    return null;
  }

  return user;
}
