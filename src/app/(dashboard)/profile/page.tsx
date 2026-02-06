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
} from '@/components/ui';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    admin: 'Admin (ผู้บริหาร)',
    cs: 'Customer Service (CS)',
    dentist: 'Dentist (ทันตแพทย์)',
    assistant: 'Dental Assistant (ผู้ช่วยทันตแพทย์)',
    stock_staff: 'Inventory Manager (เจ้าหน้าที่สต็อก)',
  };
  return labels[role] || role;
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [isSavingName, setIsSavingName] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // LINE state
  const [lineConnected, setLineConnected] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Sync fullName when user data changes
  useEffect(() => {
    if (user?.full_name) {
      setFullName(user.full_name);
    }
  }, [user?.full_name]);

  // Check LINE status on mount
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

  // === Handlers ===

  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      toast.error('กรุณากรอกชื่อ');
      return;
    }
    setIsSavingName(true);
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');

      // Update Zustand auth store so sidebar/nav updates immediately
      if (user) {
        setUser({ ...user, full_name: fullName.trim() });
      }
      toast.success('บันทึกชื่อเรียบร้อย');
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async () => {
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

    setIsChangingPassword(true);
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
      setIsChangingPassword(false);
    }
  };

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
        // Update auth store
        if (user) {
          setUser({ ...user, line_user_id: data.lineUserId });
        }
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

  const handleUnlinkLine = async () => {
    if (!confirm('ต้องการยกเลิกการเชื่อมต่อ LINE?')) return;
    setIsUnlinking(true);
    try {
      const response = await fetch('/api/profile/unlink-line', { method: 'POST' });
      if (!response.ok) throw new Error('Failed');
      setLineConnected(false);
      setLineUserId(null);
      if (user) {
        setUser({ ...user, line_user_id: undefined });
      }
      toast.success('ยกเลิกการเชื่อมต่อ LINE เรียบร้อย');
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsUnlinking(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <Header
        title="โปรไฟล์"
        subtitle="จัดการข้อมูลส่วนตัวและการเชื่อมต่อ"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            กลับ
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
        {/* Section 1: Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              ข้อมูลส่วนตัว
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="ชื่อ-นามสกุล"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="อีเมล"
              value={user.email || ''}
              disabled
              helperText="ไม่สามารถเปลี่ยนอีเมลได้"
            />
            <Input
              label="บทบาท"
              value={getRoleLabel(user.role)}
              disabled
            />
            <Button
              onClick={handleUpdateName}
              isLoading={isSavingName}
              leftIcon={<Save className="w-4 h-4" />}
            >
              บันทึก
            </Button>
          </CardContent>
        </Card>

        {/* Section 2: Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              เปลี่ยนรหัสผ่าน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="รหัสผ่านปัจจุบัน"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="รหัสผ่านใหม่"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="ขั้นต่ำ 6 ตัวอักษร"
            />
            <Input
              label="ยืนยันรหัสผ่านใหม่"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword && newPassword !== confirmPassword ? 'รหัสผ่านไม่ตรงกัน' : ''}
            />
            <Button
              onClick={handleChangePassword}
              isLoading={isChangingPassword}
              disabled={
                !currentPassword ||
                !newPassword ||
                newPassword !== confirmPassword ||
                newPassword.length < 6
              }
              leftIcon={<Key className="w-4 h-4" />}
            >
              เปลี่ยนรหัสผ่าน
            </Button>
          </CardContent>
        </Card>

        {/* Section 3: LINE Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              เชื่อมต่อ LINE
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lineConnected ? (
              /* Connected state */
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
                  onClick={handleUnlinkLine}
                  isLoading={isUnlinking}
                  leftIcon={<Link2Off className="w-4 h-4" />}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  ยกเลิกการเชื่อมต่อ
                </Button>
              </div>
            ) : linkingCode ? (
              /* Linking in progress */
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
                  <p className="text-xs text-blue-600">
                    รหัสนี้จะหมดอายุใน 15 นาที
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCheckLinkStatus}
                    isLoading={isCheckingLink}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    ตรวจสอบสถานะ
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setLinkingCode(null)}
                  >
                    ยกเลิก
                  </Button>
                </div>
              </div>
            ) : (
              /* Not connected */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700 font-medium">ยังไม่ได้เชื่อมต่อ LINE</p>
                    <p className="text-sm text-gray-500">เชื่อมต่อเพื่อรับการแจ้งเตือนผ่าน LINE</p>
                  </div>
                </div>
                <Button
                  onClick={handleGenerateLinkCode}
                  isLoading={isGenerating}
                  leftIcon={<Link2 className="w-4 h-4" />}
                >
                  เชื่อมต่อ LINE
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
