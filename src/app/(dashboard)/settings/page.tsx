'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Package,
  Bell,
  Shield,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  MessageSquare,
  Clock,
  Smartphone,
} from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Badge,
  Modal,
  ModalFooter,
} from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useSuppliers, useUsers } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

// Import new settings components
import { LineSettings } from '@/components/settings/LineSettings';
import { ScheduledSettings } from '@/components/settings/ScheduledSettings';
import { PushSettings } from '@/components/settings/PushSettings';

type SettingsTab = 'general' | 'suppliers' | 'users' | 'notifications' | 'line' | 'scheduled' | 'push';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuthStore();

  // General settings
  const [clinicName, setClinicName] = useState('DentalStock Clinic');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');

  // Notification settings
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [expiryAlert, setExpiryAlert] = useState(true);
  const [expiryDays, setExpiryDays] = useState(30);

  // Modal states
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states - Updated with line_user_id
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    line_user_id: '',
  });
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'assistant',
    license_number: '',
    line_user_id: '',
  });

  const { data: suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { data: users, mutate: mutateUsers } = useUsers();

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: Building2 },
    { id: 'suppliers', label: 'ซัพพลายเออร์', icon: Package },
    { id: 'users', label: 'ผู้ใช้งาน', icon: Users },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'push', label: 'Push Notification', icon: Smartphone },
    { id: 'scheduled', label: 'แจ้งเตือนประจำวัน', icon: Clock },
    { id: 'line', label: 'LINE Bot', icon: MessageSquare },
  ];

  const roleOptions = [
    { value: 'admin', label: 'Admin (ผู้บริหาร)' },
    { value: 'cs', label: 'Customer Service (CS)' },
    { value: 'dentist', label: 'Dentist (ทันตแพทย์)' },
    { value: 'assistant', label: 'Dental Assistant (ผู้ช่วยทันตแพทย์)' },
    { value: 'stock_staff', label: 'Inventory Manager (ฝ่ายคลัง)' },
  ];

  const handleSaveGeneral = async () => {
    setIsSubmitting(true);
    try {
      // In a real app, save to database
      localStorage.setItem('clinicSettings', JSON.stringify({
        clinicName,
        clinicAddress,
        clinicPhone,
        clinicEmail,
      }));
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNotifications = async () => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('notificationSettings', JSON.stringify({
        lowStockAlert,
        expiryAlert,
        expiryDays,
      }));
      toast.success('บันทึกการตั้งค่าเรียบร้อย');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supplier CRUD - Updated with line_user_id
  const handleSaveSupplier = async () => {
    setIsSubmitting(true);
    try {
      const supplierData = {
        name: supplierForm.name,
        contact_person: supplierForm.contact_person || null,
        phone: supplierForm.phone || null,
        email: supplierForm.email || null,
        address: supplierForm.address || null,
        line_user_id: supplierForm.line_user_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('แก้ไขซัพพลายเออร์เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({ ...supplierData, is_active: true });
        if (error) throw error;
        toast.success('เพิ่มซัพพลายเออร์เรียบร้อย');
      }
      mutateSuppliers();
      setShowSupplierModal(false);
      setEditingItem(null);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', line_user_id: '' });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('ต้องการลบซัพพลายเออร์นี้?')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบซัพพลายเออร์เรียบร้อย');
      mutateSuppliers();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // User CRUD - Updated with line_user_id
  const handleSaveUser = async () => {
    setIsSubmitting(true);
    try {
      const userData = {
        full_name: userForm.full_name,
        email: userForm.email || null,
        role: userForm.role,
        license_number: userForm.license_number || null,
        line_user_id: userForm.line_user_id || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('แก้ไขผู้ใช้เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('users')
          .insert({ ...userData, is_active: true });
        if (error) throw error;
        toast.success('เพิ่มผู้ใช้เรียบร้อย');
      }
      mutateUsers();
      setShowUserModal(false);
      setEditingItem(null);
      setUserForm({ full_name: '', email: '', role: 'assistant', license_number: '', line_user_id: '' });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('ต้องการลบผู้ใช้นี้?')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบผู้ใช้เรียบร้อย');
      mutateUsers();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      cs: 'CS',
      dentist: 'ทันตแพทย์',
      assistant: 'ผู้ช่วย',
      stock_staff: 'สต็อก',
    };
    return labels[role] || role;
  };

  return (
    <div className="min-h-screen">
      <Header title="ตั้งค่าระบบ" subtitle="จัดการการตั้งค่าต่างๆ ของระบบ" />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as SettingsTab)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* General Settings */}
            {activeTab === 'general' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    ข้อมูลคลินิก
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="ชื่อคลินิก"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ที่อยู่
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={3}
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="เบอร์โทรศัพท์"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                    />
                    <Input
                      label="อีเมล"
                      type="email"
                      value={clinicEmail}
                      onChange={(e) => setClinicEmail(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <Button
                      onClick={handleSaveGeneral}
                      isLoading={isSubmitting}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      บันทึก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suppliers */}
            {activeTab === 'suppliers' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    ซัพพลายเออร์
                  </CardTitle>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setEditingItem(null);
                      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '', line_user_id: '' });
                      setShowSupplierModal(true);
                    }}
                  >
                    เพิ่มซัพพลายเออร์
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ชื่อ</TableHead>
                          <TableHead>ผู้ติดต่อ</TableHead>
                          <TableHead>เบอร์โทร</TableHead>
                          <TableHead>LINE ID</TableHead>
                          <TableHead className="text-right">การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suppliers?.map((supplier: any) => (
                          <TableRow key={supplier.id}>
                            <TableCell className="font-medium">{supplier.name}</TableCell>
                            <TableCell>{supplier.contact_person || '-'}</TableCell>
                            <TableCell>{supplier.phone || '-'}</TableCell>
                            <TableCell>
                              {supplier.line_user_id ? (
                                <Badge variant="success" size="sm">เชื่อมต่อแล้ว</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItem(supplier);
                                    setSupplierForm({
                                      name: supplier.name,
                                      contact_person: supplier.contact_person || '',
                                      phone: supplier.phone || '',
                                      email: supplier.email || '',
                                      address: supplier.address || '',
                                      line_user_id: supplier.line_user_id || '',
                                    });
                                    setShowSupplierModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSupplier(supplier.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Users */}
            {activeTab === 'users' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    ผู้ใช้งาน
                  </CardTitle>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setEditingItem(null);
                      setUserForm({ full_name: '', email: '', role: 'assistant', license_number: '', line_user_id: '' });
                      setShowUserModal(true);
                    }}
                  >
                    เพิ่มผู้ใช้
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ชื่อ</TableHead>
                          <TableHead>อีเมล</TableHead>
                          <TableHead>บทบาท</TableHead>
                          <TableHead>LINE</TableHead>
                          <TableHead className="text-right">การดำเนินการ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>{user.email || '-'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={user.role === 'admin' ? 'info' : 'gray'}
                              >
                                {getRoleLabel(user.role)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.line_user_id ? (
                                <Badge variant="success" size="sm">เชื่อมต่อแล้ว</Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItem(user);
                                    setUserForm({
                                      full_name: user.full_name,
                                      email: user.email || '',
                                      role: user.role,
                                      license_number: user.license_number || '',
                                      line_user_id: user.line_user_id || '',
                                    });
                                    setShowUserModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    การแจ้งเตือนพื้นฐาน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">แจ้งเตือนสต็อกต่ำ</p>
                      <p className="text-sm text-gray-500">
                        แจ้งเตือนเมื่อสินค้าเหลือน้อยกว่าที่กำหนด
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lowStockAlert}
                        onChange={(e) => setLowStockAlert(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">แจ้งเตือนสินค้าใกล้หมดอายุ</p>
                      <p className="text-sm text-gray-500">
                        แจ้งเตือนก่อนสินค้าหมดอายุ
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expiryAlert}
                        onChange={(e) => setExpiryAlert(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {expiryAlert && (
                    <div className="pl-4">
                      <Input
                        label="แจ้งเตือนก่อนหมดอายุ (วัน)"
                        type="number"
                        min={1}
                        value={expiryDays}
                        onChange={(e) => setExpiryDays(parseInt(e.target.value))}
                        className="max-w-xs"
                      />
                    </div>
                  )}
                  <div className="pt-4">
                    <Button
                      onClick={handleSaveNotifications}
                      isLoading={isSubmitting}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      บันทึก
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Push Notification Settings */}
            {activeTab === 'push' && (
              <PushSettings userId={user?.id || null} />
            )}

            {/* Scheduled Notification Settings */}
            {activeTab === 'scheduled' && (
              <ScheduledSettings />
            )}

            {/* LINE Settings */}
            {activeTab === 'line' && (
              <LineSettings />
            )}
          </div>
        </div>
      </div>

      {/* Supplier Modal - Updated with LINE ID */}
      <Modal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        title={editingItem ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อซัพพลายเออร์ *"
            value={supplierForm.name}
            onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
          />
          <Input
            label="ผู้ติดต่อ"
            value={supplierForm.contact_person}
            onChange={(e) => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="เบอร์โทร"
              value={supplierForm.phone}
              onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
            />
            <Input
              label="อีเมล"
              type="email"
              value={supplierForm.email}
              onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={supplierForm.address}
              onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
            />
          </div>
          <Input
            label="LINE User ID"
            value={supplierForm.line_user_id}
            onChange={(e) => setSupplierForm({ ...supplierForm, line_user_id: e.target.value })}
            placeholder="U1234567890abcdef..."
            helperText="ID ที่ได้จากการที่ซัพพลายเออร์เพิ่ม LINE Bot เป็นเพื่อน"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSupplierModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveSupplier} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>

      {/* User Modal - Updated with LINE ID */}
      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={editingItem ? 'แก้ไขผู้ใช้' : 'เพิ่มผู้ใช้'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อ-นามสกุล *"
            value={userForm.full_name}
            onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
          />
          <Input
            label="อีเมล"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
          />
          <Select
            label="บทบาท"
            options={roleOptions}
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
          />
          <Input
            label="เลขใบอนุญาต"
            value={userForm.license_number}
            onChange={(e) => setUserForm({ ...userForm, license_number: e.target.value })}
          />
          <Input
            label="LINE User ID"
            value={userForm.line_user_id}
            onChange={(e) => setUserForm({ ...userForm, line_user_id: e.target.value })}
            placeholder="U1234567890abcdef..."
            helperText="ID ที่ได้จากการที่ผู้ใช้เพิ่ม LINE Bot เป็นเพื่อน"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowUserModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveUser} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
