'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Building2,
  Package,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Input, Select, Badge, Modal, ModalFooter } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useExchanges, useSuppliers, useProducts, useInventory } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ExchangeStatus, ExchangeType } from '@/types/database';

export default function ExchangesPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'borrow' as ExchangeType,
    supplier_id: '',
    product_id: '',
    inventory_id: '',
    quantity: 1,
    expected_return_date: '',
    notes: '',
  });

  const { data: exchanges, isLoading, mutate } = useExchanges();
  const { data: suppliers } = useSuppliers();
  const { data: products } = useProducts();
  const { data: inventory } = useInventory(formData.product_id || undefined);

  const filteredExchanges = useMemo(() => {
    if (!exchanges) return [];

    return exchanges.filter((exchange) => {
      const matchesSearch =
        !search ||
        exchange.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
        exchange.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
        exchange.product?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesType = !typeFilter || exchange.type === typeFilter;
      const matchesStatus = !statusFilter || exchange.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [exchanges, search, typeFilter, statusFilter]);

  const typeOptions = [
    { value: '', label: 'ทุกประเภท' },
    { value: 'borrow', label: 'ยืม' },
    { value: 'lend', label: 'ให้ยืม' },
    { value: 'exchange', label: 'แลกเปลี่ยน' },
  ];

  const statusOptions = [
    { value: '', label: 'ทุกสถานะ' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'active', label: 'กำลังดำเนินการ' },
    { value: 'returned', label: 'คืนแล้ว' },
    { value: 'completed', label: 'เสร็จสิ้น' },
  ];

  const supplierOptions = [
    { value: '', label: 'เลือกบริษัท' },
    ...(suppliers?.map((s) => ({ value: s.id, label: s.name })) || []),
  ];

  const productOptions = [
    { value: '', label: 'เลือกสินค้า' },
    ...(products?.map((p) => ({ value: p.id, label: `${p.sku} - ${p.name}` })) || []),
  ];

  const inventoryOptions = [
    { value: '', label: 'เลือก Lot' },
    ...(inventory
      ?.filter((i) => i.available_quantity > 0)
      .map((i) => ({
        value: i.id,
        label: `${i.lot_number} (คงเหลือ: ${i.available_quantity})`,
      })) || []),
  ];

  const getTypeLabel = (type: ExchangeType) => {
    const labels: Record<ExchangeType, string> = {
      borrow: 'ยืม',
      lend: 'ให้ยืม',
      exchange: 'แลกเปลี่ยน',
    };
    return labels[type];
  };

  const getTypeIcon = (type: ExchangeType) => {
    if (type === 'borrow') return <ArrowDownLeft className="w-4 h-4" />;
    if (type === 'lend') return <ArrowUpRight className="w-4 h-4" />;
    return <ArrowLeftRight className="w-4 h-4" />;
  };

  const getStatusVariant = (status: ExchangeStatus) => {
    const variants: Record<ExchangeStatus, 'success' | 'warning' | 'info' | 'gray'> = {
      pending: 'warning',
      active: 'info',
      returned: 'success',
      completed: 'success',
    };
    return variants[status];
  };

  const getStatusLabel = (status: ExchangeStatus) => {
    const labels: Record<ExchangeStatus, string> = {
      pending: 'รอดำเนินการ',
      active: 'กำลังดำเนินการ',
      returned: 'คืนแล้ว',
      completed: 'เสร็จสิ้น',
    };
    return labels[status];
  };

  const generateReferenceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EX-${year}${month}-${random}`;
  };

  const handleCreateExchange = async () => {
    if (!formData.supplier_id || !formData.product_id || formData.quantity <= 0) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    try {
      const referenceNumber = generateReferenceNumber();

      const { error } = await supabase.from('exchanges').insert({
        reference_number: referenceNumber,
        type: formData.type,
        supplier_id: formData.supplier_id,
        product_id: formData.product_id,
        inventory_id: formData.inventory_id || null,
        quantity: formData.quantity,
        status: 'active',
        exchange_date: new Date().toISOString().split('T')[0],
        expected_return_date: formData.expected_return_date || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      // Update inventory if lending
      if (formData.type === 'lend' && formData.inventory_id) {
        await supabase.rpc('reserve_inventory', {
          p_inventory_id: formData.inventory_id,
          p_quantity: formData.quantity,
        });
      }

      toast.success('บันทึกรายการเรียบร้อย');
      mutate();
      setShowNewModal(false);
      setFormData({
        type: 'borrow',
        supplier_id: '',
        product_id: '',
        inventory_id: '',
        quantity: 1,
        expected_return_date: '',
        notes: '',
      });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedExchange) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('exchanges')
        .update({
          status: 'returned',
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', selectedExchange.id);

      if (error) throw error;

      // Update inventory if was lending
      if (selectedExchange.type === 'lend' && selectedExchange.inventory_id) {
        await supabase.rpc('release_inventory', {
          p_inventory_id: selectedExchange.inventory_id,
          p_quantity: selectedExchange.quantity,
        });
      }

      toast.success('บันทึกการคืนเรียบร้อย');
      mutate();
      setShowReturnModal(false);
      setSelectedExchange(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="ยืม-คืน/แลกเปลี่ยนกับบริษัท"
        subtitle="จัดการการยืม-คืนและแลกเปลี่ยนวัสดุกับบริษัท"
        actions={
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setShowNewModal(true)}
          >
            สร้างรายการใหม่
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ยืมอยู่</p>
                <p className="text-xl font-bold text-blue-600">
                  {exchanges?.filter(
                    (e) => e.type === 'borrow' && e.status === 'active'
                  ).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ให้ยืมอยู่</p>
                <p className="text-xl font-bold text-orange-600">
                  {exchanges?.filter(
                    (e) => e.type === 'lend' && e.status === 'active'
                  ).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">แลกเปลี่ยน</p>
                <p className="text-xl font-bold text-purple-600">
                  {exchanges?.filter(
                    (e) => e.type === 'exchange' && e.status === 'active'
                  ).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">คืนแล้ว</p>
                <p className="text-xl font-bold text-green-600">
                  {exchanges?.filter((e) => e.status === 'returned').length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาเลขอ้างอิง, บริษัท, สินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              options={typeOptions}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-36"
            />
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredExchanges.length === 0 ? (
            <div className="text-center py-12">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบรายการ</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขอ้างอิง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>บริษัท</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead>วันที่</TableHead>
                  <TableHead>กำหนดคืน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExchanges.map((exchange) => (
                  <TableRow key={exchange.id}>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {exchange.reference_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(exchange.type)}
                        <span>{getTypeLabel(exchange.type)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{exchange.supplier?.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{exchange.product?.name}</p>
                        <p className="text-xs text-gray-500">
                          {exchange.product?.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {exchange.quantity}
                    </TableCell>
                    <TableCell>
                      {formatDate(exchange.exchange_date)}
                    </TableCell>
                    <TableCell>
                      {exchange.expected_return_date ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(exchange.expected_return_date)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(exchange.status)}>
                        {getStatusLabel(exchange.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {exchange.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedExchange(exchange);
                            setShowReturnModal(true);
                          }}
                        >
                          บันทึกคืน
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* New Exchange Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="สร้างรายการยืม-คืน/แลกเปลี่ยน"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="ประเภท *"
            options={[
              { value: 'borrow', label: 'ยืมจากบริษัท' },
              { value: 'lend', label: 'ให้บริษัทยืม' },
              { value: 'exchange', label: 'แลกเปลี่ยน' },
            ]}
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value as ExchangeType })
            }
          />
          <Select
            label="บริษัท *"
            options={supplierOptions}
            value={formData.supplier_id}
            onChange={(e) =>
              setFormData({ ...formData, supplier_id: e.target.value })
            }
          />
          <Select
            label="สินค้า *"
            options={productOptions}
            value={formData.product_id}
            onChange={(e) =>
              setFormData({
                ...formData,
                product_id: e.target.value,
                inventory_id: '',
              })
            }
          />
          {formData.type === 'lend' && formData.product_id && (
            <Select
              label="เลือก Lot (สำหรับให้ยืม)"
              options={inventoryOptions}
              value={formData.inventory_id}
              onChange={(e) =>
                setFormData({ ...formData, inventory_id: e.target.value })
              }
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="จำนวน *"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: parseInt(e.target.value) })
              }
            />
            <Input
              label="กำหนดคืน"
              type="date"
              value={formData.expected_return_date}
              onChange={(e) =>
                setFormData({ ...formData, expected_return_date: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมายเหตุ
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowNewModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleCreateExchange} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setSelectedExchange(null);
        }}
        title="บันทึกการคืน"
      >
        {selectedExchange && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">เลขอ้างอิง</p>
              <p className="font-medium">{selectedExchange.reference_number}</p>
              <p className="text-sm text-gray-500 mt-2">สินค้า</p>
              <p className="font-medium">{selectedExchange.product?.name}</p>
              <p className="text-sm text-gray-500 mt-2">จำนวน</p>
              <p className="font-medium">{selectedExchange.quantity} ชิ้น</p>
            </div>
            <p className="text-gray-600">
              ยืนยันว่าได้รับ/คืนสินค้าเรียบร้อยแล้วใช่หรือไม่?
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowReturnModal(false);
              setSelectedExchange(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleReturn} isLoading={isSubmitting}>
            ยืนยันการคืน
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
