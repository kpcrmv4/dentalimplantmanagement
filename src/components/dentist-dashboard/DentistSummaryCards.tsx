'use client';

import { Calendar, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import type { DentistDashboardSummary } from '@/types/database';

interface DentistSummaryCardsProps {
  summary: DentistDashboardSummary;
}

export function DentistSummaryCards({ summary }: DentistSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <Card padding="sm">
        <div className="flex flex-col items-center justify-center text-center py-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500">เคสทั้งหมด</p>
          <p className="text-2xl sm:text-xl font-bold text-blue-600">{summary.total_cases}</p>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex flex-col items-center justify-center text-center py-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500">รอของ</p>
          <p className="text-2xl sm:text-xl font-bold text-orange-600">{summary.pending_reservations}</p>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex flex-col items-center justify-center text-center py-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500">วัสดุพร้อม</p>
          <p className="text-2xl sm:text-xl font-bold text-green-600">{summary.ready_cases}</p>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex flex-col items-center justify-center text-center py-2">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center mb-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500">ขาด</p>
          <p className="text-2xl sm:text-xl font-bold text-red-600">{summary.not_ready_cases}</p>
        </div>
      </Card>
    </div>
  );
}
