'use client';

import Link from 'next/link';
import { AlertTriangle, Clock, Package, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { UrgentCase48h } from '@/types/database';

interface UrgentCasesAlertProps {
  cases: UrgentCase48h[];
}

export function UrgentCasesAlert({ cases }: UrgentCasesAlertProps) {
  if (cases.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            เคสด่วนภายใน 48 ชั่วโมง
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">เคสที่มีกำหนดผ่าตัดภายใน 2 วัน</p>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-600 font-medium">ไม่มีเคสด่วน</p>
        </div>
      </div>
    );
  }

  const getUrgencyBadge = (daysUntil: number) => {
    if (daysUntil === 0) {
      return <Badge variant="danger" size="sm">วันนี้!</Badge>;
    }
    if (daysUntil === 1) {
      return <Badge variant="warning" size="sm">พรุ่งนี้</Badge>;
    }
    return <Badge variant="info" size="sm">{daysUntil} วัน</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      gray: 'gray',
    };
    return (
      <Badge variant={variants[status] || 'gray'} size="sm">
        {getCaseStatusText(status)}
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-orange-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              เคสด่วนภายใน 48 ชั่วโมง
            </h3>
            <p className="text-sm text-gray-500">เคสที่มีกำหนดผ่าตัดภายใน 2 วัน</p>
          </div>
        </div>
        <Badge variant="danger">{cases.length} เคส</Badge>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {cases.map((caseItem) => (
          <Link
            key={caseItem.id}
            href={`/cases/${caseItem.id}`}
            className="block p-4 rounded-lg border border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {caseItem.case_number}
                  </span>
                  {getUrgencyBadge(caseItem.days_until_surgery)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {caseItem.patient_name} ({caseItem.hn_number})
                </p>
              </div>
              {getStatusBadge(caseItem.status)}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {formatDate(caseItem.surgery_date)}
                  {caseItem.surgery_time && ` ${caseItem.surgery_time.slice(0, 5)}`}
                </span>
              </div>
              <span>ทพ. {caseItem.dentist_name}</span>
            </div>

            {/* Warning indicators */}
            <div className="flex items-center gap-3 mt-3">
              {caseItem.unprepared_items > 0 && (
                <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                  <Package className="w-3.5 h-3.5" />
                  <span>ยังไม่เตรียม {caseItem.unprepared_items} รายการ</span>
                </div>
              )}
              {caseItem.out_of_stock_items > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>ไม่มีในสต็อก {caseItem.out_of_stock_items} รายการ</span>
                </div>
              )}
              {caseItem.unprepared_items === 0 && caseItem.out_of_stock_items === 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <Package className="w-3.5 h-3.5" />
                  <span>วัสดุพร้อมแล้ว</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/cases?filter=urgent"
          className="text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors"
        >
          ดูเคสด่วนทั้งหมด →
        </Link>
      </div>
    </div>
  );
}
