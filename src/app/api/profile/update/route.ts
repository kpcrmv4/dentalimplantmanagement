import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/profile/update
 * Update own profile name (authenticated user)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { full_name } = await request.json();

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อ' }, { status: 400 });
    }

    // Use service role to bypass RLS if needed
    const serviceClient = createServiceRoleClient();

    const { data, error } = await serviceClient
      .from('users')
      .update({
        full_name: full_name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error) {
    console.error('[API Profile] Update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
