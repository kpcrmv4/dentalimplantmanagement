import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/profile/unlink-line
 * Remove LINE connection for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Remove line_user_id from users table
    const { error: updateError } = await serviceClient
      .from('users')
      .update({
        line_user_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Clean up any pending linking tokens
    await serviceClient
      .from('settings')
      .delete()
      .eq('key', `line_link_user_${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Profile] Unlink LINE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
