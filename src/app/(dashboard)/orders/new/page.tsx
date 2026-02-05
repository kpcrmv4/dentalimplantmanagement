'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Header } from '@/components/layout';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
} from '@/components/ui';
import { useSuppliers, useProducts } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface OrderItem {
  product_id: string;
  product_name: string;
  sku?: string;
  ref_number?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();

  const supplierOptions = [
    { value: '', label: 'เลือกซัพพลายเออร์' },
    ...(suppliers?.map((s) => ({ value: s.id, label: s.name })) || []),
  ];

  const productOptions = [
    { value: '', label: 'เลือกสินค้า' },
    ...(products?.map((p) => ({
      value: p.id,
      label: `${p.sku} - ${p.name}`,
    })) || []),
  ];

  const handleAddItem = () => {
    if (!selectedProductId || quantity <= 0 || unitCost <= 0) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const product = products?.find((p) => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = items.findIndex((i) => i.product_id === selectedProductId);
    if (existingIndex >= 0) {
      // Update existing item
      setItems(
        items.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                quantity: item.quantity + quantity,
                total_cost: (item.quantity + quantity) * item.unit_cost,
              }
            : item
        )
      );
    } else {
      // Add new item
      setItems([
        ...items,
        {
          product_id: selectedProductId,
          product_name: product.name,
          sku: product.sku,
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
        },
      ]);
    }

    // Reset form
    setSelectedProductId('');
    setQuantity(1);
    setUnitCost(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products?.find((p) => p.id === productId);
    if (product) {
      setUnitCost(product.unit_price * 0.7); // Default to 70% of retail price
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_cost, 0);
  const taxAmount = subtotal * 0.07;
  const totalAmount = subtotal + taxAmount;

  const generatePONumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierId) {
      toast.error('กรุณาเลือกซัพพลายเออร์');
      return;
    }

    if (items.length === 0) {
      toast.error('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);

    try {
      const poNumber = generatePONumber();

      // Create purchase order
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          supplier_id: supplierId,
          status: 'pending',
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: expectedDeliveryDate || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.total_cost,
        received_quantity: 0,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('สร้างใบสั่งซื้อเรียบร้อยแล้ว');
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="สร้างใบสั่งซื้อ" subtitle="สร้างใบสั่งซื้อสินค้าใหม่" />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการใบสั่งซื้อ
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Supplier Info */}
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลซัพพลายเออร์</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="ซัพพลายเออร์ *"
                    options={supplierOptions}
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  />
                  <Input
                    label="กำหนดส่ง"
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Add Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    เพิ่มสินค้า
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="col-span-2">
                      <Select
                        label="สินค้า"
                        options={productOptions}
                        value={selectedProductId}
                        onChange={(e) => handleProductChange(e.target.value)}
                      />
                    </div>
                    <Input
                      label="จำนวน"
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                    />
                    <Input
                      label="ราคาต่อหน่วย"
                      type="number"
                      min={0}
                      step={0.01}
                      value={unitCost}
                      onChange={(e) => setUnitCost(parseFloat(e.target.value))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={handleAddItem}
                  >
                    เพิ่มรายการ
                  </Button>
                </CardContent>
              </Card>

              {/* Items List */}
              {items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>รายการสินค้า ({items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-gray-500">{item.sku}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                {item.quantity} x {formatCurrency(item.unit_cost)}
                              </p>
                              <p className="font-medium">
                                {formatCurrency(item.total_cost)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>หมายเหตุ</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม..."
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>สรุปยอด</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">ยอดรวมสินค้า</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">ภาษี (7%)</span>
                      <span>{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t font-medium text-lg">
                      <span>ยอดรวมทั้งสิ้น</span>
                      <span className="text-blue-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={items.length === 0 || !supplierId}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    บันทึกใบสั่งซื้อ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
