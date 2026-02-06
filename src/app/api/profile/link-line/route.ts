import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server';
import crypto from 'crypto';

/**
 * POST /api/profile/link-line
 * Generate a LINE linking code for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has LINE connected
    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('users')
      .select('line_user_id')
      .eq('id', user.id)
      .single();

    if (profile?.line_user_id) {
      return NextResponse.json({ error: 'LINE เชื่อมต่ออยู่แล้ว' }, { status: 400 });
    }

    // Generate a short linking code: LINK-XXXXXX (6 uppercase alphanumeric chars)
    const code = 'LINK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

    // Expire after 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store with code as key for direct lookup from webhook
    await serviceClient.from('settings').upsert({
      key: `line_link_code_${code}`,
      value: JSON.stringify({
        userId: user.id,
        expiresAt,
      }),
      description: `LINE linking code for user ${user.id}`,
    }, { onConflict: 'key' });

    // Also store user -> code mapping for cleanup
    await serviceClient.from('settings').upsert({
      key: `line_link_user_${user.id}`,
      value: JSON.stringify({ code }),
      description: `LINE linking reference for user ${user.id}`,
    }, { onConflict: 'key' });

    return NextResponse.json({ success: true, code, expiresAt });
  } catch (error) {
    console.error('[API Profile] Link LINE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/profile/link-line
 * Check LINE linking status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();
    const { data: profile } = await serviceClient
      .from('users')
      .select('line_user_id')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      connected: !!profile?.line_user_id,
      lineUserId: profile?.line_user_id || null,
    });
  } catch (error) {
    console.error('[API Profile] Check LINE status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
