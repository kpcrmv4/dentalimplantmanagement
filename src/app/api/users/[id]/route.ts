import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server';

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser }, error } = await supabase.auth.getUser();
  if (error || !authUser) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (!profile || profile.role !== 'admin') return null;
  return authUser;
}

/**
 * PUT /api/users/[id]
 * Update user profile data (Admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { full_name, role, license_number } = body;

    if (!full_name || !role) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อและบทบาท' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('users')
      .update({
        full_name,
        role,
        license_number: license_number || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('[API Users] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Delete user from auth + users table (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const serviceClient = createServiceRoleClient();

    // Delete from users table (cascade will handle related data)
    const { error: userError } = await serviceClient
      .from('users')
      .delete()
      .eq('id', id);

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Delete from auth
    const { error: authError } = await serviceClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error('[API Users] Auth delete error (user table already deleted):', authError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API Users] Delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
