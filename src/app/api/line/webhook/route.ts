import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface LineEvent {
  type: string;
  timestamp: number;
  source: {
    type: string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}

interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

/**
 * POST /api/line/webhook
 * Receive webhook events from LINE Messaging API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    // Get channel secret from settings or env
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      console.error('[LINE Webhook] Channel secret not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Verify signature
    const hash = crypto
      .createHmac('SHA256', channelSecret)
      .update(body)
      .digest('base64');

    if (signature !== hash) {
      console.error('[LINE Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookBody: LineWebhookBody = JSON.parse(body);
    const serviceClient = createServiceRoleClient();

    // Process events
    for (const event of webhookBody.events) {
      console.log('[LINE Webhook] Event:', event.type, event.source?.userId);

      switch (event.type) {
        case 'follow':
          // User added the bot
          if (event.source?.userId) {
            // Store in pending connections for manual linking
            await serviceClient.from('settings').upsert({
              key: `pending_line_${event.source.userId}`,
              value: JSON.stringify({
                lineUserId: event.source.userId,
                timestamp: new Date().toISOString(),
                event: 'follow',
              }),
              description: 'Pending LINE user connection',
            }, {
              onConflict: 'key',
            });

            // Log the event
            await serviceClient.from('notification_logs').insert({
              recipient_type: 'system',
              channel: 'line',
              notification_type: 'follow',
              title: 'LINE Follow',
              message: `New LINE user followed: ${event.source.userId}`,
              status: 'delivered',
              metadata: {
                lineUserId: event.source.userId,
                timestamp: event.timestamp,
              },
            });
          }
          break;

        case 'unfollow':
          // User blocked/unfollowed the bot
          if (event.source?.userId) {
            // Clear pending connection
            await serviceClient
              .from('settings')
              .delete()
              .eq('key', `pending_line_${event.source.userId}`);

            // Mark any linked users' LINE ID as inactive (but don't delete)
            // Note: We don't automatically remove line_user_id from users
            // as the admin should decide what to do

            // Log the event
            await serviceClient.from('notification_logs').insert({
              recipient_type: 'system',
              channel: 'line',
              notification_type: 'unfollow',
              title: 'LINE Unfollow',
              message: `LINE user unfollowed: ${event.source.userId}`,
              status: 'delivered',
              metadata: {
                lineUserId: event.source.userId,
                timestamp: event.timestamp,
              },
            });
          }
          break;

        case 'message':
          // User sent a message
          if (event.message?.type === 'text' && event.source?.userId) {
            const messageText = event.message.text?.trim() || '';

            // Check if message matches a LINE linking code: LINK-XXXXXX
            if (/^LINK-[A-F0-9]{6}$/i.test(messageText)) {
              const code = messageText.toUpperCase();
              const { data: linkSetting } = await serviceClient
                .from('settings')
                .select('*')
                .eq('key', `line_link_code_${code}`)
                .single();

              if (linkSetting) {
                try {
                  const linkData = JSON.parse(linkSetting.value as string);

                  // Check if expired
                  if (new Date(linkData.expiresAt) < new Date()) {
                    // Clean up expired token
                    await serviceClient.from('settings').delete().eq('key', `line_link_code_${code}`);
                    await serviceClient.from('settings').delete().eq('key', `line_link_user_${linkData.userId}`);

                    if (event.replyToken) {
                      await replyToUser(event.replyToken, [{
                        type: 'text',
                        text: 'รหัสเชื่อมต่อหมดอายุแล้ว กรุณาสร้างรหัสใหม่ในหน้าโปรไฟล์',
                      }]);
                    }
                    break;
                  }

                  // Link the user's LINE account
                  await serviceClient
                    .from('users')
                    .update({
                      line_user_id: event.source.userId,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', linkData.userId);

                  // Clean up tokens
                  await serviceClient.from('settings').delete().eq('key', `line_link_code_${code}`);
                  await serviceClient.from('settings').delete().eq('key', `line_link_user_${linkData.userId}`);

                  // Log the linking event
                  await serviceClient.from('notification_logs').insert({
                    recipient_type: 'user',
                    recipient_id: linkData.userId,
                    channel: 'line',
                    notification_type: 'line_linked',
                    title: 'LINE Account Linked',
                    message: `LINE user ${event.source.userId} linked to user ${linkData.userId}`,
                    status: 'delivered',
                    metadata: {
                      lineUserId: event.source.userId,
                      linkCode: code,
                    },
                  });

                  if (event.replyToken) {
                    await replyToUser(event.replyToken, [{
                      type: 'text',
                      text: 'เชื่อมต่อ LINE กับบัญชี DentalStock สำเร็จแล้ว! คุณจะได้รับการแจ้งเตือนผ่าน LINE',
                    }]);
                  }
                  break;
                } catch (e) {
                  console.error('[LINE Webhook] Link code processing error:', e);
                }
              } else {
                // Code not found
                if (event.replyToken) {
                  await replyToUser(event.replyToken, [{
                    type: 'text',
                    text: 'รหัสเชื่อมต่อไม่ถูกต้อง กรุณาตรวจสอบรหัสอีกครั้ง',
                  }]);
                }
                break;
              }
            }

            // Log the message (for debugging/support)
            await serviceClient.from('notification_logs').insert({
              recipient_type: 'system',
              channel: 'line',
              notification_type: 'message_received',
              title: 'LINE Message Received',
              message: event.message.text?.substring(0, 500) || '[No text]',
              status: 'delivered',
              metadata: {
                lineUserId: event.source.userId,
                messageId: event.message.id,
                timestamp: event.timestamp,
              },
            });

            // Auto-reply with help message
            if (event.replyToken) {
              await replyToUser(event.replyToken, [
                {
                  type: 'text',
                  text: 'ขอบคุณสำหรับข้อความ นี่คือระบบแจ้งเตือนอัตโนมัติของ DentalStock หากต้องการความช่วยเหลือ กรุณาติดต่อผู้ดูแลระบบ',
                },
              ]);
            }
          }
          break;

        default:
          console.log('[LINE Webhook] Unhandled event type:', event.type);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LINE Webhook] Error:', error);
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 });
  }
}

// Helper function to reply to user
async function replyToUser(replyToken: string, messages: unknown[]) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) return;

  try {
    await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });
  } catch (error) {
    console.error('[LINE Webhook] Reply failed:', error);
  }
}

// GET endpoint to return webhook URL info
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'your-domain.com';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const webhookUrl = `${protocol}://${host}/api/line/webhook`;

  return NextResponse.json({
    webhookUrl,
    instructions: 'Configure this URL in LINE Developers Console under Messaging API > Webhook settings',
  });
}
