import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server';

/**
 * POST /api/users
 * Create a new user with Supabase Auth + users table (Admin only)
 */
export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, full_name, role, license_number } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ (อีเมล, รหัสผ่าน, ชื่อ, บทบาท)' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' }, { status: 400 });
    }

    const serviceClient = createServiceRoleClient();

    // Create auth user with auto-confirm
    const { data: authData, error: createAuthError } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createAuthError) {
      return NextResponse.json({ error: createAuthError.message }, { status: 400 });
    }

    // Insert into users table
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        role,
        license_number: license_number || null,
        is_active: true,
      })
      .select()
      .single();

    if (userError) {
      // Rollback: delete the auth user
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    console.error('[API Users] Create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
