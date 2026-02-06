'use client';

import { useState } from 'react';
import { Bell, BellOff, Smartphone, RefreshCw, Send } from 'lucide-react';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
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
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <BellOff className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-yellow-800">
                เบราว์เซอร์ไม่รองรับ Push Notification
              </p>
              <p className="text-sm text-yellow-700">
                กรุณาใช้เบราว์เซอร์ Chrome, Firefox, หรือ Edge เวอร์ชันล่าสุด
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Permission denied
  if (permission === 'denied') {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <BellOff className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-800">
                การแจ้งเตือนถูกบล็อก
              </p>
              <p className="text-sm text-red-700">
                กรุณาอนุญาตการแจ้งเตือนในการตั้งค่าเบราว์เซอร์
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            รับการแจ้งเตือนแบบ push ผ่านเบราว์เซอร์หรืออุปกรณ์ที่ติดตั้งแอป
          </p>

          {/* Toggle */}
          <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-green-100' : 'bg-gray-100'}`}>
                {isSubscribed ? (
                  <Bell className="w-5 h-5 text-green-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {isSubscribed ? 'การแจ้งเตือนเปิดอยู่' : 'การแจ้งเตือนปิดอยู่'}
                </p>
                <p className="text-sm text-gray-500">
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
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">
            การแจ้งเตือนที่จะได้รับ
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• เคสด่วนภายใน 48 ชั่วโมง</li>
            <li>• วัสดุไม่มีในสต็อก</li>
            <li>• วัสดุใกล้หมด</li>
            <li>• แจ้งเตือนประจำวันตามที่ตั้งค่า</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
