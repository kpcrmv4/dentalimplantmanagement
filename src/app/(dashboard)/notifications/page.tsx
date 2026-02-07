'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  AlertTriangle,
  Package,
  Calendar,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { useUrgentCases48h, usePendingStockRequests, useLowStockItems } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatThaiDate, formatThaiDateTime } from '@/lib/utils';
import Link from 'next/link';

type NotificationType = 'all' | 'urgent' | 'stock' | 'case' | 'system';

interface NotificationItem {
  id: string;
  type: 'urgent_case' | 'low_stock' | 'out_of_stock' | 'case_update' | 'system';
  title: string;
  message: string;
  link?: string;
  created_at: string;
  is_read: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<NotificationType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const userRole = user?.role;

  // Determine which data to fetch based on role
  // stock_staff & admin: see all notification types
  // dentist: only urgent cases (filtered to own cases)
  // assistant/cs: only urgent cases
  const canSeeStockNotifications = userRole === 'admin' || userRole === 'stock_staff';

  // Fetch data from various sources
  const { data: urgentCases, mutate: mutateUrgent } = useUrgentCases48h();
  const { data: outOfStockRequests, mutate: mutateOutOfStock } = usePendingStockRequests();
  const { data: lowStockItems, mutate: mutateLowStock } = useLowStockItems();

  // Combine all notifications (filtered by role)
  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // Add urgent cases as notifications
    // dentist: only their own cases; others: all urgent cases
    if (urgentCases) {
      const filteredCases = userRole === 'dentist'
        ? urgentCases.filter((c) => c.dentist_id === user?.id)
        : urgentCases;

      filteredCases.forEach((c) => {
        items.push({
          id: `urgent-${c.id}`,
          type: 'urgent_case',
          title: 'เคสด่วน! ต้องเตรียมภายใน 48 ชม.',
          message: `เคส ${c.case_number} - ${c.patient_name || 'ไม่ระบุผู้ป่วย'} วันผ่าตัด: ${formatThaiDate(new Date(c.surgery_date))}`,
          link: `/cases/${c.id}`,
          created_at: c.surgery_date,
          is_read: false,
          priority: 'high',
        });
      });
    }

    // Add out of stock requests as notifications (stock_staff & admin only)
    if (canSeeStockNotifications && outOfStockRequests) {
      outOfStockRequests.forEach((r) => {
        items.push({
          id: `outofstock-${r.reservation_id}`,
          type: 'out_of_stock',
          title: 'คำขอวัสดุที่ไม่มีในสต็อก',
          message: `${r.product_name || 'สินค้า'} - จำนวน ${r.quantity} ชิ้น สำหรับเคส ${r.case_number || ''}`,
          link: `/inventory`,
          created_at: r.requested_at,
          is_read: false,
          priority: 'high',
        });
      });
    }

    // Add low stock items as notifications (stock_staff & admin only)
    if (canSeeStockNotifications && lowStockItems) {
      lowStockItems.forEach((item) => {
        items.push({
          id: `lowstock-${item.product_id}`,
          type: 'low_stock',
          title: 'วัสดุใกล้หมด',
          message: `${item.product_name || 'สินค้า'} ${item.sku ? `(${item.sku})` : ''} - เหลือ ${item.current_stock} ชิ้น (ต่ำกว่าขั้นต่ำ ${item.min_stock_level})`,
          link: `/inventory`,
          created_at: new Date().toISOString(),
          is_read: false,
          priority: 'medium',
        });
      });
    }

    // Sort by priority and date
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [urgentCases, outOfStockRequests, lowStockItems, userRole, user?.id, canSeeStockNotifications]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'urgent') return notifications.filter(n => n.type === 'urgent_case');
    if (filter === 'stock') return notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock');
    if (filter === 'case') return notifications.filter(n => n.type === 'case_update');
    if (filter === 'system') return notifications.filter(n => n.type === 'system');
    return notifications;
  }, [notifications, filter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      mutateUrgent(),
      mutateOutOfStock(),
      mutateLowStock(),
    ]);
    setIsRefreshing(false);
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'urgent_case':
        return <Clock className="w-5 h-5 text-red-500" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-yellow-500" />;
      case 'out_of_stock':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'case_update':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-gray-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
            ด่วน
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
            สำคัญ
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            ทั่วไป
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="การแจ้งเตือน"
        subtitle={`${notifications.length} รายการ`}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            ทั้งหมด ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('urgent')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'urgent'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-1" />
            เคสด่วน ({notifications.filter(n => n.type === 'urgent_case').length})
          </button>
          {canSeeStockNotifications && (
            <button
              onClick={() => setFilter('stock')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'stock'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1" />
              สต็อก ({notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock').length})
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่มีการแจ้งเตือน
              </h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'ยังไม่มีการแจ้งเตือนใหม่ในขณะนี้'
                  : 'ไม่มีการแจ้งเตือนในหมวดหมู่นี้'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredNotifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.link || '#'}
                    className={`block p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-sm font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          {getPriorityBadge(notification.priority)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatThaiDateTime(new Date(notification.created_at))}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="flex-shrink-0">
                          <span className="w-2 h-2 bg-indigo-600 rounded-full inline-block"></span>
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Summary Cards */}
        <div className={`mt-6 grid grid-cols-1 ${canSeeStockNotifications ? 'sm:grid-cols-3' : 'sm:grid-cols-1'} gap-4`}>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">เคสด่วน 48 ชม.</p>
                <p className="text-2xl font-bold text-red-700">
                  {userRole === 'dentist'
                    ? (urgentCases?.filter((c) => c.dentist_id === user?.id).length || 0)
                    : (urgentCases?.length || 0)}
                </p>
              </div>
            </div>
          </div>

          {canSeeStockNotifications && (
            <>
              <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Package className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">วัสดุใกล้หมด</p>
                    <p className="text-2xl font-bold text-yellow-700">{lowStockItems?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 font-medium">รอสั่งซื้อ</p>
                    <p className="text-2xl font-bold text-orange-700">{outOfStockRequests?.length || 0}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
