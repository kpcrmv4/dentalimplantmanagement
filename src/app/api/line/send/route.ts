import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface SendLineData {
  lineUserId: string;
  message: string | LineFlexMessage;
  type?: 'text' | 'flex';
  altText?: string;
}

interface LineFlexMessage {
  type: 'bubble' | 'carousel';
  // Flex message structure
  [key: string]: unknown;
}

interface LineTextMessage {
  type: 'text';
  text: string;
}

interface LineFlexWrapper {
  type: 'flex';
  altText: string;
  contents: LineFlexMessage;
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
 * POST /api/line/send
 * Send a message to a LINE user
 */
export async function POST(request: NextRequest) {
  try {
    const accessToken = await getLineAccessToken();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'LINE Channel Access Token not configured. Please configure in Settings.' },
        { status: 500 }
      );
    }

    const body: SendLineData = await request.json();
    const { lineUserId, message, type = 'text', altText = 'แจ้งเตือนจาก DentalStock' } = body;

    if (!lineUserId || !message) {
      return NextResponse.json(
        { error: 'Missing lineUserId or message' },
        { status: 400 }
      );
    }

    // Prepare message object
    let messageObject: LineTextMessage | LineFlexWrapper;

    if (type === 'flex' && typeof message === 'object') {
      messageObject = {
        type: 'flex',
        altText,
        contents: message as LineFlexMessage,
      };
    } else {
      messageObject = {
        type: 'text',
        text: typeof message === 'string' ? message : JSON.stringify(message),
      };
    }

    // Send push message via LINE API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [messageObject],
      }),
    });

    const serviceClient = createServiceRoleClient();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[LINE Send] API error:', response.status, errorData);

      // Log failed notification
      await serviceClient.from('notification_logs').insert({
        recipient_type: 'user',
        channel: 'line',
        notification_type: 'message',
        title: 'LINE Message',
        message: typeof message === 'string' ? message.substring(0, 500) : altText,
        status: 'failed',
        error_message: `LINE API error: ${response.status}`,
        metadata: {
          lineUserId,
          errorData,
        },
      });

      return NextResponse.json(
        { error: `LINE API error: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    // Log successful notification
    await serviceClient.from('notification_logs').insert({
      recipient_type: 'user',
      channel: 'line',
      notification_type: 'message',
      title: 'LINE Message',
      message: typeof message === 'string' ? message.substring(0, 500) : altText,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: {
        lineUserId,
        messageType: type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LINE Send] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Send LINE message to multiple users
 */
export async function sendLineToMultiple(
  lineUserIds: string[],
  message: string,
  accessToken?: string
): Promise<{ sent: number; failed: number }> {
  let token = accessToken;

  if (!token) {
    token = await getLineAccessToken() || undefined;
  }

  if (!token) {
    throw new Error('LINE Channel Access Token not configured. Please configure in Settings.');
  }

  const results = await Promise.allSettled(
    lineUserIds.map((lineUserId) =>
      fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: 'text', text: message }],
        }),
      }).then((res) => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res;
      })
    )
  );

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}
