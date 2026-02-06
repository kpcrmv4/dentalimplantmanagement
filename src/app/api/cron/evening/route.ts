import { NextRequest, NextResponse } from 'next/server';
import { sendDailyNotification } from '@/lib/notification-service';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/cron/evening
 * Triggered by Vercel Cron at evening time (default 17:00 ICT = 10:00 UTC)
 * Sends daily summary notifications for TOMORROW's cases
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron Evening] Starting evening notifications...');

    const results = await sendDailyNotification('evening');

    // Log to notification_logs
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('notification_logs').insert({
      recipient_type: 'system',
      channel: 'cron',
      notification_type: 'daily_evening',
      title: 'Evening Cron Completed',
      message: `Stock: ${results.stock.push.sent + results.stock.line.sent} sent, CS: ${results.cs.push.sent + results.cs.line.sent} sent, Dentist: ${results.dentist.push.sent + results.dentist.line.sent} sent`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: results,
    });

    console.log('[Cron Evening] Completed:', results);

    return NextResponse.json({
      success: true,
      type: 'evening',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Evening] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/evening?secret=YOUR_SECRET
 * For external cron services like cron-job.org
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  // Verify secret
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // No secret configured = allow (for testing)
  if (!cronSecret) {
    console.warn('[Cron Evening] CRON_SECRET not configured!');
  }

  console.log('[Cron Evening] Triggered via GET');

  try {
    const results = await sendDailyNotification('evening');

    // Log to notification_logs
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('notification_logs').insert({
      recipient_type: 'system',
      channel: 'cron',
      notification_type: 'daily_evening',
      title: 'Evening Cron Completed',
      message: `Stock: ${results.stock.push.sent + results.stock.line.sent} sent, CS: ${results.cs.push.sent + results.cs.line.sent} sent, Dentist: ${results.dentist.push.sent + results.dentist.line.sent} sent`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: results,
    });

    return NextResponse.json({
      success: true,
      type: 'evening',
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Evening] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
