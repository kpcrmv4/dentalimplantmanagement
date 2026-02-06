'use client';

import { useMemo } from 'react';
import { Calendar, Clock, User, Stethoscope, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { PickingList } from './PickingList';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { AssistantCaseItem } from '@/types/database';
import { getCaseStatusVariant } from '@/lib/status';

interface AssistantCaseCardProps {
  caseItem: AssistantCaseItem;
  onMarkUsed: (reservationId: string, photoUrls: string[]) => Promise<void>;
  onAddMaterial: (caseId: string) => void;
  onCloseCase: (caseId: string) => void;
}

export function AssistantCaseCard({
  caseItem,
  onMarkUsed,
  onAddMaterial,
  onCloseCase,
}: AssistantCaseCardProps) {
  const { total, prepared, used, pending } = caseItem.material_summary;
  const allUsed = used === total && total > 0;
  const progressPercent = total > 0 ? Math.round((used / total) * 100) : 0;
  const isCompleted = caseItem.status === 'completed';

  // Check if all materials are ready to close the case:
  // 1. All reservations must be 'used' or 'cancelled' (no pending/prepared/confirmed left)
  // 2. Every 'used' reservation must have at least 1 photo evidence
  const closeCaseCheck = useMemo(() => {
    const activeReservations = caseItem.reservations.filter((r) => r.status !== 'cancelled');
    const notUsedItems = activeReservations.filter((r) => r.status !== 'used');
    const usedWithoutPhoto = activeReservations.filter(
      (r) => r.status === 'used' && (!r.photo_evidence || r.photo_evidence.length === 0)
    );

    const canClose = activeReservations.length > 0 && notUsedItems.length === 0 && usedWithoutPhoto.length === 0;

    const reasons: string[] = [];
    if (activeReservations.length === 0) {
      reasons.push('ไม่มีวัสดุในเคส');
    }
    if (notUsedItems.length > 0) {
      reasons.push(`วัสดุยังไม่ได้ใช้ ${notUsedItems.length} รายการ`);
    }
    if (usedWithoutPhoto.length > 0) {
      reasons.push(`ยังไม่ได้ถ่ายรูปยืนยันการตัดวัสดุ ${usedWithoutPhoto.length} รายการ`);
    }

    return { canClose, reasons };
  }, [caseItem.reservations]);

  return (
    <div className="space-y-3">
      {/* Case Header Card */}
      <Card padding="none" className="overflow-hidden">
        {/* Colored top border */}
        <div className={`h-1 ${
          caseItem.status === 'green' || caseItem.status === 'completed' ? 'bg-green-500' :
          caseItem.status === 'yellow' ? 'bg-yellow-500' :
          caseItem.status === 'red' ? 'bg-red-500' : 'bg-gray-400'
        }`} />

        <div className="p-4">
          {/* Case info row */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="font-bold text-base text-gray-900">{caseItem.case_number}</h3>
                <Badge variant={getCaseStatusVariant(caseItem.status)} size="sm" dot>
                  {getCaseStatusText(caseItem.status)}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">{caseItem.patient_name}</span>
                  <span className="text-gray-400 text-xs">({caseItem.hn_number})</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Stethoscope className="w-3.5 h-3.5 text-gray-400" />
                  <span>{caseItem.dentist_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(caseItem.surgery_date)}
                  </span>
                  {caseItem.surgery_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {caseItem.surgery_time.slice(0, 5)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Progress section */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">ความคืบหน้าวัสดุ</span>
              <div className="flex items-center gap-1.5">
                {allUsed ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Package className="w-4 h-4 text-gray-400" />
                )}
                <span className={`text-sm font-bold ${allUsed ? 'text-green-600' : 'text-gray-700'}`}>
                  {used}/{total}
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  allUsed ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Mini status counts */}
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
              {pending > 0 && <span>รอดำเนินการ {pending}</span>}
              {prepared > 0 && <span className="text-blue-500">เตรียมแล้ว {prepared}</span>}
              {used > 0 && <span className="text-green-500">ใช้แล้ว {used}</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Material Picking List */}
      <div>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
          รายการวัสดุ ({total} รายการ)
        </h4>
        <PickingList
          reservations={caseItem.reservations}
          onMarkUsed={onMarkUsed}
        />
      </div>

      {/* Action Buttons */}
      {!isCompleted && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => onAddMaterial(caseItem.id)}
            >
              <Package className="w-4 h-4 mr-1.5" />
              เพิ่มวัสดุ
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => {
                if (closeCaseCheck.canClose) {
                  if (window.confirm('ยืนยันการปิดเคสนี้หรือไม่?\n\nเมื่อปิดแล้วจะไม่สามารถแก้ไขข้อมูลวัสดุได้อีก')) {
                    onCloseCase(caseItem.id);
                  }
                }
              }}
              disabled={!closeCaseCheck.canClose}
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              ปิดเคส
            </Button>
          </div>

          {/* Show reasons why close case is disabled */}
          {!closeCaseCheck.canClose && closeCaseCheck.reasons.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 space-y-0.5">
                <p className="font-medium">ยังไม่สามารถปิดเคสได้:</p>
                {closeCaseCheck.reasons.map((reason, idx) => (
                  <p key={idx}>- {reason}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
