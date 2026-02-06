import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface UnsubscribeData {
  endpoint: string;
  userId?: string;
}

/**
 * POST /api/push/unsubscribe
 * Remove a push subscription from the database
 */
export async function POST(request: NextRequest) {
  try {
    const body: UnsubscribeData = await request.json();
    const { endpoint, userId } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();

    // Find and delete the subscription
    const { data: subscription, error: findError } = await serviceClient
      .from('push_subscriptions')
      .select('id, user_id')
      .eq('endpoint', endpoint)
      .single();

    if (findError || !subscription) {
      // Subscription not found, consider it already unsubscribed
      return NextResponse.json({ success: true, message: 'Not found or already unsubscribed' });
    }

    // Delete the subscription
    const { error: deleteError } = await serviceClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    if (deleteError) {
      console.error('[Push Unsubscribe] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove subscription' },
        { status: 500 }
      );
    }

    // Log the unsubscription event
    await serviceClient.from('notification_logs').insert({
      user_id: subscription.user_id,
      recipient_type: 'user',
      recipient_id: subscription.user_id,
      channel: 'push',
      notification_type: 'unsubscribe',
      title: 'Push Unsubscription',
      message: 'Push notifications disabled',
      status: 'sent',
      metadata: {
        endpoint: endpoint.substring(0, 100),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Push Unsubscribe] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
