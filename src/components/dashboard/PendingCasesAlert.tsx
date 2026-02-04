'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import { cn, getCaseStatusText, formatDate } from '@/lib/utils';
import type { Case } from '@/types/database';

interface PendingCasesAlertProps {
  cases: Case[];
}

export function PendingCasesAlert({ cases }: PendingCasesAlertProps) {
  // Filter cases that are not ready (red or gray status)
  const pendingCases = cases.filter(
    (c) => c.status === 'red' || c.status === 'gray'
  );

  if (pendingCases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            เคสที่วัสดุยังไม่พร้อม
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">เคสที่ต้องเตรียมวัสดุเพิ่ม</p>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-600 font-medium">ทุกเคสพร้อมแล้ว</p>
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string) => {
    if (status === 'red') return 'danger';
    if (status === 'gray') return 'gray';
    return 'warning';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900">
          เคสที่วัสดุยังไม่พร้อม
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">เคสที่ต้องเตรียมวัสดุเพิ่ม</p>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {pendingCases.map((caseItem) => (
          <Link
            key={caseItem.id}
            href={`/cases/${caseItem.id}`}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <div>
              <p className="font-medium text-gray-900 text-sm">
                {caseItem.case_number}
              </p>
              <p className="text-xs text-gray-500">
                {formatDate(caseItem.surgery_date)}
              </p>
            </div>
            <Badge variant={getStatusVariant(caseItem.status)} size="sm">
              {getCaseStatusText(caseItem.status)}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/cases?filter=pending"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          ดูทั้งหมด →
        </Link>
      </div>
    </div>
  );
}
