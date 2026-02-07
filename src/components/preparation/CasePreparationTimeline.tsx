'use client';

import Link from 'next/link';
import {
  Clock,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { getCaseStatusText } from '@/lib/utils';
import type { CasePreparationItem, CaseReservation } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface CasePreparationTimelineProps {
  cases: CasePreparationItem[];
  onPrepareItem: (reservation: CaseReservation) => void;
  onPrepareAll: (caseItem: CasePreparationItem) => void;
  isLoading?: boolean;
  canPrepare?: boolean;
}

interface GroupedCases {
  [date: string]: CasePreparationItem[];
}

export function CasePreparationTimeline({
  cases,
  onPrepareItem,
  onPrepareAll,
  isLoading,
  canPrepare = true,
}: CasePreparationTimelineProps) {
  // Group cases by date
  const groupedCases = cases.reduce<GroupedCases>((acc, caseItem) => {
    const date = caseItem.surgery_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(caseItem);
    return acc;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(groupedCases).sort();

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'วันนี้';
    if (isTomorrow(date)) return 'พรุ่งนี้';
    return format(date, 'EEEE d MMMM yyyy', { locale: th });
  };

  // Compute item-level status counts for a case
  const getItemStatusCounts = (caseItem: CasePreparationItem) => {
    const reservations = caseItem.reservations || [];
    return {
      prepared: reservations.filter((r) => r.status === 'prepared' || r.status === 'used').length,
      notPrepared: reservations.filter((r) => (r.status === 'pending' || r.status === 'confirmed') && !r.is_out_of_stock).length,
      waiting: reservations.filter((r) => r.is_out_of_stock && r.status === 'confirmed').length,
      blocked: reservations.filter((r) => r.is_out_of_stock && r.status === 'pending').length,
      total: reservations.length,
    };
  };

  // Get timeline dot color
  const getDotColor = (caseItem: CasePreparationItem) => {
    if (caseItem.preparation_status === 'ready') return 'bg-green-500';
    if (caseItem.preparation_status === 'blocked') return 'bg-red-500';
    return 'bg-gray-300';
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
      <Card>
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">ไม่มีเคสในช่วงเวลาที่เลือก</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => {
        const dateCases = groupedCases[date];
        const dateLabel = getDateLabel(date);
        const isUrgent = isToday(parseISO(date)) || isTomorrow(parseISO(date));

        return (
          <div key={date}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`px-3 py-1.5 rounded-lg font-semibold ${
                  isUrgent ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {dateLabel}
              </div>
              <span className="text-sm text-gray-500">{dateCases.length} เคส</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Cases for this date */}
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              {dateCases.map((caseItem) => {
                const counts = getItemStatusCounts(caseItem);
                const dotColor = getDotColor(caseItem);
                const canPrepareAllItems =
                  canPrepare && (caseItem.reservations?.some((r) => (r.status === 'pending' || r.status === 'confirmed') && !r.is_out_of_stock) ?? false);

                return (
                  <div
                    key={caseItem.id}
                    className="relative bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-[25px] top-6 w-4 h-4 rounded-full border-2 border-white ${dotColor}`}
                    />

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {caseItem.surgery_time && (
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">
                              {caseItem.surgery_time.slice(0, 5)}
                            </span>
                          </div>
                        )}
                        <Link
                          href={`/cases/${caseItem.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          {caseItem.case_number}
                        </Link>
                        <Badge variant={getCaseStatusVariant(caseItem.status)} size="sm" dot>
                          {getCaseStatusText(caseItem.status)}
                        </Badge>
                      </div>
                    </div>

                    {/* Patient & Dentist info */}
                    <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{caseItem.patient_name}</span>
                        <span className="text-gray-400">({caseItem.hn_number})</span>
                      </div>
                      <span>ทพ. {caseItem.dentist_name}</span>
                      {caseItem.procedure_type && (
                        <span className="text-gray-400">| {caseItem.procedure_type}</span>
                      )}
                    </div>

                    {/* Material status breakdown */}
                    <div className="mb-3">
                      <div className="flex items-center gap-3 text-xs mb-1.5">
                        {counts.prepared > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            เตรียมแล้ว {counts.prepared}
                          </span>
                        )}
                        {counts.notPrepared > 0 && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            ยังไม่เตรียม {counts.notPrepared}
                          </span>
                        )}
                        {counts.waiting > 0 && (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                            รอของ {counts.waiting}
                          </span>
                        )}
                        {counts.blocked > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            ของขาด {counts.blocked}
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${counts.total > 0 ? (counts.prepared / counts.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Reservations preview */}
                    {caseItem.reservations && caseItem.reservations.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {caseItem.reservations.slice(0, 4).map((res) => (
                          <div
                            key={res.id}
                            className={`px-2 py-1 text-xs rounded-md ${
                              res.status === 'prepared' || res.status === 'used'
                                ? 'bg-green-50 text-green-700'
                                : res.is_out_of_stock
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {res.product?.name?.slice(0, 20)}
                            {res.product?.name && res.product.name.length > 20 ? '...' : ''}
                            {(res.status === 'prepared' || res.status === 'used') && (
                              <CheckCircle2 className="w-3 h-3 inline ml-1" />
                            )}
                          </div>
                        ))}
                        {caseItem.reservations.length > 4 && (
                          <span className="px-2 py-1 text-xs text-gray-500">
                            +{caseItem.reservations.length - 4} รายการ
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {canPrepareAllItems && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                        <Button variant="primary" size="sm" onClick={() => onPrepareAll(caseItem)}>
                          เตรียมทั้งหมด
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
