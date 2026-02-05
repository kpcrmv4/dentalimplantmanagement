'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/layout';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { 
  Package, 
  Save, 
  ArrowLeft, 
  Plus, 
  X,
  Info,
  AlertCircle,
  Check,
  Loader2,
  Tag,
  Building,
  Hash,
  FileText,
  Calendar,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Category, Supplier } from '@/types/database';

interface ProductSpecifications {
  diameter?: string;
  length?: string;
  platform?: string;
  surface?: string;
  material?: string;
  size?: string;
  [key: string]: string | undefined;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Product form state
  const [formData, setFormData] = useState({
    name: '',
    ref_number: '',
    sku: '',
    brand: '',
    category_id: '',
    supplier_id: '',
    description: '',
    unit: 'ชิ้น',
    min_stock: 5,
    reorder_point: 10,
  });
  
  // Specifications state
  const [specifications, setSpecifications] = useState<ProductSpecifications>({});
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  
  // New category modal
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Predefined specification keys for dental products
  const commonSpecKeys = [
    { key: 'diameter', label: 'เส้นผ่านศูนย์กลาง (Diameter)' },
    { key: 'length', label: 'ความยาว (Length)' },
    { key: 'platform', label: 'แพลตฟอร์ม (Platform)' },
    { key: 'surface', label: 'พื้นผิว (Surface)' },
    { key: 'material', label: 'วัสดุ (Material)' },
    { key: 'size', label: 'ขนาด (Size)' },
    { key: 'connection', label: 'Connection Type' },
    { key: 'coating', label: 'Coating' },
  ];

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchSuppliers = async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (!error && data) {
      setSuppliers(data);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSpecification = () => {
    if (newSpecKey && newSpecValue) {
      setSpecifications(prev => ({
        ...prev,
        [newSpecKey]: newSpecValue,
      }));
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const handleRemoveSpecification = (key: string) => {
    setSpecifications(prev => {
      const newSpecs = { ...prev };
      delete newSpecs[key];
      return newSpecs;
    });
  };

  const handleAddQuickSpec = (key: string) => {
    if (!specifications[key]) {
      setNewSpecKey(key);
      document.getElementById('spec-value-input')?.focus();
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('กรุณากรอกชื่อหมวดหมู่');
      return;
    }

    setSavingCategory(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({
          name: newCategoryName.trim(),
          description: newCategoryDescription.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('สร้างหมวดหมู่สำเร็จ');
      setCategories(prev => [...prev, data]);
      setFormData(prev => ({ ...prev, category_id: data.id }));
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถสร้างหมวดหมู่ได้');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อสินค้า');
      return;
    }
    if (!formData.ref_number.trim()) {
      toast.error('กรุณากรอก REF Number');
      return;
    }
    if (!formData.category_id) {
      toast.error('กรุณาเลือกหมวดหมู่');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: formData.name.trim(),
          ref_number: formData.ref_number.trim(),
          sku: formData.sku.trim() || null,
          brand: formData.brand.trim() || null,
          category_id: formData.category_id,
          supplier_id: formData.supplier_id || null,
          description: formData.description.trim() || null,
          unit: formData.unit,
          min_stock: formData.min_stock,
          reorder_point: formData.reorder_point,
          specifications: Object.keys(specifications).length > 0 ? specifications : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('เพิ่มสินค้าสำเร็จ');
      router.push('/inventory');
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('REF Number นี้มีในระบบแล้ว');
      } else {
        toast.error(error.message || 'ไม่สามารถเพิ่มสินค้าได้');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="เพิ่มสินค้าใหม่"
        subtitle="กรอกข้อมูลสินค้าเพื่อเพิ่มเข้าระบบ"
        actions={
          <Button
            variant="ghost"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            กลับ
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              ข้อมูลพื้นฐาน
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อสินค้า <span className="text-red-500">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="เช่น Bone Level Tapered Implant Ø4.1mm RC"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  ระบุชื่อเต็มของสินค้าพร้อมรายละเอียดสำคัญ
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  REF Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    name="ref_number"
                    value={formData.ref_number}
                    onChange={handleInputChange}
                    placeholder="เช่น 021.5308"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  รหัสอ้างอิงจากผู้ผลิต (Reference Number)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU <span className="text-gray-400">(ไม่บังคับ)</span>
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    placeholder="รหัสภายในคลินิก"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  รหัสสินค้าภายในคลินิก (ถ้ามี)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ยี่ห้อ (Brand)
                </label>
                <Input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="เช่น Straumann, Osstem, Nobel Biocare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หน่วยนับ
                </label>
                <Select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                >
                  <option value="ชิ้น">ชิ้น</option>
                  <option value="กล่อง">กล่อง</option>
                  <option value="แพ็ค">แพ็ค</option>
                  <option value="ซอง">ซอง</option>
                  <option value="ขวด">ขวด</option>
                  <option value="หลอด">หลอด</option>
                </Select>
              </div>
            </div>
          </Card>

          {/* Category & Supplier */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              หมวดหมู่และซัพพลายเออร์
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  หมวดหมู่ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleInputChange}
                    className="flex-1"
                    required
                  >
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategory(true)}
                    title="เพิ่มหมวดหมู่ใหม่"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ซัพพลายเออร์
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Select
                    name="supplier_id"
                    value={formData.supplier_id}
                    onChange={handleInputChange}
                    className="pl-10"
                  >
                    <option value="">-- เลือกซัพพลายเออร์ --</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>{sup.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Specifications */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              รายละเอียดสินค้า (Specifications)
            </h2>
            
            {/* Quick add buttons */}
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">เพิ่มรายละเอียดด่วน:</p>
              <div className="flex flex-wrap gap-2">
                {commonSpecKeys.map(spec => (
                  <button
                    key={spec.key}
                    type="button"
                    onClick={() => handleAddQuickSpec(spec.key)}
                    disabled={!!specifications[spec.key]}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      specifications[spec.key]
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {spec.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current specifications */}
            {Object.keys(specifications).length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">รายละเอียดที่เพิ่มแล้ว:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
                    >
                      <span className="text-sm">
                        <span className="font-medium text-blue-700">{key}:</span>{' '}
                        <span className="text-blue-600">{value}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecification(key)}
                        className="text-blue-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add new specification */}
            <div className="flex gap-2">
              <Input
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="ชื่อรายละเอียด (เช่น diameter)"
                className="flex-1"
              />
              <Input
                id="spec-value-input"
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                placeholder="ค่า (เช่น 4.1mm)"
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSpecification();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddSpecification}
                disabled={!newSpecKey || !newSpecValue}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Stock Settings */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              การตั้งค่าสต็อก
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนขั้นต่ำ (Min Stock)
                </label>
                <Input
                  type="number"
                  name="min_stock"
                  value={formData.min_stock}
                  onChange={handleInputChange}
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  แจ้งเตือนเมื่อสต็อกต่ำกว่าจำนวนนี้
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จุดสั่งซื้อ (Reorder Point)
                </label>
                <Input
                  type="number"
                  name="reorder_point"
                  value={formData.reorder_point}
                  onChange={handleInputChange}
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">
                  แนะนำให้สั่งซื้อเมื่อสต็อกถึงจำนวนนี้
                </p>
              </div>
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              หมายเหตุ/รายละเอียดเพิ่มเติม
            </h2>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับสินค้า..."
            />
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              disabled={loading}
              leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
            </Button>
          </div>
        </form>

        {/* New Category Modal */}
        {showNewCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                เพิ่มหมวดหมู่ใหม่
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อหมวดหมู่ <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="เช่น Implant, Abutment, Bone Graft"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    คำอธิบาย
                  </label>
                  <Input
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="คำอธิบายหมวดหมู่ (ถ้ามี)"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategoryName('');
                    setNewCategoryDescription('');
                  }}
                >
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleCreateCategory}
                  disabled={savingCategory || !newCategoryName.trim()}
                  leftIcon={savingCategory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                >
                  {savingCategory ? 'กำลังบันทึก...' : 'สร้างหมวดหมู่'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
