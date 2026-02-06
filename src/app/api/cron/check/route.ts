import { NextRequest, NextResponse } from 'next/server';
import { sendDailyNotification } from '@/lib/notification-service';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * GET /api/cron/check?secret=YOUR_SECRET
 *
 * Smart cron endpoint - runs every 15 minutes
 * Checks user-configured notification times and sends if it's time
 *
 * Setup in cron-job.org:
 * - URL: https://your-app.vercel.app/api/cron/check?secret=YOUR_SECRET
 * - Schedule: every 15 minutes
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const cronSecret = process.env.CRON_SECRET;

  // Verify secret
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = createServiceRoleClient();

  try {
    // Get notification settings
    const { data: settingsData } = await serviceClient
      .from('settings')
      .select('key, value')
      .in('key', [
        'scheduled_notification_enabled',
        'morning_notification_time',
        'evening_notification_time',
        'last_morning_notification',
        'last_evening_notification',
      ]);

    const settings: Record<string, string> = {};
    settingsData?.forEach((s) => {
      try {
        settings[s.key] = JSON.parse(s.value as string);
      } catch {
        settings[s.key] = s.value as string;
      }
    });

    // Check if notifications are enabled
    if (settings['scheduled_notification_enabled'] === 'false' || settings['scheduled_notification_enabled'] === false as unknown as string) {
      return NextResponse.json({
        success: true,
        message: 'Scheduled notifications are disabled',
        checked_at: new Date().toISOString(),
      });
    }

    // Get current time in Thailand timezone (UTC+7)
    const now = new Date();
    const thailandTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const currentHour = thailandTime.getHours();
    const currentMinute = thailandTime.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    const todayDate = thailandTime.toISOString().split('T')[0];

    const morningTime = settings['morning_notification_time'] || '08:00';
    const eveningTime = settings['evening_notification_time'] || '17:00';
    const lastMorning = settings['last_morning_notification'] || '';
    const lastEvening = settings['last_evening_notification'] || '';

    const results: {
      morning?: unknown;
      evening?: unknown;
    } = {};
    let sent = false;

    // Check if it's time for morning notification
    if (isTimeToNotify(currentTimeStr, morningTime) && lastMorning !== todayDate) {
      console.log(`[Cron Check] Sending morning notification at ${currentTimeStr}`);
      results.morning = await sendDailyNotification('morning');

      // Update last sent time
      await serviceClient.from('settings').upsert({
        key: 'last_morning_notification',
        value: JSON.stringify(todayDate),
        description: 'Last morning notification date',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      sent = true;
    }

    // Check if it's time for evening notification
    if (isTimeToNotify(currentTimeStr, eveningTime) && lastEvening !== todayDate) {
      console.log(`[Cron Check] Sending evening notification at ${currentTimeStr}`);
      results.evening = await sendDailyNotification('evening');

      // Update last sent time
      await serviceClient.from('settings').upsert({
        key: 'last_evening_notification',
        value: JSON.stringify(todayDate),
        description: 'Last evening notification date',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      sent = true;
    }

    // Log if sent
    if (sent) {
      await serviceClient.from('notification_logs').insert({
        recipient_type: 'system',
        channel: 'cron',
        notification_type: 'scheduled_check',
        title: 'Scheduled Notification Sent',
        message: `Morning: ${results.morning ? 'sent' : 'skipped'}, Evening: ${results.evening ? 'sent' : 'skipped'}`,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: {
          currentTime: currentTimeStr,
          morningTime,
          eveningTime,
          results,
        },
      });
    }

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      thailand_time: currentTimeStr,
      settings: {
        morningTime,
        eveningTime,
        lastMorning,
        lastEvening,
      },
      sent,
      results: sent ? results : 'No notifications due at this time',
    });
  } catch (error) {
    console.error('[Cron Check] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Check if current time is within 15-minute window of target time
 */
function isTimeToNotify(currentTime: string, targetTime: string): boolean {
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;

  // Check if within 15-minute window (0-14 minutes after target time)
  const diff = currentTotalMinutes - targetTotalMinutes;
  return diff >= 0 && diff < 15;
}

// Also support POST for compatibility
export async function POST(request: NextRequest) {
  return GET(request);
}
