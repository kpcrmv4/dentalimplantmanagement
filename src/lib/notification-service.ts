import { createServiceRoleClient } from './supabase-server';
import webpush from 'web-push';
import type { UserRole } from '@/types/database';

// Configure web-push with VAPID keys
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@dentalstock.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Types
interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: string;
    referenceId?: string;
    [key: string]: unknown;
  };
}

interface SendOptions {
  userId?: string;
  userIds?: string[];
  roles?: UserRole[];
  channels?: ('push' | 'line' | 'in_app')[];
}

interface NotificationResult {
  push: { sent: number; failed: number };
  line: { sent: number; failed: number };
  inApp: { sent: number; failed: number };
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get LINE Channel Access Token from settings table
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

// =====================================================
// Core Notification Functions
// =====================================================

/**
 * Send notification through multiple channels
 */
export async function sendNotification(
  payload: NotificationPayload,
  options: SendOptions
): Promise<NotificationResult> {
  const result: NotificationResult = {
    push: { sent: 0, failed: 0 },
    line: { sent: 0, failed: 0 },
    inApp: { sent: 0, failed: 0 },
  };

  const channels = options.channels || ['push', 'line', 'in_app'];
  const serviceClient = createServiceRoleClient();

  // Get target user IDs
  let targetUserIds: string[] = [];

  if (options.userId) {
    targetUserIds = [options.userId];
  } else if (options.userIds) {
    targetUserIds = options.userIds;
  } else if (options.roles) {
    const { data: users } = await serviceClient
      .from('users')
      .select('id')
      .in('role', options.roles)
      .eq('is_active', true);
    targetUserIds = users?.map((u) => u.id) || [];
  }

  if (targetUserIds.length === 0) {
    console.warn('[NotificationService] No target users found');
    return result;
  }

  // Send through each channel
  const promises: Promise<void>[] = [];

  if (channels.includes('push')) {
    promises.push(
      sendPushNotifications(payload, targetUserIds).then((r) => {
        result.push = r;
      })
    );
  }

  if (channels.includes('line')) {
    promises.push(
      sendLineNotifications(payload, targetUserIds).then((r) => {
        result.line = r;
      })
    );
  }

  if (channels.includes('in_app')) {
    promises.push(
      sendInAppNotifications(payload, targetUserIds).then((r) => {
        result.inApp = r;
      })
    );
  }

  await Promise.all(promises);

  return result;
}

/**
 * Send push notifications to users
 */
async function sendPushNotifications(
  payload: NotificationPayload,
  userIds: string[]
): Promise<{ sent: number; failed: number }> {
  const serviceClient = createServiceRoleClient();

  // Get active push subscriptions for these users
  const { data: subscriptions } = await serviceClient
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag,
    data: payload.data,
  });

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
          pushPayload
        );
        return 'sent';
      } catch (error: unknown) {
        // Remove invalid subscriptions
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await serviceClient
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
        }
        throw error;
      }
    })
  );

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

/**
 * Send LINE notifications to users
 */
async function sendLineNotifications(
  payload: NotificationPayload,
  userIds: string[]
): Promise<{ sent: number; failed: number }> {
  const accessToken = await getLineAccessToken();
  if (!accessToken) {
    console.warn('[NotificationService] LINE access token not configured');
    return { sent: 0, failed: 0 };
  }

  const serviceClient = createServiceRoleClient();

  // Get LINE user IDs for these users
  const { data: users } = await serviceClient
    .from('users')
    .select('id, line_user_id')
    .in('id', userIds)
    .not('line_user_id', 'is', null);

  if (!users || users.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const message = `${payload.title}\n\n${payload.body}`;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: user.line_user_id,
          messages: [{ type: 'text', text: message }],
        }),
      });

      if (!response.ok) {
        throw new Error(`LINE API error: ${response.status}`);
      }

      // Log notification
      await serviceClient.from('notification_logs').insert({
        recipient_type: 'user',
        recipient_id: user.id,
        channel: 'line',
        notification_type: payload.data?.type || 'general',
        title: payload.title,
        message: payload.body,
        status: 'sent',
        sent_at: new Date().toISOString(),
        metadata: { lineUserId: user.line_user_id },
      });

      return 'sent';
    })
  );

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    failed: results.filter((r) => r.status === 'rejected').length,
  };
}

