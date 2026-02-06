import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface TestLineData {
  accessToken: string;
  saveToken?: boolean;
}

interface LineBotInfo {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode: string;
  markAsReadMode: string;
}

/**
 * POST /api/line/test
 * Test LINE connection and get bot info
 */
export async function POST(request: NextRequest) {
  try {
    const body: TestLineData = await request.json();
    const { accessToken, saveToken = false } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing accessToken' },
        { status: 400 }
      );
    }

    // Test the token by getting bot info
    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[LINE Test] API error:', response.status, errorData);

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid token or API error',
          details: errorData,
        },
        { status: response.status === 401 ? 401 : 400 }
      );
    }

    const botInfo: LineBotInfo = await response.json();

    // Optionally save the token to settings
    if (saveToken) {
      const serviceClient = createServiceRoleClient();

      await serviceClient.from('settings').upsert([
        {
          key: 'line_channel_access_token',
          value: JSON.stringify(accessToken),
          description: 'LINE Channel Access Token',
          updated_at: new Date().toISOString(),
        },
        {
          key: 'line_bot_user_id',
          value: JSON.stringify(botInfo.userId),
          description: 'LINE Bot User ID',
          updated_at: new Date().toISOString(),
        },
        {
          key: 'line_bot_basic_id',
          value: JSON.stringify(botInfo.basicId),
          description: 'LINE Bot Basic ID',
          updated_at: new Date().toISOString(),
        },
      ], {
        onConflict: 'key',
      });
    }

    return NextResponse.json({
      success: true,
      botInfo: {
        userId: botInfo.userId,
        basicId: botInfo.basicId,
        displayName: botInfo.displayName,
        pictureUrl: botInfo.pictureUrl,
        chatMode: botInfo.chatMode,
        markAsReadMode: botInfo.markAsReadMode,
      },
    });
  } catch (error) {
    console.error('[LINE Test] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get LINE access token from settings table
 */
async function getLineAccessToken(): Promise<string | null> {
  const serviceClient = createServiceRoleClient();

  const { data } = await serviceClient
    .from('settings')
    .select('value')
    .eq('key', 'line_channel_access_token')
    .single();

  if (!data?.value) {
    return null;
  }

  try {
    return JSON.parse(data.value as string);
  } catch {
    return data.value as string;
  }
}

/**
 * GET /api/line/test
 * Get current LINE bot status
 */
export async function GET() {
  try {
    const accessToken = await getLineAccessToken();

    if (!accessToken) {
      return NextResponse.json({
        configured: false,
        message: 'LINE Channel Access Token not configured. Please configure in Settings.',
      });
    }

    // Get bot info to verify connection
    const response = await fetch('https://api.line.me/v2/bot/info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        configured: true,
        connected: false,
        message: 'Token configured but connection failed',
      });
    }

    const botInfo: LineBotInfo = await response.json();

    // Get message quota (optional)
    let quota = null;
    try {
      const quotaResponse = await fetch(
        'https://api.line.me/v2/bot/message/quota',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      if (quotaResponse.ok) {
        quota = await quotaResponse.json();
      }
    } catch (e) {
      // Ignore quota errors
    }

    return NextResponse.json({
      configured: true,
      connected: true,
      botInfo: {
        displayName: botInfo.displayName,
        basicId: botInfo.basicId,
        pictureUrl: botInfo.pictureUrl,
      },
      quota,
    });
  } catch (error) {
    console.error('[LINE Test GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
