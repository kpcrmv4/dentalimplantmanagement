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
  Stethoscope,
  Search,
  FileText,
  ChevronRight,
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
import { useSuppliers, useUsers, useProcedureTypesAll, useMaterialTemplatesAll, useProductSearch } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';
import type { ProcedureType, MaterialTemplate, MaterialTemplateItem } from '@/types/database';

// Import new settings components
import { LineSettings } from '@/components/settings/LineSettings';
import { ScheduledSettings } from '@/components/settings/ScheduledSettings';
import { PushSettings } from '@/components/settings/PushSettings';

type SettingsTab = 'general' | 'suppliers' | 'users' | 'procedures' | 'notifications' | 'line' | 'scheduled' | 'push';

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
    password: '',
    role: 'assistant',
    license_number: '',
    line_user_id: '',
  });

  const { data: suppliers, mutate: mutateSuppliers } = useSuppliers();
  const { data: users, mutate: mutateUsers } = useUsers();

  // Procedure Types & Templates
  const [selectedProcedureTypeId, setSelectedProcedureTypeId] = useState<string>('');
  const { data: procedureTypes, mutate: mutateProcedureTypes } = useProcedureTypesAll();
  const { data: materialTemplates, mutate: mutateTemplates } = useMaterialTemplatesAll(selectedProcedureTypeId || undefined);

  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [procedureForm, setProcedureForm] = useState({ name: '', value: '', description: '' });
  const [editingProcedure, setEditingProcedure] = useState<ProcedureType | null>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
  const [editingTemplate, setEditingTemplate] = useState<MaterialTemplate | null>(null);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [addItemTemplateId, setAddItemTemplateId] = useState<string>('');
  const [templateItemSearch, setTemplateItemSearch] = useState('');
  const [addItemQty, setAddItemQty] = useState(1);
  const { data: searchResults } = useProductSearch(templateItemSearch);

  const tabs = [
    { id: 'general', label: 'ทั่วไป', icon: Building2 },
    { id: 'suppliers', label: 'ซัพพลายเออร์', icon: Package },
    { id: 'users', label: 'ผู้ใช้งาน', icon: Users },
    { id: 'procedures', label: 'ประเภทการรักษา', icon: Stethoscope },
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

  // User CRUD - Uses Supabase Auth via API routes
  const handleSaveUser = async () => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update existing user
        const response = await fetch(`/api/users/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: userForm.full_name,
            role: userForm.role,
            license_number: userForm.license_number,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update user');
        toast.success('แก้ไขผู้ใช้เรียบร้อย');
      } else {
        // Create new user with Supabase Auth
        if (!userForm.email || !userForm.password) {
          toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
          setIsSubmitting(false);
          return;
        }
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            full_name: userForm.full_name,
            role: userForm.role,
            license_number: userForm.license_number,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create user');
        toast.success('เพิ่มผู้ใช้เรียบร้อย');
      }
      mutateUsers();
      setShowUserModal(false);
      setEditingItem(null);
      setUserForm({ full_name: '', email: '', password: '', role: 'assistant', license_number: '', line_user_id: '' });
    } catch (error: any) {
      toast.error(error.message || 'เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableUser = async (id: string, currentIsActive: boolean) => {
    if (!confirm(currentIsActive ? 'ต้องการปิดใช้งานผู้ใช้นี้?' : 'ต้องการเปิดใช้งานผู้ใช้นี้?')) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${id}/disable`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentIsActive }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      toast.success(currentIsActive ? 'ปิดใช้งานผู้ใช้เรียบร้อย' : 'เปิดใช้งานผู้ใช้เรียบร้อย');
      mutateUsers();
      setShowUserModal(false);
      setEditingItem(null);
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('ต้องการลบผู้ใช้นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed');
      toast.success('ลบผู้ใช้เรียบร้อย');
      mutateUsers();
      setShowUserModal(false);
      setEditingItem(null);
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Procedure Type CRUD
  const handleSaveProcedureType = async () => {
    if (!procedureForm.name) {
      toast.error('กรุณากรอกชื่อประเภทการรักษา');
      return;
    }
    setIsSubmitting(true);
    try {
      const value = procedureForm.value || procedureForm.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (editingProcedure) {
        const { error } = await supabase
          .from('procedure_types')
          .update({ name: procedureForm.name, value, description: procedureForm.description || null })
          .eq('id', editingProcedure.id);
        if (error) throw error;
        toast.success('แก้ไขประเภทการรักษาเรียบร้อย');
      } else {
        const maxSort = procedureTypes?.length ? Math.max(...procedureTypes.map(p => p.sort_order)) + 1 : 1;
        const { error } = await supabase
          .from('procedure_types')
          .insert({ name: procedureForm.name, value, description: procedureForm.description || null, sort_order: maxSort, is_active: true });
        if (error) throw error;
        toast.success('เพิ่มประเภทการรักษาเรียบร้อย');
      }
      mutateProcedureTypes();
      setShowProcedureModal(false);
      setEditingProcedure(null);
      setProcedureForm({ name: '', value: '', description: '' });
    } catch (error: any) {
      console.error('Save procedure type error:', error);
      if (error?.code === '23505') {
        toast.error('รหัสนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น');
      } else if (error?.code === '42P01') {
        toast.error('ตาราง procedure_types ยังไม่ได้สร้าง กรุณา run migration ก่อน');
      } else {
        toast.error(error?.message || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProcedureType = async (id: string) => {
    if (!confirm('ต้องการลบประเภทการรักษานี้? เทมเพลทที่ผูกกับประเภทนี้จะถูกลบด้วย')) return;
    try {
      const { error } = await supabase.from('procedure_types').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบประเภทการรักษาเรียบร้อย');
      if (selectedProcedureTypeId === id) setSelectedProcedureTypeId('');
      mutateProcedureTypes();
      mutateTemplates();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleToggleProcedureActive = async (pt: ProcedureType) => {
    try {
      const { error } = await supabase
        .from('procedure_types')
        .update({ is_active: !pt.is_active })
        .eq('id', pt.id);
      if (error) throw error;
      toast.success(pt.is_active ? 'ปิดใช้งานเรียบร้อย' : 'เปิดใช้งานเรียบร้อย');
      mutateProcedureTypes();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // Material Template CRUD
  const handleSaveTemplate = async () => {
    if (!templateForm.name) {
      toast.error('กรุณากรอกชื่อเทมเพลท');
      return;
    }
    if (!selectedProcedureTypeId) {
      toast.error('กรุณาเลือกประเภทการรักษาก่อน');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        const { error } = await supabase
          .from('material_templates')
          .update({ name: templateForm.name, description: templateForm.description || null })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        toast.success('แก้ไขเทมเพลทเรียบร้อย');
      } else {
        const maxSort = materialTemplates?.length ? Math.max(...materialTemplates.map(t => t.sort_order)) + 1 : 1;
        const { error } = await supabase
          .from('material_templates')
          .insert({
            name: templateForm.name,
            description: templateForm.description || null,
            procedure_type_id: selectedProcedureTypeId,
            sort_order: maxSort,
            is_active: true,
          });
        if (error) throw error;
        toast.success('เพิ่มเทมเพลทเรียบร้อย');
      }
      mutateTemplates();
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', description: '' });
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('ต้องการลบเทมเพลทนี้? รายการวัสดุทั้งหมดจะถูกลบด้วย')) return;
    try {
      const { error } = await supabase.from('material_templates').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบเทมเพลทเรียบร้อย');
      mutateTemplates();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // Template Item CRUD
  const handleAddTemplateItem = async (productId: string, productName: string) => {
    if (!addItemTemplateId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('material_template_items')
        .insert({
          template_id: addItemTemplateId,
          product_id: productId,
          quantity: addItemQty,
          sort_order: 0,
        });
      if (error) throw error;
      toast.success(`เพิ่ม ${productName} เรียบร้อย`);
      mutateTemplates();
      setTemplateItemSearch('');
      setAddItemQty(1);
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTemplateItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from('material_template_items').delete().eq('id', itemId);
      if (error) throw error;
      toast.success('ลบรายการเรียบร้อย');
      mutateTemplates();
    } catch {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  const handleUpdateTemplateItemQty = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    try {
      const { error } = await supabase
        .from('material_template_items')
        .update({ quantity })
        .eq('id', itemId);
      if (error) throw error;
      mutateTemplates();
    } catch {
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
                      setUserForm({ full_name: '', email: '', password: '', role: 'assistant', license_number: '', line_user_id: '' });
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
                          <TableRow key={user.id} className={!user.is_active ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">
                              {user.full_name}
                              {!user.is_active && (
                                <Badge variant="gray" size="sm" className="ml-2">ปิดใช้งาน</Badge>
                              )}
                            </TableCell>
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
                                      password: '',
                                      role: user.role,
                                      license_number: user.license_number || '',
                                      line_user_id: user.line_user_id || '',
                                    });
                                    setShowUserModal(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
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

            {/* Procedure Types & Templates */}
            {activeTab === 'procedures' && (
              <div className="space-y-6">
                {/* Procedure Types List */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="w-5 h-5" />
                      ประเภทการรักษา
                    </CardTitle>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => {
                        setEditingProcedure(null);
                        setProcedureForm({ name: '', value: '', description: '' });
                        setShowProcedureModal(true);
                      }}
                    >
                      เพิ่มประเภท
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ชื่อ</TableHead>
                            <TableHead>รหัส</TableHead>
                            <TableHead>สถานะ</TableHead>
                            <TableHead className="text-right">การดำเนินการ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {procedureTypes?.map((pt) => (
                            <TableRow
                              key={pt.id}
                              className={`cursor-pointer ${selectedProcedureTypeId === pt.id ? 'bg-blue-50' : 'hover:bg-gray-50'} ${!pt.is_active ? 'opacity-50' : ''}`}
                              onClick={() => setSelectedProcedureTypeId(pt.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {pt.name}
                                  {selectedProcedureTypeId === pt.id && (
                                    <ChevronRight className="w-4 h-4 text-blue-500" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-500 text-sm">{pt.value}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={pt.is_active ? 'success' : 'gray'}
                                  size="sm"
                                  className="cursor-pointer"
                                  onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleToggleProcedureActive(pt); }}
                                >
                                  {pt.is_active ? 'ใช้งาน' : 'ปิด'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingProcedure(pt);
                                      setProcedureForm({ name: pt.name, value: pt.value, description: pt.description || '' });
                                      setShowProcedureModal(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProcedureType(pt.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!procedureTypes || procedureTypes.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                                ยังไม่มีประเภทการรักษา
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Templates Section */}
                {selectedProcedureTypeId && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        เทมเพลทวัสดุ — {procedureTypes?.find(p => p.id === selectedProcedureTypeId)?.name}
                      </CardTitle>
                      <Button
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                          setEditingTemplate(null);
                          setTemplateForm({ name: '', description: '' });
                          setShowTemplateModal(true);
                        }}
                      >
                        สร้างเทมเพลท
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {materialTemplates && materialTemplates.length > 0 ? (
                        <div className="space-y-4">
                          {materialTemplates.map((template) => (
                            <div key={template.id} className="border border-gray-200 rounded-lg">
                              {/* Template Header */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg">
                                <div>
                                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                                  {template.description && (
                                    <p className="text-sm text-gray-500 mt-0.5">{template.description}</p>
                                  )}
                                  <span className="text-xs text-gray-400 mt-1 inline-block">
                                    {template.items?.length || 0} รายการวัสดุ
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setTemplateForm({ name: template.name, description: template.description || '' });
                                      setShowTemplateModal(true);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                              {/* Template Items */}
                              <div className="p-4">
                                {template.items && template.items.length > 0 ? (
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>วัสดุ</TableHead>
                                        <TableHead>REF</TableHead>
                                        <TableHead className="w-28">จำนวน</TableHead>
                                        <TableHead className="w-16"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {template.items.map((item) => (
                                        <TableRow key={item.id}>
                                          <TableCell className="font-medium">
                                            {item.product?.name || 'N/A'}
                                            {item.product?.brand && (
                                              <span className="text-gray-400 text-xs ml-1">({item.product.brand})</span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-gray-500 text-sm">
                                            {item.product?.ref_number || item.product?.sku || '-'}
                                          </TableCell>
                                          <TableCell>
                                            <input
                                              type="number"
                                              min={1}
                                              value={item.quantity}
                                              onChange={(e) => handleUpdateTemplateItemQty(item.id, parseInt(e.target.value) || 1)}
                                              className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => handleRemoveTemplateItem(item.id)}>
                                              <X className="w-4 h-4 text-red-400" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                ) : (
                                  <p className="text-gray-400 text-sm text-center py-4">ยังไม่มีรายการวัสดุ</p>
                                )}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<Plus className="w-3 h-3" />}
                                    onClick={() => {
                                      setAddItemTemplateId(template.id);
                                      setTemplateItemSearch('');
                                      setAddItemQty(1);
                                      setShowAddItemModal(true);
                                    }}
                                  >
                                    เพิ่มวัสดุ
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-8">
                          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>ยังไม่มีเทมเพลทสำหรับประเภทนี้</p>
                          <p className="text-sm mt-1">กดปุ่ม &quot;สร้างเทมเพลท&quot; เพื่อเริ่มต้น</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!selectedProcedureTypeId && procedureTypes && procedureTypes.length > 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-400">
                      <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>เลือกประเภทการรักษาเพื่อจัดการเทมเพลทวัสดุ</p>
                    </CardContent>
                  </Card>
                )}
              </div>
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

      {/* User Modal - With Supabase Auth */}
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
            label={editingItem ? 'อีเมล' : 'อีเมล *'}
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            disabled={!!editingItem}
            helperText={editingItem ? 'ไม่สามารถเปลี่ยนอีเมลได้' : undefined}
          />
          {!editingItem && (
            <Input
              label="รหัสผ่าน *"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              placeholder="ขั้นต่ำ 6 ตัวอักษร"
            />
          )}
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
            readOnly
            className="bg-gray-50"
            placeholder={editingItem ? '' : 'ผู้ใช้เชื่อมต่อเองผ่านหน้าโปรไฟล์'}
            helperText="ผู้ใช้สามารถเชื่อมต่อ LINE ได้เองผ่านหน้าโปรไฟล์"
          />
        </div>
        <ModalFooter>
          {editingItem && (
            <div className="flex gap-2 mr-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisableUser(editingItem.id, editingItem.is_active)}
                isLoading={isSubmitting}
              >
                {editingItem.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => handleDeleteUser(editingItem.id)}
                isLoading={isSubmitting}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                ลบ
              </Button>
            </div>
          )}
          <Button variant="outline" onClick={() => setShowUserModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveUser} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>

      {/* Procedure Type Modal */}
      <Modal
        isOpen={showProcedureModal}
        onClose={() => setShowProcedureModal(false)}
        title={editingProcedure ? 'แก้ไขประเภทการรักษา' : 'เพิ่มประเภทการรักษา'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อประเภท *"
            placeholder="เช่น Single Implant"
            value={procedureForm.name}
            onChange={(e) => setProcedureForm({ ...procedureForm, name: e.target.value })}
          />
          <Input
            label="รหัส (Value)"
            placeholder="เช่น single_implant (สร้างอัตโนมัติถ้าไม่กรอก)"
            value={procedureForm.value}
            onChange={(e) => setProcedureForm({ ...procedureForm, value: e.target.value })}
            helperText="ใช้เป็นรหัสภายใน ภาษาอังกฤษตัวเล็ก ไม่มีเว้นวรรค"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={procedureForm.description}
              onChange={(e) => setProcedureForm({ ...procedureForm, description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม..."
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowProcedureModal(false)}>ยกเลิก</Button>
          <Button onClick={handleSaveProcedureType} isLoading={isSubmitting}>บันทึก</Button>
        </ModalFooter>
      </Modal>

      {/* Template Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title={editingTemplate ? 'แก้ไขเทมเพลท' : 'สร้างเทมเพลทใหม่'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อเทมเพลท *"
            placeholder="เช่น Standard Single Implant Set"
            value={templateForm.name}
            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={templateForm.description}
              onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
              placeholder="คำอธิบายเพิ่มเติม..."
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowTemplateModal(false)}>ยกเลิก</Button>
          <Button onClick={handleSaveTemplate} isLoading={isSubmitting}>บันทึก</Button>
        </ModalFooter>
      </Modal>

      {/* Add Template Item Modal */}
      <Modal
        isOpen={showAddItemModal}
        onClose={() => { setShowAddItemModal(false); setTemplateItemSearch(''); }}
        title="เพิ่มวัสดุในเทมเพลท"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-sm"
              placeholder="ค้นหาวัสดุ (ชื่อ, SKU, REF)..."
              value={templateItemSearch}
              onChange={(e) => setTemplateItemSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">จำนวน:</label>
            <input
              type="number"
              min={1}
              value={addItemQty}
              onChange={(e) => setAddItemQty(parseInt(e.target.value) || 1)}
              className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm text-center"
            />
          </div>
          {searchResults && searchResults.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg divide-y">
              {searchResults.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAddTemplateItem(product.id, product.name)}
                >
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      {product.ref_number && `REF: ${product.ref_number}`}
                      {product.ref_number && product.brand && ' · '}
                      {product.brand}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      สต็อก: {product.available_stock || 0}
                    </span>
                    <Plus className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : templateItemSearch.length >= 2 ? (
            <p className="text-sm text-gray-400 text-center py-4">ไม่พบวัสดุ</p>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setShowAddItemModal(false); setTemplateItemSearch(''); }}>
            ปิด
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
