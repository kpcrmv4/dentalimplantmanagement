'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button, Badge, Card, LoadingSpinner } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { CasePreparationItem, CaseReservation } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';

interface CasePreparationTableProps {
  cases: CasePreparationItem[];
  onPrepareItem: (reservation: CaseReservation) => void;
  onPrepareAll: (caseItem: CasePreparationItem) => void;
  isLoading?: boolean;
  canPrepare?: boolean;
  onRetry?: () => void;
}

export function CasePreparationTable({
  cases,
  onPrepareItem,
  onPrepareAll,
  isLoading,
  canPrepare = true,
  onRetry,
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

  // Map reservation to display status based on DB status + is_out_of_stock
  const getItemDisplayStatus = (
    status: string,
    isOutOfStock: boolean
  ): { text: string; variant: 'success' | 'warning' | 'danger' | 'gray' | 'info' } => {
    if (status === 'prepared' || status === 'used') {
      return { text: 'เตรียมแล้ว', variant: 'success' };
    }
    if (isOutOfStock && status === 'confirmed') {
      return { text: 'รอของ', variant: 'warning' };
    }
    if (isOutOfStock && status === 'pending') {
      return { text: 'ของขาด', variant: 'danger' };
    }
    if (status === 'cancelled') {
      return { text: 'ยกเลิก', variant: 'gray' };
    }
    // pending or confirmed, not OOS
    return { text: 'ยังไม่เตรียม', variant: 'gray' };
  };

  if (isLoading) {
    return (
      <Card>
        <LoadingSpinner onRetry={onRetry} />
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
            const { total } = caseItem.preparation_summary;
            const canPrepareAll =
              canPrepare && (caseItem.reservations?.some((r) => (r.status === 'pending' || r.status === 'confirmed') && !r.is_out_of_stock) ?? false);

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
                      <Badge variant={getCaseStatusVariant(caseItem.status)} size="sm" dot>
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
                      {(() => {
                        const reservations = caseItem.reservations || [];
                        const preparedCount = reservations.filter((r) => r.status === 'prepared' || r.status === 'used').length;
                        const notPreparedCount = reservations.filter((r) => (r.status === 'pending' || r.status === 'confirmed') && !r.is_out_of_stock).length;
                        const waitingCount = reservations.filter((r) => r.is_out_of_stock && r.status === 'confirmed').length;
                        const blockedCount = reservations.filter((r) => r.is_out_of_stock && r.status === 'pending').length;
                        return (
                          <div className="space-y-0.5 text-xs">
                            {preparedCount > 0 && (
                              <span className="flex items-center gap-1 text-green-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                เตรียมแล้ว {preparedCount}
                              </span>
                            )}
                            {notPreparedCount > 0 && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                ยังไม่เตรียม {notPreparedCount}
                              </span>
                            )}
                            {waitingCount > 0 && (
                              <span className="flex items-center gap-1 text-yellow-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                                รอของ {waitingCount}
                              </span>
                            )}
                            {blockedCount > 0 && (
                              <span className="flex items-center gap-1 text-red-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                ของขาด {blockedCount}
                              </span>
                            )}
                            {total === 0 && (
                              <span className="text-gray-400">ยังไม่มีรายการ</span>
                            )}
                          </div>
                        );
                      })()}
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
                                {(() => {
                                  const display = getItemDisplayStatus(reservation.status, reservation.is_out_of_stock);
                                  return (
                                    <Badge variant={display.variant} size="sm">
                                      {display.text}
                                    </Badge>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600">
                                  จำนวน: {reservation.quantity}
                                </span>
                                {canPrepare && (reservation.status === 'pending' || reservation.status === 'confirmed') && !reservation.is_out_of_stock && (
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
