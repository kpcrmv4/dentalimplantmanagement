'use client';

import Link from 'next/link';
import {
  Clock,
  User,
  Package,
  CheckCircle2,
  AlertCircle,
  CircleDashed,
  ArrowRight,
} from 'lucide-react';
import { Button, Badge, Card } from '@/components/ui';
import { formatDate, formatThaiDate, getCaseStatusText } from '@/lib/utils';
import type { CasePreparationItem, CaseReservation, PreparationStatus } from '@/types/database';
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

  const getPreparationStatusConfig = (status: PreparationStatus) => {
    const config: Record<
      PreparationStatus,
      { icon: React.ReactNode; text: string; color: string; bgColor: string }
    > = {
      ready: {
        icon: <CheckCircle2 className="w-5 h-5" />,
        text: 'พร้อมแล้ว',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
      },
      partial: {
        icon: <CircleDashed className="w-5 h-5" />,
        text: 'เตรียมบางส่วน',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
      },
      not_started: {
        icon: <Package className="w-5 h-5" />,
        text: 'ยังไม่เริ่ม',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
      },
      blocked: {
        icon: <AlertCircle className="w-5 h-5" />,
        text: 'ติดปัญหา',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
      },
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
                const prepConfig = getPreparationStatusConfig(caseItem.preparation_status);
                const { total, prepared, out_of_stock } = caseItem.preparation_summary;
                const canPrepareAll =
                  canPrepare && (caseItem.reservations?.some((r) => r.status === 'confirmed') ?? false);

                return (
                  <div
                    key={caseItem.id}
                    className="relative bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-[25px] top-6 w-4 h-4 rounded-full border-2 border-white ${prepConfig.bgColor}`}
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
                      <div className={`flex items-center gap-2 ${prepConfig.color}`}>
                        {prepConfig.icon}
                        <span className="font-medium">{prepConfig.text}</span>
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

                    {/* Material status bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>ความพร้อมของวัสดุ</span>
                        <span>
                          {prepared}/{total} รายการ
                          {out_of_stock > 0 && (
                            <span className="text-red-600 ml-1">
                              ({out_of_stock} ไม่มีสต็อก)
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${total > 0 ? (prepared / total) * 100 : 0}%` }}
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
                              res.status === 'prepared'
                                ? 'bg-green-50 text-green-700'
                                : res.is_out_of_stock
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-gray-50 text-gray-700'
                            }`}
                          >
                            {res.product?.name?.slice(0, 20)}
                            {res.product?.name && res.product.name.length > 20 ? '...' : ''}
                            {res.status === 'prepared' && (
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
                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                      {canPrepareAll && (
                        <Button variant="primary" size="sm" onClick={() => onPrepareAll(caseItem)}>
                          เตรียมทั้งหมด
                        </Button>
                      )}
                      <Link href={`/cases/${caseItem.id}`}>
                        <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                          ดูรายละเอียด
                        </Button>
                      </Link>
                    </div>
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
