'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout';
import { Card, Button, Input, Select, Badge } from '@/components/ui';
import { 
  Package, 
  Save, 
  ArrowLeft, 
  Plus, 
  X,
  Search,
  Calendar,
  Hash,
  Loader2,
  Check,
  AlertCircle,
  Barcode,
  Boxes,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { Product, Supplier } from '@/types/database';

interface ReceiveItem {
  id: string;
  product_id: string;
  product_name: string;
  product_ref: string;
  lot_number: string;
  expiry_date: string;
  quantity: number;
  unit_cost: number;
  notes: string;
}

interface ProductSearchResult extends Product {
  category_name?: string;
  supplier_name?: string;
}

export default function ReceiveInventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // Items to receive
  const [items, setItems] = useState<ReceiveItem[]>([]);
  
  // Product search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

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

  const searchProducts = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          suppliers(name)
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${term}%,ref_number.ilike.%${term}%,sku.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;

      const results = data?.map(p => ({
        ...p,
        category_name: p.categories?.name,
        supplier_name: p.suppliers?.name,
      })) || [];

      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching products:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchTerm, searchProducts]);

  const handleAddProduct = (product: ProductSearchResult) => {
    // Check if product already added
    const existingIndex = items.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      toast.error('สินค้านี้ถูกเพิ่มแล้ว');
      return;
    }

    const newItem: ReceiveItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      product_ref: product.ref_number || '',
      lot_number: '',
      expiry_date: '',
      quantity: 1,
      unit_cost: 0,
      notes: '',
    };

    setItems(prev => [...prev, newItem]);
    setSearchTerm('');
    setShowSearchResults(false);
    toast.success(`เพิ่ม ${product.name}`);
  };

  const handleUpdateItem = (id: string, field: keyof ReceiveItem, value: string | number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const validateItems = (): boolean => {
    for (const item of items) {
      if (!item.lot_number.trim()) {
        toast.error(`กรุณากรอก LOT Number สำหรับ ${item.product_name}`);
        return false;
      }
      if (item.quantity <= 0) {
        toast.error(`จำนวนต้องมากกว่า 0 สำหรับ ${item.product_name}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    if (!validateItems()) {
      return;
    }

    setLoading(true);
    try {
      // Insert inventory records for each item
      for (const item of items) {
        // Check if LOT already exists for this product
        const { data: existingLot } = await supabase
          .from('inventory')
          .select('id, quantity')
          .eq('product_id', item.product_id)
          .eq('lot_number', item.lot_number)
          .single();

        if (existingLot) {
          // Update existing lot quantity
          const { error: updateError } = await supabase
            .from('inventory')
            .update({
              quantity: existingLot.quantity + item.quantity,
              available_quantity: existingLot.quantity + item.quantity,
              unit_cost: item.unit_cost || undefined,
              expiry_date: item.expiry_date || null,
            })
            .eq('id', existingLot.id);

          if (updateError) throw updateError;

          // Log stock movement
          await supabase.from('stock_movements').insert({
            inventory_id: existingLot.id,
            movement_type: 'receive',
            quantity: item.quantity,
            reference_type: 'receive',
            reference_id: null,
            notes: `รับเข้าสต็อก: ${invoiceNumber || 'ไม่มีเลขใบส่งของ'} - ${item.notes || ''}`.trim(),
          });
        } else {
          // Create new inventory record
          const { data: newInventory, error: insertError } = await supabase
            .from('inventory')
            .insert({
              product_id: item.product_id,
              lot_number: item.lot_number,
              expiry_date: item.expiry_date || null,
              quantity: item.quantity,
              available_quantity: item.quantity,
              reserved_quantity: 0,
              unit_cost: item.unit_cost || null,
              supplier_id: supplierId || null,
              received_date: receiveDate,
              location: 'คลังหลัก',
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Log stock movement
          await supabase.from('stock_movements').insert({
            inventory_id: newInventory.id,
            movement_type: 'receive',
            quantity: item.quantity,
            reference_type: 'receive',
            reference_id: null,
            notes: `รับเข้าสต็อก: ${invoiceNumber || 'ไม่มีเลขใบส่งของ'} - ${item.notes || ''}`.trim(),
          });
        }
      }

      toast.success(`รับสินค้าเข้าสต็อกสำเร็จ ${items.length} รายการ`);
      router.push('/inventory');
    } catch (error: any) {
      console.error('Error receiving inventory:', error);
      toast.error(error.message || 'ไม่สามารถรับสินค้าเข้าสต็อกได้');
    } finally {
      setLoading(false);
    }
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="w-7 h-7 text-green-600" />
              รับสินค้าเข้าสต็อก
            </h1>
            <p className="text-gray-600">บันทึกการรับสินค้าเข้าคลัง พร้อม LOT และวันหมดอายุ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receipt Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ข้อมูลการรับสินค้า
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่รับสินค้า
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={receiveDate}
                    onChange={(e) => setReceiveDate(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ซัพพลายเออร์
                </label>
                <Select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">-- เลือกซัพพลายเออร์ --</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เลขที่ใบส่งของ/Invoice
                </label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-XXXXXX"
                />
              </div>
            </div>
          </Card>

          {/* Product Search */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              ค้นหาและเพิ่มสินค้า
            </h2>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อสินค้า, REF หรือ SKU เพื่อค้นหา..."
                className="pl-10"
                onFocus={() => searchTerm.length >= 2 && setShowSearchResults(true)}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
              )}

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => handleAddProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default" className="text-xs">
                              REF: {product.ref_number}
                            </Badge>
                            {product.sku && (
                              <Badge variant="default" className="text-xs">
                                SKU: {product.sku}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {product.category_name} • {product.brand || 'ไม่ระบุยี่ห้อ'}
                          </p>
                        </div>
                        <Plus className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {showSearchResults && searchTerm.length >= 2 && searchResults.length === 0 && !searching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
                  <p className="text-gray-500">ไม่พบสินค้า</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/products/new')}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    เพิ่มสินค้าใหม่
                  </Button>
                </div>
              )}
            </div>

            {/* Click outside to close */}
            {showSearchResults && (
              <div 
                className="fixed inset-0 z-0" 
                onClick={() => setShowSearchResults(false)}
              />
            )}
          </Card>

          {/* Items List */}
          {items.length > 0 && (
            <Card className="overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  รายการสินค้าที่จะรับ ({items.length} รายการ)
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {items.map((item, index) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500">REF: {item.product_ref}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          LOT Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Barcode className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            value={item.lot_number}
                            onChange={(e) => handleUpdateItem(item.id, 'lot_number', e.target.value)}
                            placeholder="เช่น MWX80"
                            className="pl-8 text-sm"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          วันหมดอายุ
                        </label>
                        <Input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => handleUpdateItem(item.id, 'expiry_date', e.target.value)}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          จำนวน <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                          min={1}
                          className="text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          ราคาต่อหน่วย (บาท)
                        </label>
                        <Input
                          type="number"
                          value={item.unit_cost}
                          onChange={(e) => handleUpdateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                          min={0}
                          step={0.01}
                          className="text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          หมายเหตุ
                        </label>
                        <Input
                          value={item.notes}
                          onChange={(e) => handleUpdateItem(item.id, 'notes', e.target.value)}
                          placeholder="หมายเหตุ"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    {item.quantity > 0 && item.unit_cost > 0 && (
                      <p className="text-sm text-gray-500 mt-2 text-right">
                        รวม: <span className="font-medium text-gray-900">
                          {(item.quantity * item.unit_cost).toLocaleString()} บาท
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">จำนวนรวม</p>
                    <p className="text-xl font-bold text-gray-900">{totalItems} ชิ้น</p>
                  </div>
                  {totalCost > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">มูลค่ารวม</p>
                      <p className="text-xl font-bold text-green-600">
                        {totalCost.toLocaleString()} บาท
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Notes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              หมายเหตุเพิ่มเติม
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="หมายเหตุเกี่ยวกับการรับสินค้าครั้งนี้..."
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
              disabled={loading || items.length === 0}
              leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            >
              {loading ? 'กำลังบันทึก...' : `รับสินค้าเข้าสต็อก (${items.length} รายการ)`}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
