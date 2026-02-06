'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { DateRangeType, DateRangeFilter } from '@/types/database';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  format,
} from 'date-fns';
import { th } from 'date-fns/locale';

interface DateRangePickerProps {
  value: DateRangeFilter;
  onChange: (filter: DateRangeFilter) => void;
  className?: string;
}

const quickFilters: { type: DateRangeType; label: string }[] = [
  { type: 'today', label: 'วันนี้' },
  { type: 'week', label: 'สัปดาห์นี้' },
  { type: 'month', label: 'เดือนนี้' },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(value.type === 'custom');
  const [customStart, setCustomStart] = useState(value.startDate || '');
  const [customEnd, setCustomEnd] = useState(value.endDate || '');

  useEffect(() => {
    setShowCustomPicker(value.type === 'custom');
  }, [value.type]);

  const handleQuickFilter = (type: DateRangeType) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        return;
    }

    onChange({
      type,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    });
    setShowCustomPicker(false);
  };

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      onChange({
        type: 'custom',
        startDate: customStart,
        endDate: customEnd,
      });
    }
  };

  const handleMonthNavigation = (direction: 'prev' | 'next') => {
    const currentStart = value.startDate ? new Date(value.startDate) : new Date();
    const newDate = direction === 'prev' ? subMonths(currentStart, 1) : addMonths(currentStart, 1);

    onChange({
      type: 'custom',
      startDate: format(startOfMonth(newDate), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(newDate), 'yyyy-MM-dd'),
    });
    setCustomStart(format(startOfMonth(newDate), 'yyyy-MM-dd'));
    setCustomEnd(format(endOfMonth(newDate), 'yyyy-MM-dd'));
  };

  const getDisplayText = () => {
    if (!value.startDate || !value.endDate) return '';
    const start = new Date(value.startDate);
    const end = new Date(value.endDate);
    return `${format(start, 'd MMM yyyy', { locale: th })} - ${format(end, 'd MMM yyyy', { locale: th })}`;
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Row 1: Quick filters + Month navigation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {quickFilters.map((filter) => (
            <button
              key={filter.type}
              onClick={() => handleQuickFilter(filter.type)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                value.type === filter.type
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMonthNavigation('prev')}
            className="p-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleMonthNavigation('next')}
            className="p-1.5"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Row 2: Date range display */}
      <button
        onClick={() => setShowCustomPicker(!showCustomPicker)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors w-full sm:w-auto',
          showCustomPicker || value.type === 'custom'
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        <Calendar className="w-4 h-4 shrink-0" />
        <span>{getDisplayText() || 'เลือกช่วงเวลา'}</span>
      </button>

      {/* Custom date inputs */}
      {showCustomPicker && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 text-sm"
            />
            <span className="text-gray-400">→</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 text-sm"
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCustomDateChange}
            disabled={!customStart || !customEnd}
            className="w-full sm:w-auto"
          >
            ใช้งาน
          </Button>
        </div>
      )}
    </div>
  );
}
