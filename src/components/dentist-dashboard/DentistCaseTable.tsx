'use client';

import Link from 'next/link';
import { Calendar, User, Eye, ShoppingCart, CheckCircle, XCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { DentistCaseItem } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';

interface DentistCaseTableProps {
  cases: DentistCaseItem[];
  isLoading?: boolean;
}

export function DentistCaseTable({ cases, isLoading }: DentistCaseTableProps) {
  const getMaterialStatusDisplay = (status: DentistCaseItem['material_status']) => {
    const config: Record<
      DentistCaseItem['material_status'],
      { text: string; variant: 'success' | 'warning' | 'danger' | 'gray' }
    > = {
      ready: { text: 'พร้อม', variant: 'success' },
      waiting: { text: 'อยู่ระหว่างจัดส่ง', variant: 'warning' },
      not_available: { text: 'ขาด', variant: 'danger' },
      not_reserved: { text: 'ยังไม่จอง', variant: 'gray' },
    };
    return config[status];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">ไม่มีเคสในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่</TableHead>
              <TableHead className="hidden lg:table-cell">เวลา</TableHead>
              <TableHead>คนไข้</TableHead>
              <TableHead className="hidden lg:table-cell">การรักษา</TableHead>
              <TableHead>สถานะวัสดุ</TableHead>
              <TableHead>สต๊อก</TableHead>
              <TableHead className="text-right">การดำเนินการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cases.map((caseItem) => {
              const materialStatus = getMaterialStatusDisplay(caseItem.material_status);
              const { total, out_of_stock } = caseItem.reservation_summary;
              const inStock = total - out_of_stock;

              return (
                <TableRow key={caseItem.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm">{formatDate(caseItem.surgery_date)}</span>
                      <span className="lg:hidden block text-xs text-gray-500">
                        {caseItem.surgery_time ? caseItem.surgery_time.slice(0, 5) : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {caseItem.surgery_time ? (
                      <span className="text-sm text-gray-600">{caseItem.surgery_time.slice(0, 5)}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{caseItem.patient_name}</p>
                      <p className="text-xs text-gray-500">{caseItem.hn_number}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-gray-600">{caseItem.procedure_type || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={materialStatus.variant} size="sm" dot>
                      {materialStatus.text}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {total > 0 ? (
                      out_of_stock > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                          <XCircle className="w-3.5 h-3.5" />
                          ขาด {out_of_stock}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          ครบ {inStock}
                        </span>
                      )
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {caseItem.material_status === 'not_reserved' && (
                        <Link href={`/cases/${caseItem.id}?reserve=true`}>
                          <Button variant="primary" size="sm" leftIcon={<ShoppingCart className="w-3.5 h-3.5" />}>
                            จอง
                          </Button>
                        </Link>
                      )}
                      <Link href={`/cases/${caseItem.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {cases.map((caseItem) => {
          const materialStatus = getMaterialStatusDisplay(caseItem.material_status);
          const { total, out_of_stock } = caseItem.reservation_summary;
          const inStock = total - out_of_stock;

          return (
            <Link
              key={caseItem.id}
              href={caseItem.material_status === 'not_reserved' ? `/cases/${caseItem.id}?reserve=true` : `/cases/${caseItem.id}`}
              className="block border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
            >
              {/* Top row: Date + Status */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{formatDate(caseItem.surgery_date)}</span>
                  {caseItem.surgery_time && (
                    <span className="text-gray-500">{caseItem.surgery_time.slice(0, 5)}</span>
                  )}
                </div>
                <Badge variant={materialStatus.variant} size="sm" dot>
                  {materialStatus.text}
                </Badge>
              </div>

              {/* Patient info */}
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="font-medium text-sm">{caseItem.patient_name}</span>
                <span className="text-xs text-gray-500">{caseItem.hn_number}</span>
              </div>

              {/* Bottom row: Procedure + Stock */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{caseItem.procedure_type || '-'}</span>
                {total > 0 ? (
                  out_of_stock > 0 ? (
                    <span className="inline-flex items-center gap-1 font-medium text-red-600">
                      <XCircle className="w-3.5 h-3.5" />
                      ขาด {out_of_stock} รายการ
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      มีครบ {inStock} รายการ
                    </span>
                  )
                ) : caseItem.material_status === 'not_reserved' ? (
                  <span className="inline-flex items-center gap-1 font-medium text-blue-600">
                    <ShoppingCart className="w-3.5 h-3.5" />
                    จองวัสดุ
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
