'use client';

import { LayoutList, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'table' | 'timeline';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center bg-gray-100 rounded-lg p-1', className)}>
      <button
        onClick={() => onChange('table')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          value === 'table'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        <LayoutList className="w-4 h-4" />
        <span>ตาราง</span>
      </button>
      <button
        onClick={() => onChange('timeline')}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          value === 'timeline'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        )}
      >
        <CalendarDays className="w-4 h-4" />
        <span>Timeline</span>
      </button>
    </div>
  );
}
