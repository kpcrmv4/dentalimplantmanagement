import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * PUT /api/users/[id]/disable
 * Toggle user is_active status (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify caller is admin
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (!callerProfile || callerProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_active } = body;

    const serviceClient = createServiceRoleClient();

    // Update users table
    const { data, error } = await serviceClient
      .from('users')
      .update({
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also ban/unban in Supabase Auth to prevent login
    if (!is_active) {
      await serviceClient.auth.admin.updateUserById(id, {
        ban_duration: '876000h', // ~100 years = effectively permanent
      });
    } else {
      await serviceClient.auth.admin.updateUserById(id, {
        ban_duration: 'none',
      });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('[API Users] Disable error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