/**
 * Send in-app notifications to users
 */
async function sendInAppNotifications(
  payload: NotificationPayload,
  userIds: string[]
): Promise<{ sent: number; failed: number }> {
  const serviceClient = createServiceRoleClient();

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    title: payload.title,
    message: payload.body,
    type: 'info' as const,
    reference_type: payload.data?.type,
    reference_id: payload.data?.referenceId,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  const { error } = await serviceClient.from('notifications').insert(notifications);

  if (error) {
    console.error('[NotificationService] In-app notification error:', error);
    return { sent: 0, failed: userIds.length };
  }

  return { sent: userIds.length, failed: 0 };
}

// =====================================================
// Trigger Functions
// =====================================================

/**
 * Notify dentist when a case is assigned to them
 */
export async function notifyCaseAssigned(
  caseId: string,
  dentistId: string,
  caseNumber: string,
  patientName: string,
  surgeryDate: string
): Promise<NotificationResult> {
  return sendNotification(
    {
      title: 'เคสใหม่ถูกมอบหมาย',
      body: `เคส ${caseNumber} - ${patientName}\nวันผ่าตัด: ${formatDate(surgeryDate)}`,
      tag: `case-assigned-${caseId}`,
      data: {
        url: `/cases/${caseId}`,
        type: 'case_assigned',
        referenceId: caseId,
      },
    },
    {
      userId: dentistId,
      channels: ['push', 'line', 'in_app'],
    }
  );
}

/**
 * Notify stock staff when a reservation is out of stock
 */
export async function notifyOutOfStock(
  reservationId: string,
  caseNumber: string,
  productName: string,
  quantity: number,
  surgeryDate: string
): Promise<NotificationResult> {
  return sendNotification(
    {
      title: 'วัสดุไม่มีในสต็อก',
      body: `เคส ${caseNumber} ต้องการ ${productName} x${quantity}\nวันผ่าตัด: ${formatDate(surgeryDate)}`,
      tag: `out-of-stock-${reservationId}`,
      data: {
        url: '/stock/pending-requests',
        type: 'out_of_stock',
        referenceId: reservationId,
      },
    },
    {
      roles: ['stock_staff', 'admin'],
      channels: ['push', 'line', 'in_app'],
    }
  );
}

/**
 * Notify supplier when a purchase order is created
 */
export async function notifySupplierPO(
  orderId: string,
  poNumber: string,
  supplierId: string,
  totalAmount: number
): Promise<NotificationResult> {
  const serviceClient = createServiceRoleClient();

  // Get supplier's LINE user ID
  const { data: supplier } = await serviceClient
    .from('suppliers')
    .select('id, name, line_user_id')
    .eq('id', supplierId)
    .single();

  if (!supplier?.line_user_id) {
    console.warn(`[NotificationService] Supplier ${supplierId} has no LINE user ID`);
    return { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } };
  }

  const accessToken = await getLineAccessToken();
  if (!accessToken) {
    console.warn('[NotificationService] LINE access token not configured');
    return { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } };
  }

  const message = `📦 ใบสั่งซื้อใหม่\n\nเลขที่: ${poNumber}\nมูลค่ารวม: ฿${totalAmount.toLocaleString()}\n\nกรุณาตรวจสอบและยืนยันการสั่งซื้อ`;

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: supplier.line_user_id,
        messages: [{ type: 'text', text: message }],
      }),
    });

    const success = response.ok;

    // Log notification
    await serviceClient.from('notification_logs').insert({
      recipient_type: 'supplier',
      recipient_id: supplierId,
      channel: 'line',
      notification_type: 'purchase_order',
      title: 'ใบสั่งซื้อใหม่',
      message: `PO: ${poNumber}`,
      status: success ? 'sent' : 'failed',
      sent_at: success ? new Date().toISOString() : null,
      error_message: success ? null : `LINE API error: ${response.status}`,
      metadata: { poNumber, orderId },
    });

    return {
      push: { sent: 0, failed: 0 },
      line: { sent: success ? 1 : 0, failed: success ? 0 : 1 },
      inApp: { sent: 0, failed: 0 },
    };
  } catch (error) {
    console.error('[NotificationService] Supplier LINE notification error:', error);
    return { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 1 }, inApp: { sent: 0, failed: 0 } };
  }
}

