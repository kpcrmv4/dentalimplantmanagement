'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  shortSubtitle?: string; // For mobile display
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'danger' | 'success';
  onClick?: () => void;
}

export function SummaryCard({
  title,
  value,
  subtitle,
  shortSubtitle,
  icon,
  trend,
  variant = 'default',
  onClick,
}: SummaryCardProps) {
  const variants = {
    default: {
      bg: 'bg-white',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      valueColor: 'text-gray-900',
    },
    warning: {
      bg: 'bg-white',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-600',
    },
    danger: {
      bg: 'bg-white',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    success: {
      bg: 'bg-white',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
  };

  const style = variants[variant];

  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 p-3 sm:p-5 transition-all duration-200',
        style.bg,
        onClick && 'cursor-pointer hover:shadow-md hover:border-gray-300'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className={cn('mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold', style.valueColor)}>
            {typeof value === 'number' ? value.toLocaleString('th-TH') : value}
          </p>
          {(subtitle || shortSubtitle) && (
            <>
              {shortSubtitle ? (
                <>
                  <p className="mt-1 text-xs text-gray-500 sm:hidden">{shortSubtitle}</p>
                  <p className="mt-1 text-sm text-gray-500 hidden sm:block">{subtitle}</p>
                </>
              ) : (
                <p className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</p>
              )}
            </>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.isPositive ? '+' : '-'}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-500">จากเดือนที่แล้ว</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0',
            style.iconBg,
            style.iconColor,
            '[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6'
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
