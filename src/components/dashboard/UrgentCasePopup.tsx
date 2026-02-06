'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, X, Clock, ChevronRight, Package, AlertCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { UrgentCaseCountdown } from './UrgentCaseCountdown';
import { cn, formatDate } from '@/lib/utils';
import type { UrgentCaseForPopup } from '@/types/database';

interface UrgentCasePopupProps {
  cases: UrgentCaseForPopup[];
  isOpen: boolean;
  onClose: () => void;
}

export function UrgentCasePopup({ cases, isOpen, onClose }: UrgentCasePopupProps) {
  if (!isOpen || cases.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed inset-x-4 top-4 sm:inset-x-auto sm:left-1/2 sm:top-8 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header - Red alert banner */}
          <div className="bg-red-500 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">แจ้งเตือนฉุกเฉิน</h2>
                    <Badge variant="danger" className="bg-white text-red-600">
                      {cases.length} เคส
                    </Badge>
                  </div>
                  <p className="text-red-100 text-sm">
                    มีเคสที่วัสดุยังไม่พร้อมหรือยังไม่ได้จองภายใน 48 ชั่วโมง
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Case list */}
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="divide-y divide-gray-100">
              {cases.map((caseItem) => (
                <Link
                  key={caseItem.id}
                  href={`/cases/${caseItem.id}`}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                  onClick={onClose}
                >
                  <div className="flex items-start gap-4">
                    {/* Countdown badge */}
                    <UrgentCaseCountdown
                      surgeryDate={caseItem.surgery_date}
                      surgeryTime={caseItem.surgery_time}
                    />

                    {/* Case info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {caseItem.case_number}
                        </span>
                        {caseItem.urgency_level === 'critical' && (
                          <Badge variant="danger" size="sm">
                            ด่วนมาก!
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {caseItem.patient_name}
                        <span className="text-gray-400 ml-1">
                          • ทพ.{caseItem.dentist_name}
                        </span>
                      </p>

                      {/* Status indicators */}
                      <div className="flex items-center gap-3 mt-2">
                        {caseItem.has_no_reservations && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            <Package className="w-3.5 h-3.5" />
                            <span>ยังไม่จองวัสดุ</span>
                          </div>
                        )}
                        {caseItem.unprepared_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                            <Package className="w-3.5 h-3.5" />
                            <span>ยังไม่เตรียม {caseItem.unprepared_count} รายการ</span>
                          </div>
                        )}
                        {caseItem.out_of_stock_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>ขาด {caseItem.out_of_stock_count} รายการ</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Surgery date/time and arrow */}
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <div className="text-right">
                        <p>{formatDate(caseItem.surgery_date)}</p>
                        {caseItem.surgery_time && (
                          <p className="text-gray-400">{caseItem.surgery_time.slice(0, 5)}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <Link
                href="/cases?filter=urgent"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
                onClick={onClose}
              >
                ดูเคสด่วนทั้งหมด
              </Link>
              <Button variant="outline" size="sm" onClick={onClose}>
                ปิด
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Floating trigger badge when popup is dismissed
interface UrgentCaseBadgeProps {
  count: number;
  onClick: () => void;
}

export function UrgentCaseBadge({ count, onClick }: UrgentCaseBadgeProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-4 right-4 z-40',
        'flex items-center gap-2 px-4 py-3',
        'bg-red-500 text-white rounded-full shadow-lg',
        'hover:bg-red-600 transition-all',
        'animate-pulse hover:animate-none'
      )}
    >
      <AlertTriangle className="w-5 h-5" />
      <span className="font-semibold">{count} เคสด่วน</span>
    </button>
  );
}
