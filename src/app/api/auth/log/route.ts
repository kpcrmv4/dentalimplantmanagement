import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server';

const ALLOWED_ACTIONS = ['LOGIN', 'LOGOUT', 'LOGIN_FAILED'] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, email } = body;

    // Validate action is one of the allowed types
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // For LOGIN_FAILED, we allow unauthenticated calls (user hasn't logged in yet)
    // but validate that email is provided
    if (action === 'LOGIN_FAILED') {
      if (!email) {
        return NextResponse.json({ error: 'Email is required for LOGIN_FAILED' }, { status: 400 });
      }
    } else {
      // For LOGIN and LOGOUT, verify the caller is authenticated
      const supabase = await createServerSupabaseClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Ensure logged user matches the userId being logged
      if (userId && userId !== user.id) {
        return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient.rpc('log_auth_event', {
      p_action: action,
      p_user_id: userId || null,
      p_email: email,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      console.error('Failed to log auth event:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, logId: data });
  } catch (error) {
    console.error('Auth log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
