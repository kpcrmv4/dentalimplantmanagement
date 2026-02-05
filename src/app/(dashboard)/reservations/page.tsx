'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Calendar,
  Package,
  CheckCircle,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Modal, ModalFooter } from '@/components/ui';
import {
  DateRangePicker,
  ViewToggle,
  CasePreparationTable,
  CasePreparationTimeline,
  type ViewMode,
} from '@/components/preparation';
import { useCasePreparation } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { DateRangeFilter, CasePreparationItem, CaseReservation } from '@/types/database';
import { startOfWeek, endOfWeek, format } from 'date-fns';

export default function ReservationsPage() {
  // Default to this week
  const now = new Date();
  const defaultStart = startOfWeek(now, { weekStartsOn: 1 });
  const defaultEnd = endOfWeek(now, { weekStartsOn: 1 });

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({
    type: 'week',
    startDate: format(defaultStart, 'yyyy-MM-dd'),
    endDate: format(defaultEnd, 'yyyy-MM-dd'),
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedReservation, setSelectedReservation] = useState<CaseReservation | null>(null);
  const [selectedCase, setSelectedCase] = useState<CasePreparationItem | null>(null);
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showPrepareAllModal, setShowPrepareAllModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: cases, isLoading, mutate } = useCasePreparation(dateFilter);

  // Summary calculations
  const summary = useMemo(() => {
    if (!cases) return { total: 0, ready: 0, partial: 0, notStarted: 0, blocked: 0 };

    return cases.reduce(
      (acc, c) => {
        acc.total++;
        switch (c.preparation_status) {
          case 'ready':
            acc.ready++;
            break;
          case 'partial':
            acc.partial++;
            break;
          case 'not_started':
            acc.notStarted++;
            break;
          case 'blocked':
            acc.blocked++;
            break;
        }
        return acc;
      },
      { total: 0, ready: 0, partial: 0, notStarted: 0, blocked: 0 }
    );
  }, [cases]);

  const handlePrepareItem = async () => {
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

  const handlePrepareAll = async () => {
    if (!selectedCase) return;

    setIsUpdating(true);
    try {
      // Get all confirmed reservations for this case
      const confirmedReservations = selectedCase.reservations?.filter(
        (r) => r.status === 'confirmed' && !r.is_out_of_stock
      );

      if (!confirmedReservations || confirmedReservations.length === 0) {
        toast.error('ไม่มีรายการที่สามารถเตรียมได้');
        return;
      }

      const { error } = await supabase
        .from('case_reservations')
        .update({
          status: 'prepared',
          prepared_at: new Date().toISOString(),
        })
        .in(
          'id',
          confirmedReservations.map((r) => r.id)
        );

      if (error) throw error;

      toast.success(`เตรียมของ ${confirmedReservations.length} รายการเรียบร้อยแล้ว`);
      mutate();
      setShowPrepareAllModal(false);
      setSelectedCase(null);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
  };

  const openPrepareItemModal = (reservation: CaseReservation) => {
    setSelectedReservation(reservation);
    setShowPrepareModal(true);
  };

  const openPrepareAllModal = (caseItem: CasePreparationItem) => {
    setSelectedCase(caseItem);
    setShowPrepareAllModal(true);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="เตรียมวัสดุสำหรับเคส"
        subtitle="จัดเตรียมวัสดุและอุปกรณ์สำหรับเคสผ่าตัด"
        actions={
          <Link href="/reservations/new">
            <Button leftIcon={<Plus className="w-4 h-4" />}>จองวัสดุใหม่</Button>
          </Link>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">เคสทั้งหมด</p>
                <p className="text-xl font-bold text-blue-600">{summary.total}</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">พร้อมแล้ว</p>
                <p className="text-xl font-bold text-green-600">{summary.ready}</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">เตรียมบางส่วน</p>
                <p className="text-xl font-bold text-yellow-600">{summary.partial}</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ยังไม่เริ่ม</p>
                <p className="text-xl font-bold text-gray-600">{summary.notStarted}</p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ติดปัญหา</p>
                <p className="text-xl font-bold text-red-600">{summary.blocked}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>

        {/* Content */}
        {viewMode === 'table' ? (
          <CasePreparationTable
            cases={cases || []}
            onPrepareItem={openPrepareItemModal}
            onPrepareAll={openPrepareAllModal}
            isLoading={isLoading}
          />
        ) : (
          <CasePreparationTimeline
            cases={cases || []}
            onPrepareItem={openPrepareItemModal}
            onPrepareAll={openPrepareAllModal}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Prepare Single Item Modal */}
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
              {selectedReservation.inventory?.lot_number && (
                <>
                  <p className="text-sm text-gray-500 mt-2">Lot Number</p>
                  <p className="font-medium">{selectedReservation.inventory.lot_number}</p>
                </>
              )}
            </div>
            <p className="text-gray-600">
              คุณต้องการยืนยันว่าได้เตรียมของรายการนี้แล้วใช่หรือไม่?
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
          <Button variant="primary" onClick={handlePrepareItem} isLoading={isUpdating}>
            ยืนยันเตรียมของ
          </Button>
        </ModalFooter>
      </Modal>

      {/* Prepare All Items Modal */}
      <Modal
        isOpen={showPrepareAllModal}
        onClose={() => {
          setShowPrepareAllModal(false);
          setSelectedCase(null);
        }}
        title="เตรียมของทั้งหมด"
      >
        {selectedCase && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">เคส</p>
              <p className="font-medium">{selectedCase.case_number}</p>
              <p className="text-sm text-gray-500 mt-2">คนไข้</p>
              <p className="font-medium">{selectedCase.patient_name}</p>
              <p className="text-sm text-gray-500 mt-2">รายการที่จะเตรียม</p>
              <p className="font-medium">
                {selectedCase.reservations?.filter(
                  (r) => r.status === 'confirmed' && !r.is_out_of_stock
                ).length || 0}{' '}
                รายการ
              </p>
            </div>
            <p className="text-gray-600">
              คุณต้องการเตรียมของทั้งหมดสำหรับเคสนี้ใช่หรือไม่?
            </p>
          </div>
        )}
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowPrepareAllModal(false);
              setSelectedCase(null);
            }}
          >
            ยกเลิก
          </Button>
          <Button variant="primary" onClick={handlePrepareAll} isLoading={isUpdating}>
            เตรียมทั้งหมด
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
