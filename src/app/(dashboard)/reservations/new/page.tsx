'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Package, Plus, Trash2 } from 'lucide-react';
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
} from '@/components/ui';
import { useCases, useProducts, useInventory } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { formatDate, daysUntil } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReservationItem {
  product_id: string;
  inventory_id: string;
  quantity: number;
  product_name?: string;
  lot_number?: string;
  available?: number;
}

export default function NewReservationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseIdParam = searchParams.get('case_id');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(caseIdParam || '');
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: cases } = useCases();
  const { data: products } = useProducts();
  const { data: inventory } = useInventory(selectedProductId || undefined);

  const pendingCases = cases?.filter(
    (c) => !['completed', 'cancelled'].includes(c.status)
  );

  const caseOptions = [
    { value: '', label: 'เลือกเคส' },
    ...(pendingCases?.map((c) => ({
      value: c.id,
      label: `${c.case_number} - ${c.patient?.first_name} ${c.patient?.last_name} (${formatDate(c.surgery_date)})`,
    })) || []),
  ];

  const productOptions = [
    { value: '', label: 'เลือกสินค้า' },
    ...(products?.map((p) => ({
      value: p.id,
      label: `${p.sku} - ${p.name}`,
    })) || []),
  ];

  const availableInventory = inventory?.filter((i) => i.available_quantity > 0) || [];

  const handleAddItem = (inventoryItem: any) => {
    const existingIndex = items.findIndex(
      (i) => i.inventory_id === inventoryItem.id
    );

    if (existingIndex >= 0) {
      toast.error('รายการนี้ถูกเพิ่มแล้ว');
      return;
    }

    setItems([
      ...items,
      {
        product_id: inventoryItem.product_id,
        inventory_id: inventoryItem.id,
        quantity: 1,
        product_name: inventoryItem.product?.name,
        lot_number: inventoryItem.lot_number,
        available: inventoryItem.available_quantity,
      },
    ]);
    setSelectedProductId('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const item = items[index];
    if (quantity > (item.available || 0)) {
      toast.error('จำนวนเกินกว่าที่มีในสต็อก');
      return;
    }
    setItems(
      items.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCaseId) {
      toast.error('กรุณาเลือกเคส');
      return;
    }

    if (items.length === 0) {
      toast.error('กรุณาเพิ่มรายการจองอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create reservations
      const reservations = items.map((item) => ({
        case_id: selectedCaseId,
        product_id: item.product_id,
        inventory_id: item.inventory_id,
        quantity: item.quantity,
        status: 'pending',
        reserved_at: new Date().toISOString(),
      }));

      const { error: reservationError } = await supabase
        .from('case_reservations')
        .insert(reservations);

      if (reservationError) throw reservationError;

      // Update inventory reserved quantities
      for (const item of items) {
        const { error: inventoryError } = await supabase.rpc('reserve_inventory', {
          p_inventory_id: item.inventory_id,
          p_quantity: item.quantity,
        });

        if (inventoryError) {
          console.error('Error reserving inventory:', inventoryError);
        }
      }

      // Update case status
      await supabase
        .from('cases')
        .update({ status: 'yellow' })
        .eq('id', selectedCaseId);

      toast.success('จองวัสดุเรียบร้อยแล้ว');
      router.push(`/cases/${selectedCaseId}`);
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="จองวัสดุใหม่" subtitle="เลือกวัสดุสำหรับเคสผ่าตัด" />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/reservations"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการจอง
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Case Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>เลือกเคส</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    label="เคสผ่าตัด *"
                    options={caseOptions}
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Product Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    เลือกวัสดุ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="สินค้า"
                    options={productOptions}
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  />

                  {selectedProductId && availableInventory.length > 0 && (
                    <div className="border rounded-lg divide-y">
                      <div className="p-3 bg-gray-50 text-sm font-medium text-gray-600">
                        เลือก Lot ที่ต้องการจอง
                      </div>
                      {availableInventory.map((inv) => {
                        const expiryDays = inv.expiry_date
                          ? daysUntil(inv.expiry_date)
                          : null;

                        return (
                          <div
                            key={inv.id}
                            className="p-3 flex items-center justify-between hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium">{inv.lot_number}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500">
                                  คงเหลือ: {inv.available_quantity}
                                </span>
                                {inv.expiry_date && (
                                  <Badge
                                    variant={
                                      expiryDays !== null && expiryDays <= 30
                                        ? 'warning'
                                        : 'gray'
                                    }
                                    size="sm"
                                  >
                                    หมดอายุ {formatDate(inv.expiry_date)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<Plus className="w-4 h-4" />}
                              onClick={() => handleAddItem(inv)}
                            >
                              เพิ่ม
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedProductId && availableInventory.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">ไม่มีสต็อกสำหรับสินค้านี้</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Items */}
              {items.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>รายการที่เลือก ({items.length})</CardTitle>
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
                            <p className="text-sm text-gray-500">
                              Lot: {item.lot_number} | คงเหลือ: {item.available}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              min={1}
                              max={item.available}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(index, parseInt(e.target.value))
                              }
                              className="w-20"
                            />
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
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center py-4 border-b">
                      <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {items.length}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      isLoading={isSubmitting}
                      disabled={items.length === 0 || !selectedCaseId}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      บันทึกการจอง
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
