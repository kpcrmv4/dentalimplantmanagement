'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, AlertTriangle, Calendar, Clock, Package } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { DateRangePicker, ViewToggle, type ViewMode } from '@/components/preparation';
import { DentistSummaryCards, DentistCaseTable } from '@/components/dentist-dashboard';
import { useDentistDashboard } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { DateRangeFilter, DentistCaseItem, CaseStatus } from '@/types/database';
import { startOfMonth, endOfMonth, format, isToday, isTomorrow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

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

  const getStatusVariant = (status: CaseStatus): 'success' | 'warning' | 'danger' | 'gray' => {
    const variants: Record<CaseStatus, 'success' | 'warning' | 'danger' | 'gray'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      gray: 'gray',
      completed: 'success',
      cancelled: 'gray',
    };
    return variants[status];
  };

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
                      <Badge variant={getStatusVariant(c.status)} size="sm">
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
                    href={c.material_status === 'not_reserved' ? `/reservations/new?case=${c.id}` : `/cases/${c.id}`}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">ปฏิทินเคส</h3>
            </div>
            <div className="flex items-center gap-4">
              <DateRangePicker value={dateFilter} onChange={setDateFilter} />
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </div>

          {/* Summary stats */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
            <span>
              สรุป: <strong>{statusSummary.total}</strong> เคส ใน {daysInRange} วัน
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {statusSummary.ready} พร้อม
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {statusSummary.partial} บางส่วน
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {statusSummary.notReady} ไม่พร้อม
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              {statusSummary.notReserved} ยังไม่จอง
            </span>
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

// Simple Timeline component for dentist dashboard
function DentistCaseTimeline({
  cases,
  isLoading,
}: {
  cases: DentistCaseItem[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
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

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'วันนี้';
    if (isTomorrow(date)) return 'พรุ่งนี้';
    return format(date, 'EEEE d MMMM', { locale: th });
  };

  const getMaterialStatusColor = (status: DentistCaseItem['material_status']) => {
    const colors: Record<DentistCaseItem['material_status'], string> = {
      ready: 'bg-green-500',
      waiting: 'bg-yellow-500',
      not_available: 'bg-red-500',
      not_reserved: 'bg-gray-400',
    };
    return colors[status];
  };

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
                    <span className="text-sm text-gray-500">
                      {c.reservation_summary.prepared}/{c.reservation_summary.total}
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
