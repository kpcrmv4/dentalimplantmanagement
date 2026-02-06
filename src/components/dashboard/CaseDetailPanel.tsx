'use client';

import { format, isSameDay } from 'date-fns';
import { th } from 'date-fns/locale';
import { ArrowRight, Clock, User, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { cn, getCaseStatusText, formatTime } from '@/lib/utils';
import type { CalendarCase } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';

interface CaseDetailPanelProps {
  selectedDate: Date | null;
  cases: CalendarCase[];
}

export function CaseDetailPanel({ selectedDate, cases }: CaseDetailPanelProps) {
  const filteredCases = selectedDate
    ? cases.filter((c) => isSameDay(new Date(c.surgery_date), selectedDate))
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 h-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        เลือกวันในปฏิทิน
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        กดที่วันเพื่อดูรายละเอียด
      </p>

      {selectedDate ? (
        <div>
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-lg font-medium text-gray-900">
              {format(selectedDate, 'EEEE', { locale: th })}
            </p>
            <p className="text-sm text-gray-500">
              {format(selectedDate, 'd MMMM yyyy', { locale: th })}
            </p>
          </div>

          {filteredCases.length > 0 ? (
            <div className="space-y-3">
              {filteredCases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {caseItem.case_number}
                    </span>
                    <Badge variant={getCaseStatusVariant(caseItem.status)} size="sm">
                      {getCaseStatusText(caseItem.status)}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{caseItem.patient_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-gray-400" />
                      <span>{caseItem.dentist_name}</span>
                    </div>
                    {caseItem.surgery_time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatTime(caseItem.surgery_time)}</span>
                      </div>
                    )}
                    {caseItem.procedure_type && (
                      <p className="text-gray-500 mt-2">
                        {caseItem.procedure_type}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">ไม่มีเคสในวันนี้</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">เลือกวันจากปฏิทินเพื่อดูเคส</p>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <Link
          href="/cases"
          className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          ดูเคสทั้งหมด
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
