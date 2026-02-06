'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Package, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout';
import {
  SummaryCard,
  CaseDetailPanel,
  LowStockAlert,
  PendingCasesAlert,
  UrgentCasesAlert,
  OutOfStockRequests,
  UrgentCasePopup,
  UrgentCaseBadge,
} from '@/components/dashboard';
import { Calendar } from '@/components/calendar/Calendar';
import {
  useDashboardSummary,
  useLowStockItems,
  useCalendarCases,
  useCases,
  useUrgentCases48h,
  usePendingStockRequests,
  useUrgentCasesForPopup,
} from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { useUrgentPopupStore } from '@/stores/urgentPopupStore';
import { formatThaiDate, formatThaiDateShort } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUrgentPopup, setShowUrgentPopup] = useState(false);

  // Urgent popup store
  const { setDismissed, shouldShowPopup } = useUrgentPopupStore();

  // Fetch real data from Supabase
  const { data: summary, mutate: mutateSummary } = useDashboardSummary();
  const { data: lowStockItems, mutate: mutateLowStock } = useLowStockItems();
  const { data: calendarCases, mutate: mutateCalendar } = useCalendarCases(currentMonth);
  // Fetch all cases to filter for pending (red and gray status)
  const { data: allCases, mutate: mutateAllCases } = useCases();
  // Fetch urgent cases within 48 hours
  const { data: urgentCases, mutate: mutateUrgent } = useUrgentCases48h();
  // Fetch out-of-stock requests
  const { data: outOfStockRequests, mutate: mutateOutOfStock } = usePendingStockRequests();
  // Fetch urgent cases for popup (with material issues)
  const { data: urgentCasesForPopup } = useUrgentCasesForPopup();

  // Show popup on mount if there are urgent cases with issues
  useEffect(() => {
    if (urgentCasesForPopup && urgentCasesForPopup.length > 0) {
      if (shouldShowPopup(urgentCasesForPopup)) {
        setShowUrgentPopup(true);
      }
    }
  }, [urgentCasesForPopup, shouldShowPopup]);

  const handleClosePopup = useCallback(() => {
    if (urgentCasesForPopup) {
      setDismissed(urgentCasesForPopup.map((c) => c.id));
    }
    setShowUrgentPopup(false);
  }, [urgentCasesForPopup, setDismissed]);

  const handleOpenPopup = useCallback(() => {
    setShowUrgentPopup(true);
  }, []);

  // Filter pending cases (red = วัสดุไม่พอ, gray = ยังไม่จองวัสดุ)
  const pendingCases = useMemo(() => {
    if (!allCases) return [];
    return allCases.filter(
      (c) => c.status === 'red' || c.status === 'gray'
    );
  }, [allCases]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      mutateSummary(),
      mutateLowStock(),
      mutateCalendar(),
      mutateAllCases(),
      mutateUrgent(),
      mutateOutOfStock(),
    ]);
    setIsRefreshing(false);
  }, [mutateSummary, mutateLowStock, mutateCalendar, mutateAllCases, mutateUrgent, mutateOutOfStock]);

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  // Count urgent items for summary
  const urgentCount = urgentCases?.length || 0;
  const outOfStockCount = outOfStockRequests?.length || 0;

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            title="เคสเดือนนี้"
            value={summary?.cases_this_month || 0}
            subtitle={formatThaiDate(new Date())}
            shortSubtitle={formatThaiDateShort(new Date())}
            icon={<CalendarIcon className="w-6 h-6" />}
          />
          <SummaryCard
            title="เคสด่วน 48 ชม."
            value={urgentCount}
            subtitle="ต้องเตรียมด่วน"
            shortSubtitle="เตรียมด่วน"
            icon={<Clock className="w-6 h-6" />}
            variant={urgentCount > 0 ? 'danger' : 'default'}
          />
          <SummaryCard
            title="วัสดุไม่พร้อม"
            value={summary?.cases_not_ready || 0}
            subtitle="ต้องเตรียมของ"
            shortSubtitle="เตรียมของ"
            icon={<Package className="w-6 h-6" />}
            variant={summary?.cases_not_ready ? 'danger' : 'default'}
          />
          <SummaryCard
            title="รอสั่งซื้อ"
            value={outOfStockCount + (summary?.low_stock_items || 0)}
            subtitle="สินค้าไม่มี/ใกล้หมด"
            shortSubtitle="ไม่มี/ใกล้หมด"
            icon={<AlertTriangle className="w-6 h-6" />}
            variant={(outOfStockCount + (summary?.low_stock_items || 0)) > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Urgent Cases Alert - Show prominently if there are urgent cases */}
        {urgentCount > 0 && (
          <UrgentCasesAlert cases={urgentCases || []} />
        )}

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
          <PendingCasesAlert cases={pendingCases} />
          <LowStockAlert items={lowStockItems || []} />
        </div>

        {/* Out of Stock Requests - Show if there are any */}
        {outOfStockCount > 0 && (
          <OutOfStockRequests requests={outOfStockRequests || []} />
        )}
      </div>

      {/* Urgent Case Popup */}
      <UrgentCasePopup
        cases={urgentCasesForPopup || []}
        isOpen={showUrgentPopup}
        onClose={handleClosePopup}
      />

      {/* Floating badge when popup is dismissed */}
      {!showUrgentPopup && (urgentCasesForPopup?.length || 0) > 0 && (
        <UrgentCaseBadge
          count={urgentCasesForPopup?.length || 0}
          onClick={handleOpenPopup}
        />
      )}
    </div>
  );
}
