'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
  Package,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { CasePreparationItem, CaseReservation, CaseStatus, PreparationStatus } from '@/types/database';

interface CasePreparationTableProps {
  cases: CasePreparationItem[];
  onPrepareItem: (reservation: CaseReservation) => void;
  onPrepareAll: (caseItem: CasePreparationItem) => void;
  isLoading?: boolean;
}

export function CasePreparationTable({
  cases,
  onPrepareItem,
  onPrepareAll,
  isLoading,
}: CasePreparationTableProps) {
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());

  const toggleExpanded = (caseId: string) => {
    setExpandedCases((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  const getStatusVariant = (status: CaseStatus): 'success' | 'warning' | 'danger' | 'gray' => {
    const variants: Record<CaseStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      gray: 'gray',
      completed: 'success',
      cancelled: 'gray',
    };
    return variants[status];
  };

  const getPreparationStatusDisplay = (status: PreparationStatus) => {
    const config: Record<
      PreparationStatus,
      { icon: React.ReactNode; text: string; variant: 'success' | 'warning' | 'danger' | 'gray' }
    > = {
      ready: {
        icon: <CheckCircle2 className="w-4 h-4" />,
        text: 'พร้อมแล้ว',
        variant: 'success',
      },
      partial: {
        icon: <CircleDashed className="w-4 h-4" />,
        text: 'เตรียมบางส่วน',
        variant: 'warning',
      },
      not_started: {
        icon: <Package className="w-4 h-4" />,
        text: 'ยังไม่เริ่ม',
        variant: 'gray',
      },
      blocked: {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'ติดปัญหา',
        variant: 'danger',
      },
    };
    return config[status];
  };

  const getReservationStatusVariant = (
    status: string
  ): 'success' | 'warning' | 'danger' | 'gray' | 'info' => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      pending: 'warning',
      confirmed: 'info',
      prepared: 'success',
      used: 'success',
      cancelled: 'gray',
    };
    return variants[status] || 'gray';
  };

  const getReservationStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      prepared: 'เตรียมแล้ว',
      used: 'ใช้แล้ว',
      cancelled: 'ยกเลิก',
    };
    return texts[status] || status;
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </Card>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">ไม่มีเคสในช่วงเวลาที่เลือก</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>วันที่/เวลา</TableHead>
            <TableHead>เคส</TableHead>
            <TableHead>คนไข้</TableHead>
            <TableHead>ทันตแพทย์</TableHead>
            <TableHead>การรักษา</TableHead>
            <TableHead>สถานะวัสดุ</TableHead>
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => {
            const isExpanded = expandedCases.has(caseItem.id);
            const prepStatus = getPreparationStatusDisplay(caseItem.preparation_status);
            const { total, prepared, pending, confirmed, out_of_stock } = caseItem.preparation_summary;
            const canPrepareAll =
              caseItem.reservations?.some((r) => r.status === 'confirmed') ?? false;

            return (
              <>
                <TableRow
                  key={caseItem.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpanded(caseItem.id)}
                >
                  <TableCell>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{formatDate(caseItem.surgery_date)}</p>
                        {caseItem.surgery_time && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {caseItem.surgery_time.slice(0, 5)}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/cases/${caseItem.id}`}
                      className="font-semibold text-blue-600 hover:text-blue-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {caseItem.case_number}
                    </Link>
                    <div className="mt-1">
                      <Badge variant={getStatusVariant(caseItem.status)} size="sm" dot>
                        {getCaseStatusText(caseItem.status)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{caseItem.patient_name}</p>
                        <p className="text-xs text-gray-500">{caseItem.hn_number}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">ทพ. {caseItem.dentist_name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{caseItem.procedure_type || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={prepStatus.variant} size="sm">
                        <span className="flex items-center gap-1">
                          {prepStatus.icon}
                          {prepStatus.text}
                        </span>
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {prepared}/{total} รายการ
                        {out_of_stock > 0 && (
                          <span className="text-red-600 ml-1">
                            ({out_of_stock} ไม่มีสต็อก)
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      {canPrepareAll && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onPrepareAll(caseItem)}
                        >
                          เตรียมทั้งหมด
                        </Button>
                      )}
                      <Link href={`/cases/${caseItem.id}`}>
                        <Button variant="outline" size="sm">
                          ดูรายละเอียด
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded reservations */}
                {isExpanded && caseItem.reservations && caseItem.reservations.length > 0 && (
                  <TableRow key={`${caseItem.id}-expanded`}>
                    <TableCell colSpan={8} className="bg-gray-50 p-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700 mb-3">
                          รายการวัสดุที่จอง ({caseItem.reservations.length} รายการ)
                        </h4>
                        <div className="grid gap-2">
                          {caseItem.reservations.map((reservation) => (
                            <div
                              key={reservation.id}
                              className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-3"
                            >
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-medium">
                                    {reservation.product?.name || 'ไม่ระบุสินค้า'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {reservation.product?.sku && `SKU: ${reservation.product.sku}`}
                                    {reservation.inventory?.lot_number &&
                                      ` | LOT: ${reservation.inventory.lot_number}`}
                                  </p>
                                </div>
                                <Badge variant={getReservationStatusVariant(reservation.status)} size="sm">
                                  {getReservationStatusText(reservation.status)}
                                </Badge>
                                {reservation.is_out_of_stock && (
                                  <Badge variant="danger" size="sm">
                                    ไม่มีในสต็อก
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  จำนวน: {reservation.quantity}
                                </span>
                                {reservation.status === 'confirmed' && !reservation.is_out_of_stock && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPrepareItem(reservation)}
                                  >
                                    เตรียมของ
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
