'use client';

import { useState } from 'react';
import { Bell, BellOff, Smartphone, RefreshCw, Send } from 'lucide-react';
import { Button, Card, CardContent } from '@/components/ui';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import toast from 'react-hot-toast';

interface PushSettingsProps {
  userId: string | null;
}

export function PushSettings({ userId }: PushSettingsProps) {
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications(userId);

  const [isTesting, setIsTesting] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.success('ปิดการแจ้งเตือนแล้ว');
      } else {
        toast.error('ไม่สามารถปิดการแจ้งเตือนได้');
      }
    } else {
      const success = await subscribe();
      if (success) {
        toast.success('เปิดการแจ้งเตือนแล้ว');
      } else if (permission === 'denied') {
        toast.error('กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์');
      } else {
        toast.error(error || 'ไม่สามารถเปิดการแจ้งเตือนได้');
      }
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        toast.success('ส่งการแจ้งเตือนทดสอบแล้ว');
      } else {
        toast.error('ไม่สามารถส่งการแจ้งเตือนได้');
      }
    } finally {
      setIsTesting(false);
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
            <BellOff className="w-4 h-4 text-yellow-600" />
          </div>
          <div>
            <h3 className="font-semibold text-yellow-800 text-sm">Push Notification</h3>
            <p className="text-xs text-yellow-500">เบราว์เซอร์ไม่รองรับ</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-yellow-700">
            กรุณาใช้เบราว์เซอร์ Chrome, Firefox, หรือ Edge เวอร์ชันล่าสุด
          </p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <div className="rounded-2xl border border-red-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <BellOff className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-red-800 text-sm">Push Notification</h3>
            <p className="text-xs text-red-400">การแจ้งเตือนถูกบล็อก</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-red-700">
            กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
          <Bell className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h3 className="font-semibold text-orange-800 text-sm">Push Notification</h3>
          <p className="text-xs text-orange-400">แจ้งเตือนผ่านเบราว์เซอร์และแอป</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Toggle */}
        <label className="flex items-center justify-between p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isSubscribed ? (
                <Bell className="w-4 h-4 text-green-600" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isSubscribed ? 'การแจ้งเตือนเปิดอยู่' : 'การแจ้งเตือนปิดอยู่'}
              </p>
              <p className="text-xs text-gray-500">
                {isSubscribed
                  ? 'คุณจะได้รับการแจ้งเตือนเมื่อมีเหตุการณ์สำคัญ'
                  : 'คลิกเพื่อเปิดรับการแจ้งเตือน'}
              </p>
            </div>
          </div>
          <Button
            variant={isSubscribed ? 'outline' : 'primary'}
            size="sm"
            onClick={handleToggle}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSubscribed ? (
              'ปิด'
            ) : (
              'เปิด'
            )}
          </Button>
        </label>

        {/* Test Button */}
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
            className="w-full"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            ส่งการแจ้งเตือนทดสอบ
          </Button>
        )}

        {/* Info */}
        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
          <p className="text-xs font-medium text-gray-700">การแจ้งเตือนที่จะได้รับ:</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-orange-400 rounded-full flex-shrink-0" />
              เคสด่วนภายใน 48 ชั่วโมง
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-orange-400 rounded-full flex-shrink-0" />
              วัสดุไม่มีในสต็อก
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-orange-400 rounded-full flex-shrink-0" />
              วัสดุใกล้หมด
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1 h-1 bg-orange-400 rounded-full flex-shrink-0" />
              แจ้งเตือนประจำวันตามที่ตั้งค่า
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
