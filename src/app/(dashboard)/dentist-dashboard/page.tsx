'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Calendar, Clock, Package, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Badge } from '@/components/ui';
import { DateRangePicker, ViewToggle, type ViewMode } from '@/components/preparation';
import { DentistSummaryCards, DentistCaseTable, DentistCaseTimeline } from '@/components/dentist-dashboard';
import { useDentistDashboard } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';
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
  const [showNewCases, setShowNewCases] = useState(false);

  const { data, isLoading, mutate } = useDentistDashboard(user?.id || '', dateFilter);

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

  // New assigned cases (not yet reserved — need first booking action)
  const newCases = useMemo(() => {
    return cases.filter((c) => c.material_status === 'not_reserved');
  }, [cases]);

  // Auto-expand new cases section when there are new cases
  useEffect(() => {
    if (newCases.length > 0) setShowNewCases(true);
  }, [newCases.length]);

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

        {/* New Assigned Cases (collapsible) */}
        <Card>
          <button
            type="button"
            className="w-full flex items-center justify-between"
            onClick={() => setShowNewCases(!showNewCases)}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                เคสใหม่ที่ได้รับมอบหมาย
              </h3>
              {newCases.length > 0 ? (
                <Badge variant="danger" size="sm">{newCases.length}</Badge>
              ) : (
                <Badge variant="gray" size="sm">0</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {newCases.length === 0 && (
                <span className="text-sm text-gray-400">ยังไม่มีเคสใหม่</span>
              )}
              {showNewCases ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>

          {showNewCases && (
            <div className="mt-4">
              {newCases.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">ไม่มีเคสใหม่ที่ยังไม่ได้จองวัสดุ</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {newCases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}?reserve=true`}
                      className="block p-3 rounded-lg border border-blue-100 bg-blue-50/50 hover:bg-blue-100/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{c.patient_name}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(c.surgery_date)}
                            {c.surgery_time && ` ${c.surgery_time.slice(0, 5)}`}
                            {c.procedure_type && ` - ${c.procedure_type}`}
                          </p>
                        </div>
                        <Badge variant="gray" size="sm">ยังไม่จอง</Badge>
                      </div>
                    </Link>
                  ))}
                  {newCases.length > 5 && (
                    <p className="text-sm text-gray-500 text-center pt-1">
                      และอีก {newCases.length - 5} รายการ
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </Card>

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
            <DentistCaseTable cases={cases} isLoading={isLoading} onRetry={() => mutate()} />
          ) : (
            <DentistCaseTimeline cases={cases} isLoading={isLoading} onRetry={() => mutate()} />
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
