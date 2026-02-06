'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  addDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isSameWeek,
  isToday,
  getDay,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarCase, CaseStatus } from '@/types/database';

type ViewMode = 'day' | 'week' | 'month';

interface CalendarProps {
  cases: CalendarCase[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

// Get background color for case status
function getCaseStatusBg(status: CaseStatus): string {
  switch (status) {
    case 'green':
      return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'red':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'gray':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function Calendar({
  cases,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Calculate days based on view mode
  const days = useMemo(() => {
    if (viewMode === 'day') {
      return [startOfDay(currentDate)];
    }

    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const daysArray = [];
      for (let i = 0; i < 7; i++) {
        daysArray.push(addDays(weekStart, i));
      }
      return daysArray;
    }

    // Month view
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const daysArray = [];
    let day = startDate;

    while (day <= endDate) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    return daysArray;
  }, [currentDate, viewMode]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const filteredCases = cases.filter((c) => {
      const caseDate = new Date(c.surgery_date);
      if (viewMode === 'day') {
        return isSameDay(caseDate, currentDate);
      }
      if (viewMode === 'week') {
        return isSameWeek(caseDate, currentDate, { weekStartsOn: 0 });
      }
      return isSameMonth(caseDate, currentDate);
    });

    return {
      total: filteredCases.length,
      ready: filteredCases.filter((c) => c.status === 'green').length,
      waiting: filteredCases.filter((c) => c.status === 'yellow').length,
      shortage: filteredCases.filter((c) => c.status === 'red').length,
      notReserved: filteredCases.filter((c) => c.status === 'gray').length,
    };
  }, [cases, currentDate, viewMode]);

  const getCasesForDate = useCallback(
    (date: Date) => {
      return cases.filter((c) => isSameDay(new Date(c.surgery_date), date));
    },
    [cases]
  );

  const handlePrev = () => {
    let newDate: Date;
    if (viewMode === 'day') {
      newDate = addDays(currentDate, -1);
    } else if (viewMode === 'week') {
      newDate = subWeeks(currentDate, 1);
    } else {
      newDate = subMonths(currentDate, 1);
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    if (viewMode === 'day') {
      newDate = addDays(currentDate, 1);
    } else if (viewMode === 'week') {
      newDate = addWeeks(currentDate, 1);
    } else {
      newDate = addMonths(currentDate, 1);
    }
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    onSelectDate(today);
    onMonthChange?.(today);
  };

  const getHeaderText = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'd MMMM yyyy', { locale: th });
    }
    if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy', { locale: th })}`;
    }
    return format(currentDate, 'MMMM yyyy', { locale: th });
  };

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
            {getHeaderText()}
          </span>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={handleToday}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              isToday(currentDate)
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-200'
            )}
          >
            วันนี้
          </button>
          <button
            onClick={() => setViewMode('day')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'day'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            )}
          >
            วัน
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'week'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            )}
          >
            สัปดาห์
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:bg-gray-200'
            )}
          >
            เดือน
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="text-gray-500">สถานะ:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
          <span className="text-gray-600">พร้อม</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-gray-600">รอของ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">ขาด</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'day' ? (
        // Day View
        <div className="border rounded-lg">
          <div className="p-4 border-b bg-gray-50">
            <div className="text-center">
              <span className="text-lg font-medium">
                {weekDays[getDay(currentDate)]}
              </span>
              <span className="ml-2 text-gray-500">
                {format(currentDate, 'd MMMM yyyy', { locale: th })}
              </span>
            </div>
          </div>
          <div className="p-4 min-h-[300px]">
            {getCasesForDate(currentDate).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                ไม่มีเคสในวันนี้
              </div>
            ) : (
              <div className="space-y-2">
                {getCasesForDate(currentDate).map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow',
                      getCaseStatusBg(c.status)
                    )}
                    onClick={() => onSelectDate(currentDate)}
                  >
                    <div className="font-medium">{c.case_number}</div>
                    <div className="text-sm opacity-80">
                      {c.patient_name} - {c.dentist_name}
                    </div>
                    {c.surgery_time && (
                      <div className="text-sm opacity-70 mt-1">
                        เวลา: {c.surgery_time}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        // Week View
        <div className="border rounded-lg overflow-hidden">
          {/* Week Header */}
          <div className="grid grid-cols-7 border-b bg-gray-50">
            {days.map((day, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-2 text-center border-r last:border-r-0',
                  isToday(day) && 'bg-blue-50'
                )}
              >
                <div className="text-xs text-gray-500">{weekDays[idx]}</div>
                <div
                  className={cn(
                    'text-lg font-medium',
                    isToday(day) ? 'text-blue-600' : 'text-gray-900'
                  )}
                >
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>
          {/* Week Body */}
          <div className="grid grid-cols-7 min-h-[300px]">
            {days.map((day, idx) => {
              const dayCases = getCasesForDate(day);
              return (
                <div
                  key={idx}
                  className={cn(
                    'p-1 border-r last:border-r-0 cursor-pointer hover:bg-gray-50',
                    isToday(day) && 'bg-blue-50/30'
                  )}
                  onClick={() => onSelectDate(day)}
                >
                  <div className="space-y-1">
                    {dayCases.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          'text-xs px-1.5 py-0.5 rounded border truncate',
                          getCaseStatusBg(c.status)
                        )}
                        title={`${c.case_number} - ${c.patient_name}`}
                      >
                        {c.case_number}
                      </div>
                    ))}
                    {dayCases.length > 6 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayCases.length - 6} อื่นๆ
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Month View
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
          {/* Week days header */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="h-10 flex items-center justify-center text-sm font-medium text-gray-500 bg-gray-50"
            >
              {day}
            </div>
          ))}

          {/* Days */}
          {days.map((day, idx) => {
            const dayCases = getCasesForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={idx}
                onClick={() => onSelectDate(day)}
                className={cn(
                  'relative min-h-[100px] p-1 transition-all duration-200 text-left',
                  'hover:bg-gray-100',
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                  isSelected && 'ring-2 ring-inset ring-blue-500',
                  isTodayDate && !isSelected && 'bg-blue-50'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 left-2 text-sm font-medium',
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
                    isTodayDate && 'text-blue-600'
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Case list with colored chips */}
                {dayCases.length > 0 && (
                  <div className="mt-5 space-y-0.5 overflow-hidden">
                    {dayCases.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          'text-[10px] sm:text-xs px-1 py-0.5 rounded border truncate',
                          getCaseStatusBg(c.status)
                        )}
                        title={`${c.case_number} - ${c.patient_name}`}
                      >
                        {c.case_number}
                      </div>
                    ))}
                    {dayCases.length > 3 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayCases.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Bar */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">
            {summary.total}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">เคสทั้งหมด</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-cyan-600">
            {summary.ready}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">พร้อม</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
            {summary.waiting}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">รอของ</div>
        </div>
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold text-red-600">
            {summary.shortage}
          </div>
          <div className="text-xs sm:text-sm text-gray-500">ขาด</div>
        </div>
      </div>
    </div>
  );
}
