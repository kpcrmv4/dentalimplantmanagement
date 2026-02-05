'use client';

import { useState } from 'react';
import { Calendar, Clock, User, Stethoscope, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { PickingList } from './PickingList';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { AssistantCaseItem, CaseStatus } from '@/types/database';

interface AssistantCaseCardProps {
  caseItem: AssistantCaseItem;
  onMarkUsed: (reservationId: string, photoUrls: string[]) => Promise<void>;
  onAddMaterial: (caseId: string) => void;
  onCloseCase: (caseId: string) => void;
  isExpanded?: boolean;
}

export function AssistantCaseCard({
  caseItem,
  onMarkUsed,
  onAddMaterial,
  onCloseCase,
  isExpanded: initialExpanded = false,
}: AssistantCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

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

  const { total, prepared, used, pending } = caseItem.material_summary;
  const allUsed = used === total && total > 0;
  const progressPercent = total > 0 ? Math.round((used / total) * 100) : 0;

  return (
    <Card className="overflow-hidden">
      {/* Header - Always visible */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Case Number & Status */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{caseItem.case_number}</h3>
              <Badge variant={getStatusVariant(caseItem.status)} size="sm" dot>
                {getCaseStatusText(caseItem.status)}
              </Badge>
            </div>

            {/* Patient Info */}
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <User className="w-4 h-4" />
              <span className="font-medium">{caseItem.patient_name}</span>
              <span className="text-gray-400">({caseItem.hn_number})</span>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(caseItem.surgery_date)}</span>
              </div>
              {caseItem.surgery_time && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{caseItem.surgery_time.slice(0, 5)}</span>
                </div>
              )}
            </div>

            {/* Dentist */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Stethoscope className="w-4 h-4" />
              <span>{caseItem.dentist_name}</span>
            </div>
          </div>

          {/* Expand/Collapse & Progress */}
          <div className="flex flex-col items-end gap-2">
            <Button variant="ghost" size="sm" className="p-1">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>

            {/* Material Progress */}
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-400" />
              <div className="text-right">
                <p className="text-sm font-medium">
                  {used}/{total}
                </p>
                <p className="text-xs text-gray-500">ใช้แล้ว</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                allUsed ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content - Picking List */}
      {isExpanded && (
        <div className="border-t">
          <PickingList
            reservations={caseItem.reservations}
            onMarkUsed={onMarkUsed}
          />

          {/* Action Buttons */}
          <div className="p-4 bg-gray-50 border-t flex flex-col sm:flex-row gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onAddMaterial(caseItem.id)}
            >
              <Package className="w-4 h-4 mr-2" />
              เพิ่ม/เปลี่ยนวัสดุ
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => onCloseCase(caseItem.id)}
              disabled={!allUsed && used < total}
            >
              ปิดเคส
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
