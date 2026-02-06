'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Package,
  Plus,
  XCircle,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Modal, ModalFooter } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useCase } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  formatDate,
  formatTime,
  getCaseStatusText,
} from '@/lib/utils';
import toast from 'react-hot-toast';
import type { ReservationStatus } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';
import { ReservationModal } from '@/components/reservations/ReservationModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const { data: caseData, isLoading, mutate } = useCase(id);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const isDentist = user?.role === 'dentist';
  const searchParams = useSearchParams();

  // Auto-open reservation modal when navigating with ?reserve=true
  useEffect(() => {
    if (searchParams.get('reserve') === 'true' && isDentist && caseData && !['completed', 'cancelled'].includes(caseData.status)) {
      setShowReservationModal(true);
    }
  }, [searchParams, isDentist, caseData]);

  const getReservationDisplay = (status: ReservationStatus, isOutOfStock: boolean) => {
    if (isOutOfStock && status === 'pending') {
      return { variant: 'danger' as const, text: 'รอสั่งซื้อ' };
    }
    if (isOutOfStock && status === 'confirmed') {
      return { variant: 'warning' as const, text: 'กำลังสั่งซื้อ' };
    }

    const configs: Record<ReservationStatus, { variant: 'success' | 'warning' | 'danger' | 'gray' | 'info'; text: string }> = {
      pending: { variant: 'warning', text: 'รอดำเนินการ' },
      confirmed: { variant: 'info', text: 'ยืนยันแล้ว' },
      prepared: { variant: 'success', text: 'เตรียมของแล้ว' },
      used: { variant: 'success', text: 'ใช้แล้ว' },
      cancelled: { variant: 'gray', text: 'ยกเลิก' },
    };
    return configs[status];
  };

  const handleCancelCase = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('ยกเลิกเคสเรียบร้อย');
      mutate();
      setShowCancelModal(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่พบข้อมูลเคส</p>
          <Link href="/cases">
            <Button variant="outline">กลับไปหน้ารายการเคส</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEditable = !['completed', 'cancelled'].includes(caseData.status);

  return (
    <div className="min-h-screen">
      <Header
        title={`เคส ${caseData.case_number}`}
        subtitle={caseData.procedure_type || 'Implant Surgery'}
        actions={
          isEditable ? (
            <Link href={`/cases/${id}/edit`}>
              <Button variant="outline" leftIcon={<Edit className="w-4 h-4" />}>
                แก้ไข
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 pb-24">
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการเคส
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* On mobile: Patient + Dentist info as a compact 2-column card */}
            <div className="lg:hidden">
              <Card>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Patient */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">คนไข้</span>
                      </div>
                      {caseData.patient ? (
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {caseData.patient.first_name} {caseData.patient.last_name}
                          </p>
                          <p className="text-xs text-gray-500">HN: {caseData.patient.hn_number}</p>
                          {caseData.patient.phone && (
                            <p className="text-xs text-gray-500">{caseData.patient.phone}</p>
                          )}
                          <Link
                            href={`/patients/${caseData.patient.id}`}
                            className="text-xs text-blue-600 hover:text-blue-700 inline-block mt-1"
                          >
                            ดูเพิ่มเติม →
                          </Link>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">ไม่มีข้อมูล</p>
                      )}
                    </div>
                    {/* Dentist + Assistant */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">ทีมผ่าตัด</span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {caseData.dentist?.full_name || 'ไม่ระบุ'}
                        </p>
                        {caseData.assistant && (
                          <p className="text-xs text-gray-500">ผู้ช่วย: {caseData.assistant.full_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Case Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลเคส</CardTitle>
                <Badge variant={getCaseStatusVariant(caseData.status)} size="lg" dot>
                  {getCaseStatusText(caseData.status)}
                </Badge>
              </CardHeader>
              <CardContent>
                {/* 2-column grid on all screen sizes for short info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">วันผ่าตัด</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-sm">
                        {formatDate(caseData.surgery_date)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">เวลา</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-sm">
                        {caseData.surgery_time
                          ? formatTime(caseData.surgery_time)
                          : 'ไม่ระบุ'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">ระยะเวลา</p>
                    <span className="font-medium text-sm">
                      {caseData.estimated_duration} นาที
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">ประเภทการรักษา</p>
                    <span className="font-medium text-sm">
                      {caseData.procedure_type || 'ไม่ระบุ'}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">ตำแหน่งฟัน</p>
                    <div className="flex flex-wrap gap-1">
                      {caseData.tooth_positions?.map((pos, idx) => (
                        <Badge key={idx} variant="gray" size="sm">
                          {pos}
                        </Badge>
                      )) || <span className="text-gray-400 text-sm">ไม่ระบุ</span>}
                    </div>
                  </div>
                  {caseData.is_emergency && (
                    <div>
                      <Badge variant="danger" size="lg">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        เคสฉุกเฉิน
                      </Badge>
                    </div>
                  )}
                </div>

                {caseData.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs sm:text-sm text-gray-500 mb-1">หมายเหตุ</p>
                    <p className="text-sm text-gray-700">{caseData.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reservations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  <span>วัสดุที่จอง</span>
                  {caseData.reservations && caseData.reservations.length > 0 && (
                    <span className="text-sm font-normal text-gray-400">({caseData.reservations.length})</span>
                  )}
                </CardTitle>
                {isEditable && (
                  isDentist ? (
                    <Button
                      size="sm"
                      leftIcon={<ShoppingCart className="w-4 h-4" />}
                      onClick={() => setShowReservationModal(true)}
                    >
                      จองวัสดุ
                    </Button>
                  ) : (
                    <Link href={`/reservations/new?case_id=${id}`}>
                      <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                        เพิ่มการจอง
                      </Button>
                    </Link>
                  )
                )}
              </CardHeader>
              <CardContent>
                {caseData.reservations && caseData.reservations.length > 0 ? (
                  <>
                    {/* Desktop: Table */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>รหัสสินค้า</TableHead>
                            <TableHead>ชื่อสินค้า</TableHead>
                            <TableHead>Lot</TableHead>
                            <TableHead className="text-center">จำนวน</TableHead>
                            <TableHead>สถานะ</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {caseData.reservations.map((res) => {
                            const display = getReservationDisplay(res.status, res.is_out_of_stock);
                            return (
                              <TableRow key={res.id}>
                                <TableCell className="font-medium">
                                  {res.product?.sku}
                                </TableCell>
                                <TableCell>{res.product?.name}</TableCell>
                                <TableCell>{res.inventory?.lot_number || '-'}</TableCell>
                                <TableCell className="text-center">
                                  {res.quantity}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={display.variant}>
                                    {display.text}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile: Card-based list */}
                    <div className="sm:hidden space-y-2">
                      {caseData.reservations.map((res) => {
                        const display = getReservationDisplay(res.status, res.is_out_of_stock);
                        return (
                          <div key={res.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="font-medium text-sm leading-tight flex-1">{res.product?.name}</p>
                              <Badge variant={display.variant} size="sm">
                                {display.text}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                              <div>
                                <span className="text-gray-400">SKU: </span>
                                <span className="font-mono">{res.product?.sku || '-'}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Lot: </span>
                                <span>{res.inventory?.lot_number || '-'}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-400">จำนวน: </span>
                                <span className="font-semibold text-gray-700">{res.quantity}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">ยังไม่มีการจองวัสดุ</p>
                    {isEditable && (
                      isDentist ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          leftIcon={<ShoppingCart className="w-4 h-4" />}
                          onClick={() => setShowReservationModal(true)}
                        >
                          จองวัสดุ
                        </Button>
                      ) : (
                        <Link href={`/reservations/new?case_id=${id}`}>
                          <Button variant="outline" size="sm" className="mt-3">
                            เพิ่มการจองวัสดุ
                          </Button>
                        </Link>
                      )
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancel action on mobile - inline instead of sidebar */}
            {isEditable && (
              <div className="lg:hidden">
                <Button
                  variant="danger"
                  className="w-full"
                  leftIcon={<XCircle className="w-4 h-4" />}
                  onClick={() => setShowCancelModal(true)}
                >
                  ยกเลิกเคส
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar - desktop only */}
          <div className="hidden lg:block space-y-6">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  ข้อมูลคนไข้
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caseData.patient ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">HN</p>
                      <p className="font-medium">{caseData.patient.hn_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">ชื่อ-นามสกุล</p>
                      <p className="font-medium">
                        {caseData.patient.first_name} {caseData.patient.last_name}
                      </p>
                    </div>
                    {caseData.patient.phone && (
                      <div>
                        <p className="text-sm text-gray-500">เบอร์โทร</p>
                        <p className="font-medium">{caseData.patient.phone}</p>
                      </div>
                    )}
                    <Link
                      href={`/patients/${caseData.patient.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      ดูข้อมูลเพิ่มเติม →
                    </Link>
                  </div>
                ) : (
                  <p className="text-gray-500">ไม่มีข้อมูลคนไข้</p>
                )}
              </CardContent>
            </Card>

            {/* Dentist Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  ทีมผ่าตัด
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">ทันตแพทย์</p>
                    <p className="font-medium">
                      {caseData.dentist?.full_name || 'ไม่ระบุ'}
                    </p>
                  </div>
                  {caseData.assistant && (
                    <div>
                      <p className="text-sm text-gray-500">ผู้ช่วย</p>
                      <p className="font-medium">{caseData.assistant.full_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {isEditable && (
              <Card>
                <CardContent>
                  <Button
                    variant="danger"
                    className="w-full"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => setShowCancelModal(true)}
                  >
                    ยกเลิกเคส
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="ยืนยันยกเลิกเคส"
      >
        <p className="text-gray-600">
          คุณต้องการยกเลิกเคส {caseData.case_number} ใช่หรือไม่?
          การดำเนินการนี้จะปลดล็อควัสดุที่จองไว้ทั้งหมด
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCancelModal(false)}>
            ไม่ยกเลิก
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelCase}
            isLoading={isUpdating}
          >
            ยืนยันยกเลิก
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reservation Modal for Dentists */}
      <ReservationModal
        isOpen={showReservationModal}
        onClose={() => setShowReservationModal(false)}
        caseId={id}
        caseNumber={caseData.case_number}
        procedureType={caseData.procedure_type}
        surgeryDate={caseData.surgery_date}
        patientName={
          caseData.patient
            ? `${caseData.patient.first_name} ${caseData.patient.last_name}`
            : 'ไม่ระบุ'
        }
        onSuccess={() => mutate()}
      />
    </div>
  );
}
