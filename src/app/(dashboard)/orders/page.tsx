'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ShoppingCart,
  Calendar,
  Building2,
  Eye,
  CheckCircle,
  XCircle,
  Truck,
  Package,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Input, Select, Badge, Modal, ModalFooter, LoadingSpinner } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useOrders } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency, getOrderStatusText } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { triggerSupplierPO } from '@/lib/notification-triggers';
import toast from 'react-hot-toast';
import { getOrderStatusVariant } from '@/lib/status';

export default function OrdersPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = user?.role === 'admin';
  const canCreateOrder = user?.role === 'admin' || user?.role === 'stock_staff';

  const { data: orders, isLoading, mutate } = useOrders();

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      const matchesSearch =
        !search ||
        order.po_number?.toLowerCase().includes(search.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const statusOptions = [
    { value: '', label: 'ทุกสถานะ' },
    { value: 'draft', label: 'ร่าง' },
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'ordered', label: 'สั่งซื้อแล้ว' },
    { value: 'shipped', label: 'กำลังจัดส่ง' },
    { value: 'received', label: 'รับของแล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  const handleApprove = async () => {
    if (!selectedOrder) return;

    // Role check: only admin can approve
    if (!isAdmin) {
      toast.error('เฉพาะแอดมินเท่านั้นที่สามารถอนุมัติใบสั่งซื้อได้');
      return;
    }

    // Separation of duties: creator cannot be the approver
    if (selectedOrder.created_by && selectedOrder.created_by === user?.id) {
      toast.error('ไม่สามารถอนุมัติใบสั่งซื้อที่ตัวเองเป็นผู้สร้างได้');
      return;
    }

    setIsUpdating(true);
    try {
      // Generate 5-character random access code for supplier
      const accessCode = Math.random().toString(36).substring(2, 7).toUpperCase();

      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
          supplier_access_code: accessCode,
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Update case traffic light: Red → Yellow for cases with out-of-stock items being ordered
      const productIds = (selectedOrder.items || []).map((item: any) => item.product_id);
      if (productIds.length > 0) {
        // Find cases with red status that have out-of-stock reservations for these products
        const { data: affectedReservations } = await supabase
          .from('case_reservations')
          .select('case_id')
          .in('product_id', productIds)
          .eq('is_out_of_stock', true)
          .eq('status', 'pending');

        if (affectedReservations && affectedReservations.length > 0) {
          const caseIds = [...new Set(affectedReservations.map((r) => r.case_id))];

          // Update cases from red to yellow (materials on order)
          await supabase
            .from('cases')
            .update({ status: 'yellow' })
            .in('id', caseIds)
            .eq('status', 'red');
        }
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'PO_APPROVED',
        entity_type: 'purchase_orders',
        entity_id: selectedOrder.id,
        details: {
          po_number: selectedOrder.po_number,
          supplier: selectedOrder.supplier?.name,
          total_amount: selectedOrder.total_amount,
          items_count: selectedOrder.items?.length,
          approved_by_name: user?.full_name,
          access_code_generated: true,
        },
      });

      // Notify supplier via LINE with public link and access code (after approval)
      triggerSupplierPO({
        orderId: selectedOrder.id,
        poNumber: selectedOrder.po_number,
        supplierId: selectedOrder.supplier_id,
        totalAmount: selectedOrder.total_amount,
        accessCode,
      }).catch((err) => console.error('Failed to notify supplier:', err));

      toast.success('อนุมัติใบสั่งซื้อเรียบร้อย');
      mutate();
      setShowApproveModal(false);
      setSelectedOrder(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0],
          received_at: new Date().toISOString(),
          received_by: user?.id,
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Add items to inventory and track inventory IDs for reservation linking
      const productInventoryMap: Record<string, string> = {};

      for (const item of selectedOrder.items || []) {
        const { data: newInventory } = await supabase.from('inventory').insert({
          product_id: item.product_id,
          lot_number: item.lot_number || `LOT-${Date.now()}`,
          expiry_date: item.expiry_date,
          quantity: item.quantity,
          reserved_quantity: 0,
          available_quantity: item.quantity,
          received_date: new Date().toISOString().split('T')[0],
          unit_cost: item.unit_cost,
          supplier_id: selectedOrder.supplier_id,
        }).select().single();

        if (newInventory) {
          productInventoryMap[item.product_id] = newInventory.id;
        }
      }

      // Update out-of-stock reservations for these products
      const productIds = (selectedOrder.items || []).map((item: any) => item.product_id);
      if (productIds.length > 0) {
        // Find out-of-stock reservations for these products
        const { data: outOfStockReservations } = await supabase
          .from('case_reservations')
          .select('id, case_id, product_id, quantity')
          .in('product_id', productIds)
          .eq('is_out_of_stock', true)
          .in('status', ['pending', 'confirmed']);

        // Link reservations to the new inventory
        for (const reservation of outOfStockReservations || []) {
          const inventoryId = productInventoryMap[reservation.product_id];
          if (inventoryId) {
            await supabase
              .from('case_reservations')
              .update({
                inventory_id: inventoryId,
                is_out_of_stock: false,
                status: 'confirmed',
              })
              .eq('id', reservation.id);

            // Reserve the quantity in inventory
            const { data: inv } = await supabase
              .from('inventory')
              .select('reserved_quantity, available_quantity')
              .eq('id', inventoryId)
              .single();

            if (inv) {
              await supabase
                .from('inventory')
                .update({
                  reserved_quantity: inv.reserved_quantity + reservation.quantity,
                  available_quantity: Math.max(0, inv.available_quantity - reservation.quantity),
                })
                .eq('id', inventoryId);
            }
          }
        }

        // Update case traffic light: Yellow → Green for cases where all materials are now available
        if (outOfStockReservations && outOfStockReservations.length > 0) {
          const caseIds = [...new Set(outOfStockReservations.map((r) => r.case_id))];

          // For each case, check if all reservations are now fulfilled
          for (const caseId of caseIds) {
            const { data: caseReservations } = await supabase
              .from('case_reservations')
              .select('id, status, is_out_of_stock')
              .eq('case_id', caseId)
              .not('status', 'eq', 'cancelled');

            const hasOutOfStock = caseReservations?.some((r) => r.is_out_of_stock);
            const allConfirmedOrBetter = caseReservations?.every(
              (r) => r.status === 'confirmed' || r.status === 'prepared' || r.status === 'used'
            );

            if (!hasOutOfStock && allConfirmedOrBetter) {
              // All materials available - update to green
              await supabase
                .from('cases')
                .update({ status: 'green' })
                .eq('id', caseId)
                .in('status', ['yellow', 'red']);
            }
          }
        }
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'PO_RECEIVED',
        entity_type: 'purchase_orders',
        entity_id: selectedOrder.id,
        details: {
          po_number: selectedOrder.po_number,
          supplier: selectedOrder.supplier?.name,
          items_count: selectedOrder.items?.length,
          linked_reservations: productIds.length,
          received_by_name: user?.full_name,
        },
      });

      toast.success('รับของเข้าสต็อกเรียบร้อย');
      mutate();
      setShowReceiveModal(false);
      setSelectedOrder(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="ใบสั่งซื้อ"
        subtitle="จัดการใบสั่งซื้อและติดตามการจัดส่ง"
        actions={
          canCreateOrder ? (
            <Link href="/orders/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                สร้างใบสั่งซื้อ
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">รออนุมัติ</p>
                <p className="text-xl font-bold text-yellow-600">
                  {orders?.filter((o) => o.status === 'pending').length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">อนุมัติแล้ว</p>
                <p className="text-xl font-bold text-blue-600">
                  {orders?.filter((o) => o.status === 'approved').length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">กำลังจัดส่ง</p>
                <p className="text-xl font-bold text-purple-600">
                  {orders?.filter((o) => o.status === 'shipped').length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">รับของแล้ว</p>
                <p className="text-xl font-bold text-green-600">
                  {orders?.filter((o) => o.status === 'received').length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          {/* Filters */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาเลขใบสั่งซื้อ, ซัพพลายเออร์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingSpinner onRetry={() => mutate()} />
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบใบสั่งซื้อ</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขใบสั่งซื้อ</TableHead>
                  <TableHead>ซัพพลายเออร์</TableHead>
                  <TableHead>วันที่สั่ง</TableHead>
                  <TableHead>กำหนดส่ง</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {order.po_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span>{order.supplier?.name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.order_date ? formatDate(order.order_date) : '-'}
                    </TableCell>
                    <TableCell>
                      {order.expected_delivery_date
                        ? formatDate(order.expected_delivery_date)
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getOrderStatusVariant(order.status)}>
                        {getOrderStatusText(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'pending' && isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowApproveModal(true);
                            }}
                          >
                            อนุมัติ
                          </Button>
                        )}
                        {(order.status === 'ordered' ||
                          order.status === 'shipped') && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowReceiveModal(true);
                            }}
                          >
                            รับของ
                          </Button>
                        )}
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setSelectedOrder(null);
        }}
        title="ยืนยันอนุมัติใบสั่งซื้อ"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">เลขใบสั่งซื้อ</p>
              <p className="font-medium">{selectedOrder.po_number}</p>
              <p className="text-sm text-gray-500 mt-2">ซัพพลายเออร์</p>
              <p className="font-medium">{selectedOrder.supplier?.name}</p>
              <p className="text-sm text-gray-500 mt-2">ยอดรวม</p>
              <p className="font-medium text-lg">
                {formatCurrency(selectedOrder.total_amount)}
              </p>
            </div>
            <p className="text-gray-600">
              คุณต้องการอนุมัติใบสั่งซื้อนี้ใช่หรือไม่?
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowApproveModal(false);
              setSelectedOrder(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handleApprove}
            isLoading={isUpdating}
          >
            อนุมัติ
          </Button>
        </ModalFooter>
      </Modal>

      {/* Receive Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => {
          setShowReceiveModal(false);
          setSelectedOrder(null);
        }}
        title="ยืนยันรับของ"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">เลขใบสั่งซื้อ</p>
              <p className="font-medium">{selectedOrder.po_number}</p>
              <p className="text-sm text-gray-500 mt-2">รายการสินค้า</p>
              <ul className="mt-1 space-y-1">
                {selectedOrder.items?.map((item: any, idx: number) => (
                  <li key={idx} className="text-sm">
                    • {item.product?.name} x {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-gray-600">
              ยืนยันว่าได้รับสินค้าครบถ้วนแล้ว? สินค้าจะถูกเพิ่มเข้าสต็อกอัตโนมัติ
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowReceiveModal(false);
              setSelectedOrder(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handleReceive}
            isLoading={isUpdating}
          >
            ยืนยันรับของ
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