/**
 * Notify about urgent cases (48h or less)
 */
export async function notifyUrgentCase(
  caseId: string,
  caseNumber: string,
  patientName: string,
  surgeryDate: string,
  hoursUntilSurgery: number,
  unpreparedCount: number
): Promise<NotificationResult> {
  const urgencyText = hoursUntilSurgery <= 24 ? '⚠️ ด่วนมาก!' : '⚡ เคสด่วน';

  return sendNotification(
    {
      title: `${urgencyText} ${caseNumber}`,
      body: `${patientName}\nผ่าตัดใน ${hoursUntilSurgery} ชม.\nวัสดุยังไม่เตรียม: ${unpreparedCount} รายการ`,
      tag: `urgent-case-${caseId}`,
      data: {
        url: `/cases/${caseId}`,
        type: 'urgent_case',
        referenceId: caseId,
      },
    },
    {
      roles: ['stock_staff', 'admin'],
      channels: ['push', 'in_app'],
    }
  );
}

/**
 * Send daily scheduled notification
 */
export async function sendDailyNotification(
  type: 'morning' | 'evening'
): Promise<{ stock: NotificationResult; cs: NotificationResult; dentist: NotificationResult }> {
  const serviceClient = createServiceRoleClient();

  // Check if scheduled notifications are enabled
  const { data: settingsData } = await serviceClient
    .from('settings')
    .select('key, value')
    .in('key', ['scheduled_notification_enabled', 'notify_stock_daily', 'notify_cs_daily', 'notify_dentist_daily']);

  const settings: Record<string, boolean> = {};
  settingsData?.forEach((s) => {
    try {
      settings[s.key] = JSON.parse(s.value as string);
    } catch {
      settings[s.key] = true;
    }
  });

  if (settings['scheduled_notification_enabled'] === false) {
    return {
      stock: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } },
      cs: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } },
      dentist: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } },
    };
  }

  const targetDate = type === 'morning' ? 'today' : 'tomorrow';
  const dateStr = type === 'morning'
    ? new Date().toISOString().split('T')[0]
    : new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Get case counts
  const { count: caseCount } = await serviceClient
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('surgery_date', dateStr)
    .not('status', 'in', '("completed","cancelled")');

  // Get unprepared reservations
  const { count: unpreparedCount } = await serviceClient
    .from('case_reservations')
    .select('*, cases!inner(*)', { count: 'exact', head: true })
    .eq('cases.surgery_date', dateStr)
    .eq('status', 'pending');

  const results = {
    stock: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } } as NotificationResult,
    cs: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } } as NotificationResult,
    dentist: { push: { sent: 0, failed: 0 }, line: { sent: 0, failed: 0 }, inApp: { sent: 0, failed: 0 } } as NotificationResult,
  };

  // Stock staff notification
  if (settings['notify_stock_daily'] !== false) {
    results.stock = await sendNotification(
      {
        title: type === 'morning' ? '📋 สรุปงานวันนี้' : '📋 สรุปงานพรุ่งนี้',
        body: `เคส${targetDate === 'today' ? 'วันนี้' : 'พรุ่งนี้'}: ${caseCount || 0} เคส\nวัสดุยังไม่เตรียม: ${unpreparedCount || 0} รายการ`,
        tag: `daily-stock-${type}-${dateStr}`,
        data: { url: '/stock/preparation', type: 'daily_summary' },
      },
      { roles: ['stock_staff'], channels: ['push', 'line'] }
    );
  }

  // CS notification
  if (settings['notify_cs_daily'] !== false) {
    const readyText = unpreparedCount === 0 ? '✅ วัสดุพร้อมทุกเคส' : `⚠️ รอเตรียมวัสดุ ${unpreparedCount} รายการ`;
    results.cs = await sendNotification(
      {
        title: type === 'morning' ? '📋 เคสวันนี้' : '📋 เคสพรุ่งนี้',
        body: `จำนวนเคส: ${caseCount || 0}\n${readyText}`,
        tag: `daily-cs-${type}-${dateStr}`,
        data: { url: '/cases', type: 'daily_summary' },
      },
      { roles: ['cs'], channels: ['push', 'line'] }
    );
  }

  // Dentist notification (per dentist with their own cases)
  if (settings['notify_dentist_daily'] !== false) {
    const { data: dentistCases } = await serviceClient
      .from('cases')
      .select('dentist_id, patient:patients(first_name, last_name)')
      .eq('surgery_date', dateStr)
      .not('status', 'in', '("completed","cancelled")');

    // Group by dentist
    const dentistMap = new Map<string, string[]>();
    dentistCases?.forEach((c) => {
      const existing = dentistMap.get(c.dentist_id) || [];
      const patientName = c.patient ? `${(c.patient as { first_name: string }).first_name} ${(c.patient as { last_name: string }).last_name}` : 'Unknown';
      existing.push(patientName);
      dentistMap.set(c.dentist_id, existing);
    });

    for (const [dentistId, patients] of dentistMap) {
      const r = await sendNotification(
        {
          title: type === 'morning' ? `📋 เคสของคุณวันนี้ (${patients.length})` : `📋 เคสของคุณพรุ่งนี้ (${patients.length})`,
          body: patients.slice(0, 3).join(', ') + (patients.length > 3 ? ` และอีก ${patients.length - 3} คน` : ''),
          tag: `daily-dentist-${type}-${dateStr}-${dentistId}`,
          data: { url: '/dentist/cases', type: 'daily_summary' },
        },
        { userId: dentistId, channels: ['push', 'line'] }
      );
      results.dentist.push.sent += r.push.sent;
      results.dentist.push.failed += r.push.failed;
      results.dentist.line.sent += r.line.sent;
      results.dentist.line.failed += r.line.failed;
    }
  }

  return results;
}

