import { NextRequest, NextResponse } from 'next/server';
import { sendDailyNotification } from '@/lib/notification-service';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/cron/daily
 * Combined daily cron - sends BOTH morning (today) and evening (tomorrow) notifications
 * Used for Vercel Hobby plan (1 cron/day limit)
 *
 * For free plan: This runs once at 08:00 ICT and sends both:
 * - Today's case summary (morning notification)
 * - Tomorrow's case preview (evening notification)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron Daily] Starting combined daily notifications...');

    // Send both morning and evening notifications
    const [morningResults, eveningResults] = await Promise.all([
      sendDailyNotification('morning'),
      sendDailyNotification('evening'),
    ]);

    // Log to notification_logs
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('notification_logs').insert({
      recipient_type: 'system',
      channel: 'cron',
      notification_type: 'daily_combined',
      title: 'Daily Cron Completed',
      message: `Morning - Stock: ${morningResults.stock.push.sent + morningResults.stock.line.sent}, CS: ${morningResults.cs.push.sent + morningResults.cs.line.sent}, Dentist: ${morningResults.dentist.push.sent + morningResults.dentist.line.sent} | Evening - Stock: ${eveningResults.stock.push.sent + eveningResults.stock.line.sent}, CS: ${eveningResults.cs.push.sent + eveningResults.cs.line.sent}, Dentist: ${eveningResults.dentist.push.sent + eveningResults.dentist.line.sent}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { morning: morningResults, evening: eveningResults },
    });

    console.log('[Cron Daily] Completed:', { morning: morningResults, evening: eveningResults });

    return NextResponse.json({
      success: true,
      type: 'daily_combined',
      results: {
        morning: morningResults,
        evening: eveningResults,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron Daily] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/daily
 * For manual testing or external cron services
 * Pass ?secret=YOUR_SECRET&type=morning|evening|both
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const type = searchParams.get('type') || 'both';
  const cronSecret = process.env.CRON_SECRET;

  // Health check without secret
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({
      status: 'ready',
      message: 'Daily cron endpoint. Use ?secret=...&type=morning|evening|both to trigger.',
      usage: {
        morning: '/api/cron/daily?secret=...&type=morning',
        evening: '/api/cron/daily?secret=...&type=evening',
        both: '/api/cron/daily?secret=...&type=both',
      },
    });
  }

  console.log(`[Cron Daily] Manual trigger via GET, type: ${type}`);

  try {
    let results;

    if (type === 'morning') {
      results = { morning: await sendDailyNotification('morning') };
    } else if (type === 'evening') {
      results = { evening: await sendDailyNotification('evening') };
    } else {
      const [morning, evening] = await Promise.all([
        sendDailyNotification('morning'),
        sendDailyNotification('evening'),
      ]);
      results = { morning, evening };
    }

    return NextResponse.json({
      success: true,
      type,
      results,
      timestamp: new Date().toISOString(),
      triggered: 'manual',
    });
  } catch (error) {
    console.error('[Cron Daily] Manual trigger error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
