'use client';

import { useState, useCallback } from 'react';
import { Calendar as CalendarIcon, Clock, Package, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout';
import {
  SummaryCard,
  CaseDetailPanel,
  LowStockAlert,
  PendingCasesAlert,
} from '@/components/dashboard';
import { Calendar } from '@/components/calendar/Calendar';
import {
  useDashboardSummary,
  useLowStockItems,
  useCalendarCases,
  useCases,
} from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatThaiDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: summary, mutate: mutateSummary } = useDashboardSummary();
  const { data: lowStockItems, mutate: mutateLowStock } = useLowStockItems();
  const { data: calendarCases, mutate: mutateCalendar } = useCalendarCases(currentMonth);
  const { data: pendingCases, mutate: mutatePending } = useCases({ status: 'red' });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      mutateSummary(),
      mutateLowStock(),
      mutateCalendar(),
      mutatePending(),
    ]);
    setIsRefreshing(false);
  }, [mutateSummary, mutateLowStock, mutateCalendar, mutatePending]);

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="ภาพรวมการผ่าตัดและสต็อก"
        subtitle={`ยินดีต้อนรับ, ${user?.full_name || 'ผู้ใช้งาน'}`}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="เคสเดือนนี้"
            value={summary?.cases_this_month || 0}
            subtitle={formatThaiDate(new Date())}
            icon={<CalendarIcon className="w-6 h-6" />}
          />
          <SummaryCard
            title="เคสผ่าตัดที่กำลังจะถึง"
            value={summary?.upcoming_cases || 0}
            subtitle="เคสที่รอดำเนินการ"
            icon={<Clock className="w-6 h-6" />}
          />
          <SummaryCard
            title="วัสดุยังไม่พร้อม"
            value={summary?.cases_not_ready || 0}
            subtitle="ต้องเตรียมของ"
            icon={<Package className="w-6 h-6" />}
            variant={summary?.cases_not_ready ? 'danger' : 'default'}
          />
          <SummaryCard
            title="รายการที่ใกล้หมด"
            value={summary?.low_stock_items || 0}
            subtitle="ต้องสั่งซื้อ"
            icon={<AlertTriangle className="w-6 h-6" />}
            variant={summary?.low_stock_items ? 'warning' : 'default'}
          />
        </div>

        {/* Calendar and Case Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Calendar
              cases={calendarCases || []}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={handleMonthChange}
            />
          </div>
          <div>
            <CaseDetailPanel
              selectedDate={selectedDate}
              cases={calendarCases || []}
            />
          </div>
        </div>

        {/* Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PendingCasesAlert cases={pendingCases || []} />
          <LowStockAlert items={lowStockItems || []} />
        </div>
      </div>
    </div>
  );
}
