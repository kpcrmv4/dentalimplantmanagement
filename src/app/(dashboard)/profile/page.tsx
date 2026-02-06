'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Key,
  MessageSquare,
  Save,
  RefreshCw,
  Check,
  Link2,
  Link2Off,
  Copy,
  ArrowLeft,
  Download,
  Smartphone,
  Monitor,
  Share,
  MoreVertical,
  PlusSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  ConfirmModal,
} from '@/components/ui';
import { PushSettings } from '@/components/settings/PushSettings';
import { useAuthStore } from '@/stores/authStore';
import { getRoleText } from '@/lib/utils';
import type { User as UserType } from '@/types/database';
import toast from 'react-hot-toast';

// --- Section 1: Personal Info ---
function PersonalInfoSection({ user, setUser }: { user: UserType; setUser: (u: UserType) => void }) {
  const [fullName, setFullName] = useState(user.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.full_name) {
      setFullName(user.full_name);
    }
  }, [user.full_name]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('กรุณากรอกชื่อ');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');

      setUser({ ...user, full_name: fullName.trim() });
      toast.success('บันทึกชื่อเรียบร้อย');
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          ข้อมูลส่วนตัว
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input label="ชื่อ-นามสกุล" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="อีเมล" value={user.email || ''} disabled helperText="ไม่สามารถเปลี่ยนอีเมลได้" />
        <Input label="บทบาท" value={getRoleText(user.role)} disabled />
        <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save className="w-4 h-4" />}>
          บันทึก
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Section 2: Change Password ---
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('กรุณากรอกรหัสผ่านให้ครบ');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    setIsChanging(true);
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');

      toast.success('เปลี่ยนรหัสผ่านเรียบร้อย');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          เปลี่ยนรหัสผ่าน
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input label="รหัสผ่านปัจจุบัน" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        <Input label="รหัสผ่านใหม่" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="ขั้นต่ำ 6 ตัวอักษร" />
        <Input
          label="ยืนยันรหัสผ่านใหม่"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPassword && newPassword !== confirmPassword ? 'รหัสผ่านไม่ตรงกัน' : ''}
        />
        <Button
          onClick={handleChange}
          isLoading={isChanging}
          disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
          leftIcon={<Key className="w-4 h-4" />}
        >
          เปลี่ยนรหัสผ่าน
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Section 3: LINE Connection ---
function LineConnectionSection({ user, setUser }: { user: UserType; setUser: (u: UserType) => void }) {
  const [lineConnected, setLineConnected] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);

  useEffect(() => {
    const checkLineStatus = async () => {
      try {
        const response = await fetch('/api/profile/link-line');
        if (response.ok) {
          const data = await response.json();
          setLineConnected(data.connected);
          setLineUserId(data.lineUserId);
        }
      } catch {
        // Ignore errors on initial load
      }
    };
    checkLineStatus();
  }, []);

  const handleGenerateLinkCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/profile/link-line', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      setLinkingCode(data.code);
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCheckLinkStatus = async () => {
    setIsCheckingLink(true);
    try {
      const response = await fetch('/api/profile/link-line');
      const data = await response.json();
      if (data.connected) {
        setLineConnected(true);
        setLineUserId(data.lineUserId);
        setLinkingCode(null);
        setUser({ ...user, line_user_id: data.lineUserId });
        toast.success('เชื่อมต่อ LINE สำเร็จ!');
      } else {
        toast('ยังไม่ได้เชื่อมต่อ กรุณาส่งรหัสในแชท LINE Bot', { icon: 'i' });
      }
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsCheckingLink(false);
    }
  };

  const confirmUnlinkLine = async () => {
    setShowUnlinkConfirm(false);
    setIsUnlinking(true);
    try {
      const response = await fetch('/api/profile/unlink-line', { method: 'POST' });
      if (!response.ok) throw new Error('Failed');
      setLineConnected(false);
      setLineUserId(null);
      setUser({ ...user, line_user_id: undefined });
      toast.success('ยกเลิกการเชื่อมต่อ LINE เรียบร้อย');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            เชื่อมต่อ LINE
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lineConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">เชื่อมต่อแล้ว</p>
                  <p className="text-sm text-green-600 font-mono">{lineUserId}</p>
                </div>
                <Badge variant="success" size="sm" className="ml-auto">Active</Badge>
              </div>
              <p className="text-sm text-gray-500">
                คุณจะได้รับการแจ้งเตือนผ่าน LINE เมื่อมีเหตุการณ์สำคัญ
              </p>
              <Button
                variant="outline"
                onClick={() => setShowUnlinkConfirm(true)}
                isLoading={isUnlinking}
                leftIcon={<Link2Off className="w-4 h-4" />}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                ยกเลิกการเชื่อมต่อ
              </Button>
            </div>
          ) : linkingCode ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <p className="font-medium text-blue-800">ขั้นตอนการเชื่อมต่อ:</p>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1.5">
                  <li>เพิ่มเพื่อน LINE Bot ของคลินิก</li>
                  <li>ส่งรหัสด้านล่างในแชท LINE Bot</li>
                </ol>
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-blue-200">
                  <code className="text-lg font-mono font-bold text-blue-900 flex-1 text-center">
                    {linkingCode}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(linkingCode);
                      toast.success('คัดลอกรหัสแล้ว');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-blue-600">รหัสนี้จะหมดอายุใน 15 นาที</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCheckLinkStatus} isLoading={isCheckingLink} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  ตรวจสอบสถานะ
                </Button>
                <Button variant="ghost" onClick={() => setLinkingCode(null)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-gray-700 font-medium">ยังไม่ได้เชื่อมต่อ LINE</p>
                  <p className="text-sm text-gray-500">เชื่อมต่อเพื่อรับการแจ้งเตือนผ่าน LINE</p>
                </div>
              </div>
              <Button onClick={handleGenerateLinkCode} isLoading={isGenerating} leftIcon={<Link2 className="w-4 h-4" />}>
                เชื่อมต่อ LINE
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={showUnlinkConfirm}
        onClose={() => setShowUnlinkConfirm(false)}
        onConfirm={confirmUnlinkLine}
        title="ยกเลิกการเชื่อมต่อ LINE"
        message="ต้องการยกเลิกการเชื่อมต่อ LINE? คุณจะไม่ได้รับการแจ้งเตือนผ่าน LINE อีกต่อไป"
        variant="warning"
        confirmText="ยกเลิกการเชื่อมต่อ"
      />
    </>
  );
}

