'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, AlertTriangle, Calendar, Clock, Package } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Badge } from '@/components/ui';
import { DateRangePicker, ViewToggle, type ViewMode } from '@/components/preparation';
import { DentistSummaryCards, DentistCaseTable, DentistCaseTimeline } from '@/components/dentist-dashboard';
import { useDentistDashboard } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import { getCaseStatusVariant } from '@/lib/status';
import type { DateRangeFilter } from '@/types/database';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export default function DentistDashboardPage() {
  const { user } = useAuthStore();

  // Default to this month
  const now = new Date();
  const defaultStart = startOfMonth(now);
  const defaultEnd = endOfMonth(now);

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>({
    type: 'month',
    startDate: format(defaultStart, 'yyyy-MM-dd'),
    endDate: format(defaultEnd, 'yyyy-MM-dd'),
  });
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  const { data, isLoading } = useDentistDashboard(user?.id || '', dateFilter);

  const summary = data?.summary || {
    total_cases: 0,
    pending_reservations: 0,
    ready_cases: 0,
    not_ready_cases: 0,
    cases_today: 0,
    cases_this_week: 0,
    cases_this_month: 0,
  };
  const cases = data?.cases || [];

  // Filter cases that need action (not reserved or not available)
  const actionNeededCases = useMemo(() => {
    return cases.filter(
      (c) => c.material_status === 'not_reserved' || c.material_status === 'not_available'
    );
  }, [cases]);

  // New cases (within last 7 days of assignment - using surgery date as proxy)
  const newCases = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return cases.filter((c) => {
      const surgeryDate = new Date(c.surgery_date);
      const today = new Date();
      // Show cases that are upcoming and within the next 14 days
      return surgeryDate >= today && surgeryDate <= new Date(today.setDate(today.getDate() + 14));
    }).slice(0, 5);
  }, [cases]);

  // Summary by status for calendar view
  const statusSummary = useMemo(() => {
    return cases.reduce(
      (acc, c) => {
        acc.total++;
        switch (c.material_status) {
          case 'ready':
            acc.ready++;
            break;
          case 'waiting':
            acc.partial++;
            break;
          case 'not_available':
            acc.notReady++;
            break;
          case 'not_reserved':
            acc.notReserved++;
            break;
        }
        return acc;
      },
      { total: 0, ready: 0, partial: 0, notReady: 0, notReserved: 0 }
    );
  }, [cases]);

  // Calculate days in range
  const daysInRange = useMemo(() => {
    if (!dateFilter.startDate || !dateFilter.endDate) return 0;
    const start = new Date(dateFilter.startDate);
    const end = new Date(dateFilter.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [dateFilter]);

  return (
    <div className="min-h-screen">
      <Header
        title="Dentist Dashboard"
        subtitle={`ยินดีต้อนรับ, ${user?.email || ''}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <DentistSummaryCards summary={summary} />

        {/* New Cases & Action Needed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Assigned Cases */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">เคสใหม่ที่ได้รับมอบหมาย</h3>
            </div>
            {newCases.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">ไม่มีเคสใหม่</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newCases.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{c.patient_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(c.surgery_date)}
                          {c.surgery_time && ` ${c.surgery_time.slice(0, 5)}`}
                        </p>
                      </div>
                      <Badge variant={getCaseStatusVariant(c.status)} size="sm">
                        {getCaseStatusText(c.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Action Needed */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">ต้องดำเนินการ</h3>
            </div>
            {actionNeededCases.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">ไม่มีรายการที่ต้องดำเนินการ</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {actionNeededCases.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={c.material_status === 'not_reserved' ? `/cases/${c.id}?reserve=true` : `/cases/${c.id}`}
                    className="block p-3 rounded-lg border border-orange-100 bg-orange-50/50 hover:bg-orange-100/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{c.patient_name}</p>
                        <p className="text-xs text-gray-600">
                          {formatDate(c.surgery_date)} - {c.procedure_type || 'ไม่ระบุ'}
                        </p>
                      </div>
                      <Badge
                        variant={c.material_status === 'not_reserved' ? 'gray' : 'danger'}
                        size="sm"
                      >
                        {c.material_status === 'not_reserved' ? 'ยังไม่จอง' : 'ไม่มีสต็อก'}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {actionNeededCases.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    และอีก {actionNeededCases.length - 5} รายการ
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Calendar/Table Section */}
        <Card>
          {/* Header Row: Title + View toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">ปฏิทินเคส</h3>
            </div>
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* Date Range Picker */}
          <div className="mb-5">
            <DateRangePicker value={dateFilter} onChange={setDateFilter} />
          </div>

          {/* Summary stats - attractive cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-5 pb-5 border-b border-gray-100">
            {/* Total cases - highlighted */}
            <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex flex-col items-center justify-center py-4 lg:py-5 px-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm">
              <span className="text-4xl lg:text-5xl font-bold text-blue-600">{statusSummary.total}</span>
              <span className="text-xs font-medium text-blue-500 mt-1">เคสทั้งหมด</span>
              <span className="text-[10px] text-blue-400">ใน {daysInRange} วัน</span>
            </div>
            {/* Ready */}
            <div className="flex flex-col items-center justify-center py-4 lg:py-5 px-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-sm">
              <span className="text-3xl lg:text-4xl font-bold text-green-600">{statusSummary.ready}</span>
              <span className="text-xs font-medium text-green-600 mt-1">พร้อม</span>
            </div>
            {/* Waiting */}
            <div className="flex flex-col items-center justify-center py-4 lg:py-5 px-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 shadow-sm">
              <span className="text-3xl lg:text-4xl font-bold text-amber-600">{statusSummary.partial}</span>
              <span className="text-xs font-medium text-amber-600 mt-1">อยู่ระหว่างจัดส่ง</span>
            </div>
            {/* Not ready */}
            <div className="flex flex-col items-center justify-center py-4 lg:py-5 px-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 shadow-sm">
              <span className="text-3xl lg:text-4xl font-bold text-red-600">{statusSummary.notReady}</span>
              <span className="text-xs font-medium text-red-600 mt-1">ขาด</span>
            </div>
            {/* Not reserved */}
            <div className="flex flex-col items-center justify-center py-4 lg:py-5 px-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-sm">
              <span className="text-3xl lg:text-4xl font-bold text-slate-500">{statusSummary.notReserved}</span>
              <span className="text-xs font-medium text-slate-500 mt-1">ยังไม่จอง</span>
            </div>
          </div>

          {/* Table or Timeline view */}
          {viewMode === 'table' ? (
            <DentistCaseTable cases={cases} isLoading={isLoading} />
          ) : (
            <DentistCaseTimeline cases={cases} isLoading={isLoading} />
          )}
        </Card>

        {/* Quick stats at bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-cyan-600" />
              <h3 className="text-lg font-semibold text-gray-900">วัสดุที่ใช้บ่อย</h3>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">ยังไม่มีข้อมูลการใช้วัสดุ</p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">ประสิทธิภาพ (เดือนนี้)</h3>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">ยังไม่มีข้อมูลประสิทธิภาพ</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
