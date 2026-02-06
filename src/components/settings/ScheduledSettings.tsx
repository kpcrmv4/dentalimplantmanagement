'use client';

import { useState, useEffect } from 'react';
import { Clock, Bell, Users, Package, Stethoscope, RefreshCw } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface ScheduledSettingsProps {
  onSave?: () => void;
}

interface NotificationSettings {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
  notifyStock: boolean;
  notifyCs: boolean;
  notifyDentist: boolean;
}

export function ScheduledSettings({ onSave }: ScheduledSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    morningTime: '08:00',
    eveningTime: '17:00',
    notifyStock: true,
    notifyCs: true,
    notifyDentist: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'scheduled_notification_enabled',
          'morning_notification_time',
          'evening_notification_time',
          'notify_stock_daily',
          'notify_cs_daily',
          'notify_dentist_daily',
        ]);

      if (error) throw error;

      if (data) {
        const settingsMap: Record<string, unknown> = {};
        data.forEach((item) => {
          try {
            settingsMap[item.key] = JSON.parse(item.value as string);
          } catch {
            settingsMap[item.key] = item.value;
          }
        });

        setSettings({
          enabled: settingsMap['scheduled_notification_enabled'] !== false,
          morningTime: (settingsMap['morning_notification_time'] as string) || '08:00',
          eveningTime: (settingsMap['evening_notification_time'] as string) || '17:00',
          notifyStock: settingsMap['notify_stock_daily'] !== false,
          notifyCs: settingsMap['notify_cs_daily'] !== false,
          notifyDentist: settingsMap['notify_dentist_daily'] !== false,
        });
      }
    } catch (error) {
      console.error('Failed to load scheduled settings:', error);
      toast.error('ไม่สามารถโหลดการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = [
        {
          key: 'scheduled_notification_enabled',
          value: JSON.stringify(settings.enabled),
          description: 'เปิด/ปิดการแจ้งเตือนตามเวลา',
        },
        {
          key: 'morning_notification_time',
          value: JSON.stringify(settings.morningTime),
          description: 'เวลาแจ้งเตือนตอนเช้า (งานประจำวัน)',
        },
        {
          key: 'evening_notification_time',
          value: JSON.stringify(settings.eveningTime),
          description: 'เวลาแจ้งเตือนตอนเย็น (งานวันพรุ่งนี้)',
        },
        {
          key: 'notify_stock_daily',
          value: JSON.stringify(settings.notifyStock),
          description: 'แจ้งเตือนสต็อกประจำวัน',
        },
        {
          key: 'notify_cs_daily',
          value: JSON.stringify(settings.notifyCs),
          description: 'แจ้งเตือน CS ประจำวัน',
        },
        {
          key: 'notify_dentist_daily',
          value: JSON.stringify(settings.notifyDentist),
          description: 'แจ้งเตือนทันตแพทย์ประจำวัน',
        },
      ];

      const { error } = await supabase.from('settings').upsert(
        updates.map((item) => ({
          ...item,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'key' }
      );

      if (error) throw error;

      toast.success('บันทึกการตั้งค่าแจ้งเตือนสำเร็จ');
      onSave?.();
    } catch (error) {
      console.error('Failed to save scheduled settings:', error);
      toast.error('ไม่สามารถบันทึกการตั้งค่าได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardContent className="p-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.enabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                <Bell className={`w-5 h-5 ${settings.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium">เปิดการแจ้งเตือนประจำวัน</p>
                <p className="text-sm text-gray-500">
                  แจ้งเตือนสรุปงานประจำวันและล่วงหน้า
                </p>
              </div>
            </div>
            <div
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Time Settings */}
      <Card className={!settings.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            ตั้งเวลาแจ้งเตือน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                แจ้งเตือนตอนเช้า (งานวันนี้)
              </label>
              <Input
                type="time"
                value={settings.morningTime}
                onChange={(e) => setSettings((s) => ({ ...s, morningTime: e.target.value }))}
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                สรุปเคสและวัสดุที่ต้องเตรียมวันนี้
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                แจ้งเตือนตอนเย็น (งานพรุ่งนี้)
              </label>
              <Input
                type="time"
                value={settings.eveningTime}
                onChange={(e) => setSettings((s) => ({ ...s, eveningTime: e.target.value }))}
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                สรุปเคสและวัสดุที่ต้องเตรียมวันพรุ่งนี้
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role-based Notifications */}
      <Card className={!settings.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            แจ้งเตือนแยกตามกลุ่ม
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stock Staff */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">ฝ่ายสต็อก</p>
                <p className="text-sm text-gray-500">
                  จำนวนเคสวันนี้, วัสดุที่ยังไม่ได้เตรียม
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyStock}
              onChange={(e) => setSettings((s) => ({ ...s, notifyStock: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* CS */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">CS (Customer Service)</p>
                <p className="text-sm text-gray-500">
                  รายการเคสวันนี้, สถานะวัสดุพร้อม/ไม่พร้อม
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyCs}
              onChange={(e) => setSettings((s) => ({ ...s, notifyCs: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>

          {/* Dentist */}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Stethoscope className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">ทันตแพทย์</p>
                <p className="text-sm text-gray-500">
                  จำนวนเคสของตัวเอง, รายชื่อผู้ป่วย
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyDentist}
              onChange={(e) => setSettings((s) => ({ ...s, notifyDentist: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
          </label>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
        บันทึกการตั้งค่า
      </Button>
    </div>
  );
}
