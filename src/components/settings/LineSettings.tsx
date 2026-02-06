'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Copy, Check, RefreshCw, ExternalLink } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface LineBotInfo {
  displayName: string;
  basicId: string;
  pictureUrl?: string;
}

interface LineSettingsProps {
  onSave?: () => void;
}

export function LineSettings({ onSave }: LineSettingsProps) {
  const [accessToken, setAccessToken] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [botInfo, setBotInfo] = useState<LineBotInfo | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing settings
  useEffect(() => {
    loadSettings();
    generateWebhookUrl();
  }, []);

  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/line/webhook`);
  };

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      // Check current connection status
      const response = await fetch('/api/line/test');
      if (response.ok) {
        const data = await response.json();
        if (data.connected && data.botInfo) {
          setBotInfo(data.botInfo);
        }
      }
    } catch (error) {
      console.error('Failed to load LINE settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('กรุณากรอก Channel Access Token');
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/line/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          saveToken: false,
        }),
      });

      const data = await response.json();

      if (data.success && data.botInfo) {
        setBotInfo(data.botInfo);
        toast.success(`เชื่อมต่อสำเร็จ! Bot: ${data.botInfo.displayName}`);
      } else {
        toast.error(data.error || 'ไม่สามารถเชื่อมต่อได้');
        setBotInfo(null);
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setBotInfo(null);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!accessToken.trim()) {
      toast.error('กรุณากรอก Channel Access Token');
      return;
    }

    setIsSaving(true);
    try {
      // Test and save token
      const response = await fetch('/api/line/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          saveToken: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Save channel secret if provided
        if (channelSecret.trim()) {
          const { error } = await supabase.from('settings').upsert({
            key: 'line_channel_secret',
            value: JSON.stringify(channelSecret.trim()),
            description: 'LINE Channel Secret for webhook verification',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'key',
          });

          if (error) throw error;
        }

        setBotInfo(data.botInfo);
        toast.success('บันทึกการตั้งค่า LINE สำเร็จ');
        onSave?.();
      } else {
        toast.error(data.error || 'ไม่สามารถบันทึกได้');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success('คัดลอก Webhook URL แล้ว');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('ไม่สามารถคัดลอกได้');
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
      {/* Connection Status */}
      {botInfo && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {botInfo.pictureUrl && (
                <img
                  src={botInfo.pictureUrl}
                  alt={botInfo.displayName}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium text-green-800">เชื่อมต่อแล้ว</span>
                </div>
                <p className="text-sm text-green-700">{botInfo.displayName}</p>
                <p className="text-xs text-green-600">@{botInfo.basicId}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Webhook URL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            คัดลอก URL นี้ไปตั้งค่าใน LINE Developers Console
          </p>
          <div className="flex gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-sm bg-gray-50"
            />
            <Button
              variant="outline"
              onClick={handleCopyWebhook}
              className="shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            เปิด LINE Developers Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </CardContent>
      </Card>

      {/* Channel Access Token */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Channel Access Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            ดึงค่าจาก LINE Developers Console &gt; Messaging API &gt; Channel access token
          </p>
          <Input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Enter Channel Access Token"
            className="font-mono text-sm"
          />
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !accessToken.trim()}
            className="w-full"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MessageSquare className="w-4 h-4 mr-2" />
            )}
            ทดสอบเชื่อมต่อ
          </Button>
        </CardContent>
      </Card>

      {/* Channel Secret (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Channel Secret (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            ใช้สำหรับยืนยัน Webhook signature (แนะนำเพื่อความปลอดภัย)
          </p>
          <Input
            type="password"
            value={channelSecret}
            onChange={(e) => setChannelSecret(e.target.value)}
            placeholder="Enter Channel Secret"
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSaveSettings}
        disabled={isSaving || !accessToken.trim()}
        className="w-full"
      >
        {isSaving ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : null}
        บันทึกการตั้งค่า LINE
      </Button>
    </div>
  );
}
