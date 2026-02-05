'use client';

import { Calendar, Package, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import type { DentistDashboardSummary } from '@/types/database';

interface DentistSummaryCardsProps {
  summary: DentistDashboardSummary;
}

export function DentistSummaryCards({ summary }: DentistSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">เคสทั้งหมด</p>
            <p className="text-xl font-bold text-blue-600">{summary.total_cases}</p>
          </div>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">รอจองวัสดุ</p>
            <p className="text-xl font-bold text-yellow-600">{summary.pending_reservations}</p>
          </div>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">วัสดุพร้อม</p>
            <p className="text-xl font-bold text-green-600">{summary.ready_cases}</p>
          </div>
        </div>
      </Card>
      <Card padding="sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">วัสดุไม่พร้อม</p>
            <p className="text-xl font-bold text-red-600">{summary.not_ready_cases}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
