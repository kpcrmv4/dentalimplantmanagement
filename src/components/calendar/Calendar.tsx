'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { th } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getCaseStatusDot } from '@/lib/utils';
import type { CalendarCase } from '@/types/database';

interface CalendarProps {
  cases: CalendarCase[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

export function Calendar({
  cases,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
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
  }, [currentMonth]);

  const getCasesForDate = (date: Date) => {
    return cases.filter((c) => isSameDay(new Date(c.surgery_date), date));
  };

  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    onMonthChange?.(newMonth);
  };

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-lg sm:text-xl">📅</span>
          <span className="hidden sm:inline">ปฏิทินเคสผ่าตัด</span>
          <span className="sm:hidden">ปฏิทิน</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-lg font-medium text-gray-900 min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: th })}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Legend - 4 สีตามบรีฟ */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-600">พร้อมผ่าตัด</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-gray-600">รอวัสดุ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">วัสดุไม่พอ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
          <span className="text-gray-600">ยังไม่จองวัสดุ</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week days header */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="h-10 flex items-center justify-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day, idx) => {
          const dayCases = getCasesForDate(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(day)}
              className={cn(
                'relative h-24 p-1 rounded-lg border transition-all duration-200',
                'hover:bg-gray-50 hover:border-gray-300',
                isCurrentMonth ? 'bg-white' : 'bg-gray-50',
                isSelected && 'ring-2 ring-blue-500 border-blue-500',
                isTodayDate && !isSelected && 'border-blue-300 bg-blue-50/50'
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

              {/* Case indicators */}
              {dayCases.length > 0 && (
                <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5 justify-center">
                  {dayCases.slice(0, 4).map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getCaseStatusDot(c.status)
                      )}
                      title={`${c.case_number} - ${c.patient_name}`}
                    />
                  ))}
                  {dayCases.length > 4 && (
                    <span className="text-xs text-gray-500">
                      +{dayCases.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
