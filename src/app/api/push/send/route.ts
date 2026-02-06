import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import webpush from 'web-push';

interface SendPushData {
  userId?: string;
  userIds?: string[];
  roles?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@dentalstock.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * POST /api/push/send
 * Send push notifications to users
 */
export async function POST(request: NextRequest) {
  try {
    // Check if VAPID keys are configured
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Push notifications not configured (VAPID keys missing)' },
        { status: 500 }
      );
    }

    const body: SendPushData = await request.json();
    const { userId, userIds, roles, title, body: messageBody, url, tag, data, actions } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Missing title or body' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const targetUserIds: string[] = [];

    // Collect user IDs from various sources
    if (userId) {
      targetUserIds.push(userId);
    }
    if (userIds && Array.isArray(userIds)) {
      targetUserIds.push(...userIds);
    }

    // Get users by role if specified
    if (roles && roles.length > 0) {
      const { data: roleUsers } = await serviceClient
        .from('users')
        .select('id')
        .in('role', roles)
        .eq('is_active', true);

      if (roleUsers) {
        targetUserIds.push(...roleUsers.map((u) => u.id));
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(targetUserIds)];

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No target users' });
    }

    // Get active push subscriptions for these users
    const { data: subscriptions, error: subError } = await serviceClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', uniqueUserIds)
      .eq('is_active', true);

    if (subError) {
      console.error('[Push Send] Subscription query error:', subError);
      return NextResponse.json(
        { error: 'Failed to get subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No active subscriptions' });
    }

    // Prepare push payload
    const payload = JSON.stringify({
      title,
      body: messageBody,
      url: url || '/notifications',
      tag: tag || 'notification',
      data: data || {},
      actions: actions || [],
    });

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh_key,
                auth: sub.auth_key,
              },
            },
            payload
          );
          return { success: true, subscriptionId: sub.id, userId: sub.user_id };
        } catch (error: unknown) {
          const pushError = error as { statusCode?: number };
          // Handle expired/invalid subscriptions
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            // Mark subscription as inactive
            await serviceClient
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', sub.id);
          }
          throw error;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log the notification
    const logEntries = uniqueUserIds.map((uid) => ({
      user_id: uid,
      recipient_type: 'user' as const,
      recipient_id: uid,
      channel: 'push' as const,
      notification_type: tag || 'notification',
      title,
      message: messageBody,
      status: 'sent' as const,
      metadata: {
        url,
        subscriptions_count: subscriptions.filter((s) => s.user_id === uid).length,
      },
      sent_at: new Date().toISOString(),
    }));

    await serviceClient.from('notification_logs').insert(logEntries);

    return NextResponse.json({
      sent,
      failed,
      total: subscriptions.length,
      users: uniqueUserIds.length,
    });
  } catch (error) {
    console.error('[Push Send] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
