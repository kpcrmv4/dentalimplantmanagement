import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Service role client for admin operations (bypasses RLS)
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Get current user from server
export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  // Get user profile from users table
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return {
    ...user,
    profile,
  };
}

// Check if user has specific role
export async function checkUserRole(allowedRoles: string[]) {
  const user = await getServerUser();
  
  if (!user || !user.profile) {
    return { authorized: false, user: null };
  }
  
  const isAuthorized = allowedRoles.includes(user.profile.role);
  
  return { authorized: isAuthorized, user };
}

// Log authentication event
export async function logAuthEvent(
  action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED',
  userId: string | null,
  email: string,
  ipAddress?: string,
  userAgent?: string
) {
  const serviceClient = createServiceRoleClient();
  
  const { data, error } = await serviceClient.rpc('log_auth_event', {
    p_action: action,
    p_user_id: userId,
    p_email: email,
    p_ip_address: ipAddress || null,
    p_user_agent: userAgent || null,
  });
  
  if (error) {
    console.error('Failed to log auth event:', error);
  }
  
  return data;
}
