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
  Phone,
  PhoneCall,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent, Modal, ModalFooter, Select, ConfirmModal } from '@/components/ui';
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
import { triggerReservationCancelled } from '@/lib/notification-triggers';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const { data: caseData, isLoading, mutate } = useCase(id);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState('');
  const [confirmationNote, setConfirmationNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingConfirmation, setIsSavingConfirmation] = useState(false);
  const [showDeleteReservationConfirm, setShowDeleteReservationConfirm] = useState(false);
  const [pendingDeleteRes, setPendingDeleteRes] = useState<any>(null);
  const [isDeletingReservation, setIsDeletingReservation] = useState(false);

  const isDentist = user?.role === 'dentist';
  const canEditCase = user?.role === 'admin' || user?.role === 'dentist' || user?.role === 'cs';
  const canCancelCase = user?.role === 'admin' || user?.role === 'dentist' || user?.role === 'cs';
  const canAddReservation = user?.role === 'admin' || user?.role === 'dentist';
  const canConfirmPhone = user?.role === 'admin' || user?.role === 'cs' || user?.role === 'assistant';
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

  const handlePhoneConfirmation = async () => {
    if (!confirmationStatus) return;
    setIsSavingConfirmation(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          confirmation_status: confirmationStatus,
          confirmation_date: new Date().toISOString(),
          confirmation_note: confirmationNote || null,
          confirmed_by: user?.id,
        })
        .eq('id', id);

      if (error) throw error;

      // Insert audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        user_name: user?.full_name,
        user_role: user?.role,
        action: 'PHONE_CONFIRMATION',
        table_name: 'cases',
        record_id: id,
        new_data: {
          confirmation_status: confirmationStatus,
          confirmation_note: confirmationNote || null,
        },
        description: `โทรยืนยันคนไข้: ${
          confirmationStatus === 'confirmed' ? 'ยืนยันแล้ว'
          : confirmationStatus === 'postponed' ? 'ขอเลื่อนนัด'
          : 'ยกเลิก'
        }${confirmationNote ? ` - ${confirmationNote}` : ''}`,
      });

      toast.success('บันทึกผลการโทรยืนยันเรียบร้อย');
      mutate();
      setShowConfirmationModal(false);
      setConfirmationStatus('');
      setConfirmationNote('');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSavingConfirmation(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!pendingDeleteRes) return;
    setIsDeletingReservation(true);

    try {
      // Delete the reservation
      const { error: deleteError } = await supabase
        .from('case_reservations')
        .delete()
        .eq('id', pendingDeleteRes.id);

      if (deleteError) throw deleteError;

      // If reservation was prepared, notify stock staff to return material
      if (pendingDeleteRes.status === 'prepared') {
        try {
          await triggerReservationCancelled({
            caseId: id,
            caseNumber: caseData!.case_number,
            productName: pendingDeleteRes.product?.name || 'ไม่ระบุ',
            quantity: pendingDeleteRes.quantity,
            lotNumber: pendingDeleteRes.inventory?.lot_number,
            dentistName: user?.full_name || 'ทันตแพทย์',
          });
        } catch (notifError) {
          console.error('Error sending cancellation notification:', notifError);
        }
      }

      // Recalculate case status based on remaining reservations
      const remainingReservations = (caseData?.reservations || []).filter(
        (r) => r.id !== pendingDeleteRes.id && r.status !== 'cancelled'
      );

      if (caseData && !['completed', 'cancelled'].includes(caseData.status)) {
        let newStatus = caseData.status;
        if (remainingReservations.length === 0) {
          newStatus = 'gray';
        } else {
          const hasOOS = remainingReservations.some((r) => r.is_out_of_stock);
          newStatus = hasOOS ? 'red' : 'green';
        }

        if (newStatus !== caseData.status) {
          await supabase
            .from('cases')
            .update({ status: newStatus })
            .eq('id', id);
        }
      }

      toast.success('ลบรายการจองเรียบร้อย');
      mutate();
      setShowDeleteReservationConfirm(false);
      setPendingDeleteRes(null);
    } catch (error) {
      console.error('Error deleting reservation:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsDeletingReservation(false);
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
          isEditable && canEditCase ? (
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

            {/* Phone Confirmation Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span>ยืนยันการนัดหมาย</span>
                </CardTitle>
                {isEditable && canConfirmPhone && (
                  <Button
                    size="sm"
                    variant={!caseData.confirmation_status || caseData.confirmation_status === 'pending' ? 'primary' : 'outline'}
                    leftIcon={<PhoneCall className="w-4 h-4" />}
                    onClick={() => {
                      setConfirmationStatus(
                        caseData.confirmation_status && caseData.confirmation_status !== 'pending'
                          ? caseData.confirmation_status
                          : ''
                      );
                      setConfirmationNote(caseData.confirmation_note || '');
                      setShowConfirmationModal(true);
                    }}
                  >
                    <span className="hidden sm:inline">
                      {!caseData.confirmation_status || caseData.confirmation_status === 'pending' ? 'บันทึกผลโทร' : 'แก้ไขผลโทร'}
                    </span>
                    <span className="sm:hidden">
                      {!caseData.confirmation_status || caseData.confirmation_status === 'pending' ? 'บันทึก' : 'แก้ไข'}
                    </span>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {caseData.confirmation_status && caseData.confirmation_status !== 'pending' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">สถานะ:</span>
                      <Badge
                        variant={
                          caseData.confirmation_status === 'confirmed' ? 'success'
                          : caseData.confirmation_status === 'postponed' ? 'warning'
                          : 'danger'
                        }
                        size="lg"
                        dot
                      >
                        {caseData.confirmation_status === 'confirmed' ? 'ยืนยันแล้ว'
                        : caseData.confirmation_status === 'postponed' ? 'ขอเลื่อนนัด'
                        : 'ยกเลิก'}
                      </Badge>
                    </div>
                    {caseData.confirmation_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">วันที่โทร:</span>
                        <span className="font-medium">{formatDate(caseData.confirmation_date)}</span>
                      </div>
                    )}
                    {caseData.confirmation_note && (
                      <div className="text-sm">
                        <span className="text-gray-500">หมายเหตุ: </span>
                        <span className="text-gray-700">{caseData.confirmation_note}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Phone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">ยังไม่ได้โทรยืนยัน</p>
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
                {isEditable && canAddReservation && (
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
                            {isEditable && canAddReservation && (
                              <TableHead className="text-center w-16"></TableHead>
                            )}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {caseData.reservations.map((res) => {
                            const display = getReservationDisplay(res.status, res.is_out_of_stock);
                            const canDelete = isEditable && canAddReservation && res.status !== 'used';
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
                                {isEditable && canAddReservation && (
                                  <TableCell className="text-center">
                                    {canDelete && (
                                      <button
                                        onClick={() => {
                                          setPendingDeleteRes(res);
                                          setShowDeleteReservationConfirm(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="ลบรายการจอง"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </TableCell>
                                )}
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
                        const canDelete = isEditable && canAddReservation && res.status !== 'used';
                        return (
                          <div key={res.id} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <p className="font-medium text-sm leading-tight flex-1">{res.product?.name}</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant={display.variant} size="sm">
                                  {display.text}
                                </Badge>
                                {canDelete && (
                                  <button
                                    onClick={() => {
                                      setPendingDeleteRes(res);
                                      setShowDeleteReservationConfirm(true);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
                    {isEditable && canAddReservation && (
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
            {isEditable && canCancelCase && (
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
            {isEditable && canCancelCase && (
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

      {/* Phone Confirmation Modal */}
      <Modal
        isOpen={showConfirmationModal}
        onClose={() => setShowConfirmationModal(false)}
        title="บันทึกผลการโทรยืนยัน"
      >
        <p className="text-sm text-gray-500 mb-4">
          เคส {caseData.case_number} — {caseData.patient ? `${caseData.patient.first_name} ${caseData.patient.last_name}` : ''}
          {caseData.patient?.phone && (
            <span className="ml-2 font-mono">({caseData.patient.phone})</span>
          )}
        </p>
        <div className="space-y-4">
          <Select
            label="ผลการโทร"
            value={confirmationStatus}
            onChange={(e) => setConfirmationStatus(e.target.value)}
            options={[
              { value: '', label: 'เลือกผลการโทร', disabled: true },
              { value: 'confirmed', label: 'ยืนยัน — คนไข้มาตามนัด' },
              { value: 'postponed', label: 'เลื่อนนัด — คนไข้ขอเลื่อน' },
              { value: 'cancelled', label: 'ยกเลิก — คนไข้ไม่มา' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมายเหตุ / เหตุผล
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-colors duration-200"
              rows={3}
              value={confirmationNote}
              onChange={(e) => setConfirmationNote(e.target.value)}
              placeholder={
                confirmationStatus === 'postponed' ? 'ระบุวันที่ต้องการเลื่อนไป หรือเหตุผล...'
                : confirmationStatus === 'cancelled' ? 'ระบุเหตุผลที่ยกเลิก...'
                : 'หมายเหตุเพิ่มเติม (ถ้ามี)...'
              }
            />
          </div>
          {confirmationStatus === 'postponed' && !confirmationNote && (
            <p className="text-sm text-orange-600">* กรุณาระบุเหตุผลหรือวันที่ต้องการเลื่อน</p>
          )}
          {confirmationStatus === 'cancelled' && !confirmationNote && (
            <p className="text-sm text-red-600">* กรุณาระบุเหตุผลที่ยกเลิก</p>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowConfirmationModal(false)}>
            ปิด
          </Button>
          <Button
            onClick={handlePhoneConfirmation}
            isLoading={isSavingConfirmation}
            disabled={
              !confirmationStatus ||
              ((confirmationStatus === 'postponed' || confirmationStatus === 'cancelled') && !confirmationNote)
            }
          >
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Reservation Confirmation */}
      <ConfirmModal
        isOpen={showDeleteReservationConfirm}
        onClose={() => {
          setShowDeleteReservationConfirm(false);
          setPendingDeleteRes(null);
        }}
        onConfirm={handleDeleteReservation}
        title="ยืนยันลบรายการจอง"
        message={
          pendingDeleteRes?.status === 'prepared' ? (
            <div className="space-y-2">
              <p>ต้องการลบ <strong>{pendingDeleteRes?.product?.name}</strong> x{pendingDeleteRes?.quantity} ใช่หรือไม่?</p>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 text-orange-700 text-xs">
                <strong>วัสดุนี้เตรียมของแล้ว</strong> — ระบบจะแจ้ง stock staff ให้เคลียร์ของคืนสต็อก
              </div>
            </div>
          ) : (
            <p>ต้องการลบ <strong>{pendingDeleteRes?.product?.name}</strong> x{pendingDeleteRes?.quantity} ใช่หรือไม่?</p>
          )
        }
        variant={pendingDeleteRes?.status === 'prepared' ? 'warning' : 'danger'}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        isLoading={isDeletingReservation}
      />

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
