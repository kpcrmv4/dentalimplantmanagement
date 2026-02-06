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
  Bell,
  Shield,
  Wifi,
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

// =============================================
// Section 1: Personal Info
// =============================================
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

  const roleColor = {
    admin: 'bg-purple-100 text-purple-700',
    dentist: 'bg-blue-100 text-blue-700',
    assistant: 'bg-teal-100 text-teal-700',
    cs: 'bg-orange-100 text-orange-700',
    stock_staff: 'bg-emerald-100 text-emerald-700',
  }[user.role] || 'bg-gray-100 text-gray-700';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 sm:p-6 text-white">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative space-y-4">
        {/* Avatar + Role */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold">
            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-bold truncate">{user.full_name || 'ผู้ใช้งาน'}</h2>
            <p className="text-sm text-blue-200 truncate">{user.email}</p>
            <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
              {getRoleText(user.role)}
            </span>
          </div>
        </div>

        {/* Edit name */}
        <div className="space-y-2">
          <label className="text-sm text-blue-200">ชื่อ-นามสกุล</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white placeholder-blue-300 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="กรอกชื่อ-นามสกุล"
            />
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              className="!bg-white/20 hover:!bg-white/30 !border-white/20 !text-white rounded-xl"
              size="sm"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Section 2: Change Password
// =============================================
function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

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
      setIsExpanded(false);
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">เปลี่ยนรหัสผ่าน</p>
            <p className="text-xs text-gray-500">เปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>
          </div>
        </div>
        <ChevronIcon isOpen={isExpanded} />
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
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
            className="w-full"
          >
            เปลี่ยนรหัสผ่าน
          </Button>
        </div>
      )}
    </div>
  );
}

// =============================================
// Section 3: LINE Connection
// =============================================
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
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {/* Header with LINE green accent */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">LINE Notify</h3>
            <p className="text-xs text-green-100">เชื่อมต่อเพื่อรับแจ้งเตือนผ่าน LINE</p>
          </div>
          {lineConnected && (
            <Badge variant="success" size="sm" className="ml-auto !bg-white/20 !text-white !border-white/30">
              เชื่อมต่อแล้ว
            </Badge>
          )}
        </div>

        <div className="p-4">
          {lineConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800">เชื่อมต่อสำเร็จ</p>
                  <p className="text-xs text-green-600 font-mono truncate">{lineUserId}</p>
                </div>
              </div>

              {/* Description of what LINE does */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <p className="text-xs font-medium text-gray-700">การแจ้งเตือนที่จะได้รับผ่าน LINE:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                    เคสผ่าตัดที่กำลังจะถึง
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                    สถานะการเตรียมวัสดุสำหรับเคส
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                    แจ้งเตือนสต็อกต่ำและสินค้าใกล้หมดอายุ
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full flex-shrink-0" />
                    สรุปรายวันตามเวลาที่ตั้งค่า
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUnlinkConfirm(true)}
                isLoading={isUnlinking}
                leftIcon={<Link2Off className="w-4 h-4" />}
                className="text-red-600 border-red-200 hover:bg-red-50 w-full"
              >
                ยกเลิกการเชื่อมต่อ
              </Button>
            </div>
          ) : linkingCode ? (
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-3">
                <p className="text-sm font-medium text-green-800">ขั้นตอนการเชื่อมต่อ:</p>
                <ol className="space-y-2 text-sm text-green-700">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-200 text-green-800 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <span>เพิ่มเพื่อน LINE Bot ของคลินิก</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-200 text-green-800 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <span>ส่งรหัสด้านล่างในแชท LINE Bot</span>
                  </li>
                </ol>
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-green-200">
                  <code className="text-xl font-mono font-bold text-green-900 flex-1 text-center tracking-widest">
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
                <p className="text-xs text-green-600 text-center">รหัสนี้จะหมดอายุใน 15 นาที</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCheckLinkStatus} isLoading={isCheckingLink} leftIcon={<RefreshCw className="w-4 h-4" />} className="flex-1">
                  ตรวจสอบสถานะ
                </Button>
                <Button variant="ghost" onClick={() => setLinkingCode(null)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Description of LINE when not connected */}
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <p className="text-xs font-medium text-gray-700">เชื่อมต่อ LINE เพื่อรับแจ้งเตือนอัตโนมัติ:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                    เคสผ่าตัดที่กำลังจะถึง
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                    สถานะการเตรียมวัสดุสำหรับเคส
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                    แจ้งเตือนสต็อกต่ำและสินค้าใกล้หมดอายุ
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0" />
                    สรุปรายวันตามเวลาที่ตั้งค่า
                  </li>
                </ul>
              </div>
              <Button onClick={handleGenerateLinkCode} isLoading={isGenerating} leftIcon={<Link2 className="w-4 h-4" />} className="w-full !bg-green-600 hover:!bg-green-700 !text-white">
                เชื่อมต่อ LINE
              </Button>
            </div>
          )}
        </div>
      </div>

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

