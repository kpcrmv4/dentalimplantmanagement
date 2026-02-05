import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, email } = body;
    
    // Get IP and User Agent from headers
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
