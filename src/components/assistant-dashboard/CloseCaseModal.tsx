'use client';

import { useState, useMemo } from 'react';
import { X, CheckCircle, Package, AlertTriangle, Undo2, FileText } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import type { AssistantCaseItem, AssistantReservationItem } from '@/types/database';

interface CloseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: AssistantCaseItem | null;
  onConfirm: (unusedReservationIds: string[], notes?: string) => Promise<void>;
}

export function CloseCaseModal({
  isOpen,
  onClose,
  caseItem,
  onConfirm,
}: CloseCaseModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !caseItem) return null;

  // Categorize reservations
  const { usedItems, unusedItems, pendingItems } = useMemo(() => {
    const used: AssistantReservationItem[] = [];
    const unused: AssistantReservationItem[] = [];
    const pending: AssistantReservationItem[] = [];

    caseItem.reservations.forEach((r) => {
      if (r.status === 'used') {
        used.push(r);
      } else if (r.status === 'cancelled') {
        // Skip cancelled
      } else if (r.status === 'prepared' || r.status === 'confirmed') {
        unused.push(r);
      } else {
        pending.push(r);
      }
    });

    return { usedItems: used, unusedItems: unused, pendingItems: pending };
  }, [caseItem.reservations]);

  const hasUnusedItems = unusedItems.length > 0;
  const hasPendingItems = pendingItems.length > 0;

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // Pass unused reservation IDs to be cancelled/released
      const unusedIds = unusedItems.map((r) => r.id);
      await onConfirm(unusedIds, notes || undefined);
      handleClose();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการปิดเคส กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">ปิดเคส</h3>
            <p className="text-sm text-gray-500">{caseItem.case_number}</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Case Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="font-medium">สรุปข้อมูลเคส</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-500">คนไข้</p>
                <p className="font-medium">{caseItem.patient_name}</p>
              </div>
              <div>
                <p className="text-gray-500">HN</p>
                <p className="font-medium">{caseItem.hn_number}</p>
              </div>
              <div>
                <p className="text-gray-500">ทันตแพทย์</p>
                <p className="font-medium">{caseItem.dentist_name}</p>
              </div>
              <div>
                <p className="text-gray-500">การรักษา</p>
                <p className="font-medium">{caseItem.procedure_type || '-'}</p>
              </div>
            </div>
          </div>

          {/* Materials Used */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium">วัสดุที่ใช้แล้ว ({usedItems.length})</span>
            </div>
            {usedItems.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {usedItems.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.product_ref && `REF: ${item.product_ref}`}
                        {item.lot_number && ` | LOT: ${item.lot_number}`}
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      {item.used_quantity} ชิ้น
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-2">ไม่มีวัสดุที่ใช้</p>
            )}
          </div>

          {/* Materials to be released */}
          {hasUnusedItems && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-orange-500" />
                <span className="font-medium">วัสดุที่ไม่ได้ใช้ - จะคืนสต็อก ({unusedItems.length})</span>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg divide-y">
                {unusedItems.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-gray-500">
                        {item.product_ref && `REF: ${item.product_ref}`}
                        {item.lot_number && ` | LOT: ${item.lot_number}`}
                      </p>
                    </div>
                    <Badge variant="warning" size="sm">
                      {item.quantity} ชิ้น
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-orange-600">
                วัสดุเหล่านี้จะถูกยกเลิกการจองและคืนกลับสู่สต็อก
              </p>
            </div>
          )}

          {/* Pending Items Warning */}
          {hasPendingItems && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">มีวัสดุรอดำเนินการ ({pendingItems.length} รายการ)</p>
                <p>วัสดุที่ยังไม่ได้ยืนยันหรือเตรียมจะถูกยกเลิกอัตโนมัติ</p>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">สรุปการใช้วัสดุ</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{usedItems.length}</p>
                <p className="text-xs text-blue-700">ใช้แล้ว</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{unusedItems.length}</p>
                <p className="text-xs text-orange-700">คืนสต็อก</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  {usedItems.reduce((sum, r) => sum + r.used_quantity, 0)}
                </p>
                <p className="text-xs text-gray-600">ชิ้นที่ใช้</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              หมายเหตุการปิดเคส (ถ้ามี)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows={2}
              placeholder="บันทึกเพิ่มเติม..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'กำลังปิดเคส...' : 'ยืนยันปิดเคส'}
          </Button>
        </div>
      </div>
    </div>
  );
}
