'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Package,
  Plus,
  CheckCircle,
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
  getReservationStatusText,
  cn,
} from '@/lib/utils';
import toast from 'react-hot-toast';
import type { CaseStatus, ReservationStatus } from '@/types/database';
import { ReservationModal } from '@/components/reservations/ReservationModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CaseDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: caseData, isLoading, mutate } = useCase(id);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
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

  const getStatusVariant = (status: CaseStatus) => {
    const variants: Record<CaseStatus, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      gray: 'gray',
      completed: 'info',
      cancelled: 'gray',
    };
    return variants[status];
  };

  const getReservationVariant = (status: ReservationStatus) => {
    const variants: Record<ReservationStatus, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      prepared: 'success',
      used: 'success',
      cancelled: 'gray',
    };
    return variants[status];
  };

  const handleCompleteCase = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('เคสเสร็จสิ้นเรียบร้อย');
      mutate();
      setShowCompleteModal(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsUpdating(false);
    }
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
          <div className="flex items-center gap-2">
            {isEditable && (
              <>
                <Link href={`/cases/${id}/edit`}>
                  <Button variant="outline" leftIcon={<Edit className="w-4 h-4" />}>
                    แก้ไข
                  </Button>
                </Link>
                <Button
                  variant="primary"
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => setShowCompleteModal(true)}
                >
                  เสร็จสิ้น
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการเคส
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>ข้อมูลเคส</CardTitle>
                <Badge variant={getStatusVariant(caseData.status)} size="lg" dot>
                  {getCaseStatusText(caseData.status)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">วันผ่าตัด</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">
                          {formatDate(caseData.surgery_date)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">เวลา</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="font-medium">
                          {caseData.surgery_time
                            ? formatTime(caseData.surgery_time)
                            : 'ไม่ระบุ'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ระยะเวลาโดยประมาณ</p>
                      <span className="font-medium">
                        {caseData.estimated_duration} นาที
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ตำแหน่งฟัน</p>
                      <div className="flex flex-wrap gap-1">
                        {caseData.tooth_positions?.map((pos, idx) => (
                          <Badge key={idx} variant="gray" size="sm">
                            {pos}
                          </Badge>
                        )) || <span className="text-gray-400">ไม่ระบุ</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ประเภทการรักษา</p>
                      <span className="font-medium">
                        {caseData.procedure_type || 'ไม่ระบุ'}
                      </span>
                    </div>
                    {caseData.is_emergency && (
                      <Badge variant="danger" size="lg">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        เคสฉุกเฉิน
                      </Badge>
                    )}
                  </div>
                </div>

                {caseData.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-2">หมายเหตุ</p>
                    <p className="text-gray-700">{caseData.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reservations Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  วัสดุที่จอง
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
                      {caseData.reservations.map((res) => (
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
                            <Badge variant={getReservationVariant(res.status)}>
                              {getReservationStatusText(res.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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

      {/* Complete Modal */}
      <Modal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="ยืนยันเสร็จสิ้นเคส"
      >
        <p className="text-gray-600">
          คุณต้องการทำเครื่องหมายว่าเคส {caseData.case_number} เสร็จสิ้นแล้วใช่หรือไม่?
        </p>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={handleCompleteCase}
            isLoading={isUpdating}
          >
            ยืนยัน
          </Button>
        </ModalFooter>
      </Modal>

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
