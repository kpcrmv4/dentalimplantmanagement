'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';
import { getMaterialStatusColor } from '@/lib/status';
import { isToday, isTomorrow, parseISO, format } from 'date-fns';
import { th } from 'date-fns/locale';
import type { DentistCaseItem } from '@/types/database';

function getDateLabel(dateStr: string) {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'วันนี้';
  if (isTomorrow(date)) return 'พรุ่งนี้';
  return format(date, 'EEEE d MMMM', { locale: th });
}

export function DentistCaseTimeline({
  cases,
  isLoading,
  onRetry,
}: {
  cases: DentistCaseItem[];
  isLoading?: boolean;
  onRetry?: () => void;
}) {
  if (isLoading) {
    return <LoadingSpinner onRetry={onRetry} />;
  }

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">ไม่มีเคสในช่วงเวลาที่เลือก</p>
      </div>
    );
  }

  // Group by date
  const grouped = cases.reduce<Record<string, DentistCaseItem[]>>((acc, c) => {
    if (!acc[c.surgery_date]) acc[c.surgery_date] = [];
    acc[c.surgery_date].push(c);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <span className="font-semibold text-gray-700">{getDateLabel(date)}</span>
            <span className="text-sm text-gray-500">{grouped[date].length} เคส</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-gray-200">
            {grouped[date].map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="block p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors relative"
              >
                <div
                  className={`absolute -left-[9px] top-4 w-3 h-3 rounded-full border-2 border-white ${getMaterialStatusColor(c.material_status)}`}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.surgery_time && (
                      <span className="text-sm font-medium text-gray-600">
                        {c.surgery_time.slice(0, 5)}
                      </span>
                    )}
                    <span className="font-medium">{c.patient_name}</span>
                    <span className="text-sm text-gray-500">{c.procedure_type || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${c.reservation_summary.in_stock === c.reservation_summary.total ? 'text-green-600' : c.reservation_summary.out_of_stock > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {c.reservation_summary.in_stock}/{c.reservation_summary.total}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
