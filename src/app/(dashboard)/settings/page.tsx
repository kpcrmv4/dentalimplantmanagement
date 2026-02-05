'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  Package,
  Bell,
  Shield,
  Database,
  Save,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
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
import { useSuppliers, useCategories, useUsers } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

type SettingsTab = 'general' | 'suppliers' | 'categories' | 'users' | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    role: 'staff',
    license_number: '',
  });

  const { data: suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { data: categories, mutate: mutateCategories } = useCategories();
  const { data: users, mutate: mutateUsers } = useUsers();

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: Building2 },
    { id: 'suppliers', label: 'ซัพพลายเออร์', icon: Package },
    { id: 'categories', label: 'หมวดหมู่สินค้า', icon: Database },
    { id: 'users', label: 'ผู้ใช้งาน', icon: Users },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
  ];

  const roleOptions = [
    { value: 'admin', label: 'ผู้ดูแลระบบ' },
    { value: 'dentist', label: 'ทันตแพทย์' },
    { value: 'assistant', label: 'ผู้ช่วย' },
    { value: 'staff', label: 'พนักงาน' },
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

  // Supplier CRUD
  const handleSaveSupplier = async () => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('suppliers')
          .update(supplierForm)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('แก้ไขซัพพลายเออร์เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert({ ...supplierForm, is_active: true });
        if (error) throw error;
        toast.success('เพิ่มซัพพลายเออร์เรียบร้อย');
      }
      mutateSuppliers();
      setShowSupplierModal(false);
      setEditingItem(null);
      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
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

  // Category CRUD
  const handleSaveCategory = async () => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('product_categories')
          .update(categoryForm)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('แก้ไขหมวดหมู่เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(categoryForm);
        if (error) throw error;
        toast.success('เพิ่มหมวดหมู่เรียบร้อย');
      }
      mutateCategories();
      setShowCategoryModal(false);
      setEditingItem(null);
      setCategoryForm({ name: '', description: '' });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('ต้องการลบหมวดหมู่นี้?')) return;
    try {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบหมวดหมู่เรียบร้อย');
      mutateCategories();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // User CRUD
  const handleSaveUser = async () => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from('users')
          .update(userForm)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('แก้ไขผู้ใช้เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('users')
          .insert({ ...userForm, is_active: true });
        if (error) throw error;
        toast.success('เพิ่มผู้ใช้เรียบร้อย');
      }
      mutateUsers();
      setShowUserModal(false);
      setEditingItem(null);
      setUserForm({ full_name: '', email: '', role: 'staff', license_number: '' });
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
      admin: 'ผู้ดูแลระบบ',
      dentist: 'ทันตแพทย์',
      assistant: 'ผู้ช่วย',
      staff: 'พนักงาน',
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
                      <span className="font-medium">{tab.label}</span>
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
                      setSupplierForm({ name: '', contact_person: '', phone: '', email: '', address: '' });
                      setShowSupplierModal(true);
                    }}
                  >
                    เพิ่มซัพพลายเออร์
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>ผู้ติดต่อ</TableHead>
                        <TableHead>เบอร์โทร</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead className="text-right">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers?.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell>{supplier.contact_person || '-'}</TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell>{supplier.email || '-'}</TableCell>
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
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            {activeTab === 'categories' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    หมวดหมู่สินค้า
                  </CardTitle>
                  <Button
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setEditingItem(null);
                      setCategoryForm({ name: '', description: '' });
                      setShowCategoryModal(true);
                    }}
                  >
                    เพิ่มหมวดหมู่
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อหมวดหมู่</TableHead>
                        <TableHead>คำอธิบาย</TableHead>
                        <TableHead className="text-right">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>{category.description || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingItem(category);
                                  setCategoryForm({
                                    name: category.name,
                                    description: category.description || '',
                                  });
                                  setShowCategoryModal(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteCategory(category.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                      setUserForm({ full_name: '', email: '', role: 'staff', license_number: '' });
                      setShowUserModal(true);
                    }}
                  >
                    เพิ่มผู้ใช้
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead>อีเมล</TableHead>
                        <TableHead>บทบาท</TableHead>
                        <TableHead>เลขใบอนุญาต</TableHead>
                        <TableHead className="text-right">การดำเนินการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map((user) => (
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
                          <TableCell>{user.license_number || '-'}</TableCell>
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
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    การแจ้งเตือน
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
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
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

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={editingItem ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อหมวดหมู่ *"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveCategory} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>

      {/* User Modal */}
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