// =============================================
// Section 4: PWA Installation Guide
// =============================================
function PWAInstallGuideSection() {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-sm">ติดตั้งแอป (PWA)</h3>
          <p className="text-xs text-purple-100">เข้าถึงได้เร็วขึ้นเหมือนแอปมือถือ</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500">
          ติดตั้งแอปบนหน้าจอเพื่อเข้าใช้งานได้ทันที รองรับ Push Notification และใช้งานออฟไลน์ได้บางส่วน
        </p>

        {/* Android */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowAndroid(!showAndroid)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">Android</p>
                <p className="text-xs text-gray-400">Chrome</p>
              </div>
            </div>
            <ChevronIcon isOpen={showAndroid} />
          </button>
          {showAndroid && (
            <div className="px-3 pb-3 border-t border-gray-50">
              <ol className="space-y-2.5 text-sm text-gray-700 pt-3">
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-xs">เปิดเว็บไซต์นี้ด้วย <strong>Google Chrome</strong></span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-xs">กดปุ่ม <strong>เมนู</strong> <MoreVertical className="inline w-3.5 h-3.5 text-gray-400" /> มุมขวาบน</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-xs">เลือก <strong>&quot;เพิ่มไปยังหน้าจอหลัก&quot;</strong> หรือ <strong>&quot;Install app&quot;</strong></span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span className="text-xs">กด <strong>&quot;ติดตั้ง&quot;</strong> เพื่อยืนยัน</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* iOS */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowIOS(!showIOS)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                <Monitor className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">iPhone / iPad</p>
                <p className="text-xs text-gray-400">Safari</p>
              </div>
            </div>
            <ChevronIcon isOpen={showIOS} />
          </button>
          {showIOS && (
            <div className="px-3 pb-3 border-t border-gray-50">
              <ol className="space-y-2.5 text-sm text-gray-700 pt-3">
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span className="text-xs">เปิดเว็บไซต์นี้ด้วย <strong>Safari</strong> เท่านั้น</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span className="text-xs">กดปุ่ม <strong>แชร์</strong> <Share className="inline w-3.5 h-3.5 text-gray-400" /> ที่แถบด้านล่าง</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span className="text-xs">เลื่อนลงแล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอหลัก&quot;</strong> <PlusSquare className="inline w-3.5 h-3.5 text-gray-400" /></span>
                </li>
                <li className="flex gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span className="text-xs">กด <strong>&quot;เพิ่ม&quot;</strong> ที่มุมขวาบนเพื่อยืนยัน</span>
                </li>
              </ol>
              <div className="mt-2.5 p-2.5 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600">
                  iOS 16.4+ เท่านั้นที่รับ Push Notification ได้ ต้องติดตั้งผ่าน Safari ก่อน
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop */}
        <div className="border border-gray-100 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
              <Monitor className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">คอมพิวเตอร์</p>
              <p className="text-xs text-gray-400">กดไอคอนติดตั้ง <Download className="inline w-3 h-3" /> ใน Address Bar (Chrome / Edge)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Helper: Chevron Icon
// =============================================
function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// =============================================
// Section Group Label
// =============================================
function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <Icon className="w-4 h-4 text-gray-400" />
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</h3>
    </div>
  );
}

// =============================================
// Main Profile Page
// =============================================
export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  if (!user) return null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header
        title="โปรไฟล์"
        subtitle="จัดการข้อมูลส่วนตัวและการเชื่อมต่อ"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.back()} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            กลับ
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto space-y-4">
        {/* Profile Hero Card */}
        <PersonalInfoSection user={user} setUser={setUser} />

        {/* Security Group */}
        <SectionLabel icon={Shield} label="ความปลอดภัย" />
        <ChangePasswordSection />

        {/* Notification Group */}
        <SectionLabel icon={Bell} label="การแจ้งเตือน" />
        <LineConnectionSection user={user} setUser={setUser} />
        <PushSettings userId={user.id} />

        {/* App Setup Group */}
        <SectionLabel icon={Wifi} label="ตั้งค่าแอป" />
        <PWAInstallGuideSection />
      </div>
    </div>
  );
}
