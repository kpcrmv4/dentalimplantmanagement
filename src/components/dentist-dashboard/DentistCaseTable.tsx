'use client';

import Link from 'next/link';
import { Calendar, Clock, User, Eye, Package } from 'lucide-react';
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
import type { DentistCaseItem, CaseStatus } from '@/types/database';

interface DentistCaseTableProps {
  cases: DentistCaseItem[];
  isLoading?: boolean;
}

export function DentistCaseTable({ cases, isLoading }: DentistCaseTableProps) {
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

  const getMaterialStatusDisplay = (status: DentistCaseItem['material_status']) => {
    const config: Record<
      DentistCaseItem['material_status'],
      { text: string; variant: 'success' | 'warning' | 'danger' | 'gray' }
    > = {
      ready: { text: 'พร้อม', variant: 'success' },
      waiting: { text: 'รอของ', variant: 'warning' },
      not_available: { text: 'ขาด', variant: 'danger' },
      not_reserved: { text: 'ยังไม่จอง', variant: 'gray' },
    };
    return config[status];
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
            <TableHead>วันที่</TableHead>
            <TableHead>เวลา</TableHead>
            <TableHead>คนไข้</TableHead>
            <TableHead>การรักษา</TableHead>
            <TableHead>ขั้น</TableHead>
            <TableHead>สถานะวัสดุ</TableHead>
            <TableHead>จองแล้ว</TableHead>
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => {
            const materialStatus = getMaterialStatusDisplay(caseItem.material_status);
            const { total, prepared } = caseItem.reservation_summary;

            return (
              <TableRow key={caseItem.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatDate(caseItem.surgery_date)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {caseItem.surgery_time ? (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{caseItem.surgery_time.slice(0, 5)}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
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
                  <span className="text-sm">{caseItem.procedure_type || '-'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(caseItem.status)} size="sm" dot>
                    {getCaseStatusText(caseItem.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={materialStatus.variant} size="sm">
                    {materialStatus.text}
                  </Badge>
                </TableCell>
                <TableCell>
                  {total > 0 ? (
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">
                        {prepared}/{total}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {caseItem.material_status === 'not_reserved' && (
                      <Link href={`/cases/${caseItem.id}?reserve=true`}>
                        <Button variant="primary" size="sm">
                          จองวัสดุ
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
    </Card>
  );
}