// --- Section 4: PWA Installation Guide ---
function PWAInstallGuideSection() {
  const [showAndroid, setShowAndroid] = useState(true);
  const [showIOS, setShowIOS] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          ติดตั้งแอปบนมือถือ (PWA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          ติดตั้งแอปบนหน้าจอมือถือเพื่อเข้าใช้งานได้รวดเร็วขึ้น รองรับการแจ้งเตือนแบบ Push
          และใช้งานได้แม้ไม่มีอินเทอร์เน็ต (บางฟีเจอร์)
        </p>

        {/* Android */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowAndroid(!showAndroid)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600" />
              </div>
              <span className="font-medium text-gray-900">Android (Chrome)</span>
            </div>
            <ChevronIcon isOpen={showAndroid} />
          </button>
          {showAndroid && (
            <div className="p-4 space-y-3">
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>เปิดเว็บไซต์นี้ด้วย <strong>Google Chrome</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>กดปุ่ม <strong>เมนู</strong> (จุด 3 จุดมุมขวาบน) <MoreVertical className="inline w-4 h-4 text-gray-500" /></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>เลือก <strong>&quot;เพิ่มไปยังหน้าจอหลัก&quot;</strong> หรือ <strong>&quot;Install app&quot;</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>กด <strong>&quot;ติดตั้ง&quot;</strong> หรือ <strong>&quot;Install&quot;</strong> เพื่อยืนยัน</span>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-700">
                  💡 หลังติดตั้ง ไอคอนแอปจะปรากฏบนหน้าจอมือถือ สามารถเปิดใช้งานได้เหมือนแอปทั่วไป
                </p>
              </div>
            </div>
          )}
        </div>

        {/* iOS */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowIOS(!showIOS)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">iPhone / iPad (Safari)</span>
            </div>
            <ChevronIcon isOpen={showIOS} />
          </button>
          {showIOS && (
            <div className="p-4 space-y-3">
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>เปิดเว็บไซต์นี้ด้วย <strong>Safari</strong> (ต้องเป็น Safari เท่านั้น)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>กดปุ่ม <strong>แชร์</strong> (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น) <Share className="inline w-4 h-4 text-gray-500" /> ที่แถบด้านล่าง</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>เลื่อนลงแล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอหลัก&quot;</strong> <PlusSquare className="inline w-4 h-4 text-gray-500" /></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>กด <strong>&quot;เพิ่ม&quot;</strong> ที่มุมขวาบนเพื่อยืนยัน</span>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  ⚠️ iOS รองรับ Push Notification ตั้งแต่ iOS 16.4 ขึ้นไป — ต้องติดตั้งแอปผ่าน Safari ก่อนจึงจะรับ Push ได้
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Monitor className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <span className="font-medium text-gray-900">คอมพิวเตอร์ (Chrome / Edge)</span>
                <p className="text-xs text-gray-500 mt-0.5">กดไอคอนติดตั้ง <Download className="inline w-3 h-3" /> ใน Address Bar หรือเลือก &quot;Install app&quot; จากเมนู</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// --- Main Profile Page ---
export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  if (!user) return null;

  return (
    <div>
      <Header
        title="โปรไฟล์"
        subtitle="จัดการข้อมูลส่วนตัวและการเชื่อมต่อ"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            กลับ
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
        <PersonalInfoSection user={user} setUser={setUser} />
        <ChangePasswordSection />
        <LineConnectionSection user={user} setUser={setUser} />
        <PushSettings userId={user.id} />
        <PWAInstallGuideSection />
      </div>
    </div>
  );
}