/**
 * Notify low stock alert
 */
export async function notifyLowStock(
  productId: string,
  productName: string,
  currentStock: number,
  minStock: number
): Promise<NotificationResult> {
  return sendNotification(
    {
      title: '⚠️ สต็อกต่ำ',
      body: `${productName}\nคงเหลือ: ${currentStock} / ขั้นต่ำ: ${minStock}`,
      tag: `low-stock-${productId}`,
      data: {
        url: `/products/${productId}`,
        type: 'low_stock',
        referenceId: productId,
      },
    },
    {
      roles: ['stock_staff', 'admin'],
      channels: ['push', 'in_app'],
    }
  );
}

/**
 * Notify material prepared
 */
export async function notifyMaterialPrepared(
  caseId: string,
  caseNumber: string,
  dentistId: string
): Promise<NotificationResult> {
  return sendNotification(
    {
      title: '✅ วัสดุเตรียมพร้อมแล้ว',
      body: `เคส ${caseNumber} วัสดุทั้งหมดเตรียมพร้อมแล้ว`,
      tag: `material-ready-${caseId}`,
      data: {
        url: `/cases/${caseId}`,
        type: 'material_ready',
        referenceId: caseId,
      },
    },
    {
      userId: dentistId,
      channels: ['push', 'in_app'],
    }
  );
}

// =====================================================
// Utility Functions
// =====================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
