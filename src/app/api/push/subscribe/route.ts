import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface SubscriptionData {
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  resubscribe?: boolean;
}

/**
 * POST /api/push/subscribe
 * Save a push subscription to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body: SubscriptionData = await request.json();
    const { userId, subscription, resubscribe } = body;

    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const userAgent = request.headers.get('user-agent') || undefined;

    // Upsert subscription (update if endpoint exists, insert if new)
    const { data, error } = await serviceClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: userAgent,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'endpoint',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Push Subscribe] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save subscription' },
        { status: 500 }
      );
    }

    // Log the subscription event
    await serviceClient.from('notification_logs').insert({
      user_id: userId,
      recipient_type: 'user',
      recipient_id: userId,
      channel: 'push',
      notification_type: resubscribe ? 'resubscribe' : 'subscribe',
      title: 'Push Subscription',
      message: resubscribe ? 'Push subscription renewed' : 'Push notifications enabled',
      status: 'sent',
      metadata: {
        endpoint: subscription.endpoint.substring(0, 100),
        user_agent: userAgent?.substring(0, 200),
      },
    });

    return NextResponse.json({
      success: true,
      id: data?.id,
    });
  } catch (error) {
    console.error('[Push Subscribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
