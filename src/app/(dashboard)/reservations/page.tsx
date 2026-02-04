'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  ClipboardList,
  Package,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Eye,
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
import { useCases } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import {
  formatDate,
  getCaseStatusText,
  getReservationStatusText,
} from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ReservationStatus } from '@/types/database';

export default function ReservationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: cases, isLoading, mutate } = useCases();

  // Flatten reservations from all cases
  const allReservations = useMemo(() => {
    if (!cases) return [];

    return cases.flatMap((c) =>
      (c.reservations || []).map((r) => ({
        ...r,
        case: c,
      }))
    );
  }, [cases]);

  const filteredReservations = useMemo(() => {
    return allReservations.filter((r) => {
      const matchesSearch =
        !search ||
        r.case?.case_number?.toLowerCase().includes(search.toLowerCase()) ||
        r.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.product?.sku?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || r.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [allReservations, search, statusFilter]);

  const statusOptions = [
    { value: '', label: 'ทุกสถานะ' },
    { value: 'pending', label: 'รอดำเนินการ' },
    { value: 'confirmed', label: 'ยืนยันแล้ว' },
    { value: 'prepared', label: 'เตรียมของแล้ว' },
    { value: 'used', label: 'ใช้แล้ว' },
    { value: 'cancelled', label: 'ยกเลิก' },
  ];

  const getStatusVariant = (status: ReservationStatus) => {
    const variants: Record<ReservationStatus, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      prepared: 'success',
      used: 'success',
      cancelled: 'gray',
    };
    return variants[status];
  };

  const handlePrepare = async () => {
    if (!selectedReservation) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('case_reservations')
        .update({
          status: 'prepared',
          prepared_at: new Date().toISOString(),
        })
        .eq('id', selectedReservation.id);

      if (error) throw error;

      toast.success('เตรียมของเรียบร้อยแล้ว');
      mutate();
      setShowPrepareModal(false);
      setSelectedReservation(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkUsed = async (reservation: any) => {
    try {
      const { error } = await supabase
        .from('case_reservations')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          used_quantity: reservation.quantity,
        })
        .eq('id', reservation.id);

      if (error) throw error;

      // Deduct from inventory
      await supabase.rpc('use_inventory', {
        p_inventory_id: reservation.inventory_id,
        p_quantity: reservation.quantity,
      });

      toast.success('บันทึกการใช้งานเรียบร้อย');
      mutate();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="การจองของสำหรับเคส"
        subtitle="จัดการการจองวัสดุสำหรับเคสผ่าตัด"
        actions={
          <Link href="/reservations/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              จองวัสดุใหม่
            </Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">รอดำเนินการ</p>
                <p className="text-xl font-bold text-yellow-600">
                  {allReservations.filter((r) => r.status === 'pending').length}
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
                <p className="text-sm text-gray-500">ยืนยันแล้ว</p>
                <p className="text-xl font-bold text-blue-600">
                  {allReservations.filter((r) => r.status === 'confirmed').length}
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
                <p className="text-sm text-gray-500">เตรียมของแล้ว</p>
                <p className="text-xl font-bold text-green-600">
                  {allReservations.filter((r) => r.status === 'prepared').length}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ใช้แล้ว</p>
                <p className="text-xl font-bold text-gray-600">
                  {allReservations.filter((r) => r.status === 'used').length}
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
                placeholder="ค้นหาเคส, สินค้า..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
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
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบรายการจอง</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เคส</TableHead>
                  <TableHead>วันผ่าตัด</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead className="text-center">จำนวน</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <Link
                        href={`/cases/${reservation.case?.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {reservation.case?.case_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(reservation.case?.surgery_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{reservation.product?.name}</p>
                        <p className="text-xs text-gray-500">
                          {reservation.product?.sku}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {reservation.inventory?.lot_number || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {reservation.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(reservation.status)}>
                        {getReservationStatusText(reservation.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {reservation.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setShowPrepareModal(true);
                            }}
                          >
                            เตรียมของ
                          </Button>
                        )}
                        {reservation.status === 'prepared' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkUsed(reservation)}
                          >
                            ใช้แล้ว
                          </Button>
                        )}
                        <Link href={`/cases/${reservation.case?.id}`}>
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

      {/* Prepare Modal */}
      <Modal
        isOpen={showPrepareModal}
        onClose={() => {
          setShowPrepareModal(false);
          setSelectedReservation(null);
        }}
        title="ยืนยันการเตรียมของ"
      >
        {selectedReservation && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">สินค้า</p>
              <p className="font-medium">{selectedReservation.product?.name}</p>
              <p className="text-sm text-gray-500 mt-2">จำนวน</p>
              <p className="font-medium">{selectedReservation.quantity} ชิ้น</p>
              <p className="text-sm text-gray-500 mt-2">Lot Number</p>
              <p className="font-medium">
                {selectedReservation.inventory?.lot_number || '-'}
              </p>
            </div>
            <p className="text-gray-600">
              คุณต้องการยืนยันว่าได้เตรียมของสำหรับเคส{' '}
              {selectedReservation.case?.case_number} แล้วใช่หรือไม่?
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowPrepareModal(false);
              setSelectedReservation(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handlePrepare}
            isLoading={isUpdating}
          >
            ยืนยันเตรียมของ
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
