'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  Undo2,
  FileText,
  Camera,
  ImageOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
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
  const [step, setStep] = useState<'review' | 'confirm'>('review');

  if (!isOpen || !caseItem) return null;

  // Categorize reservations
  const { usedItems, unusedItems, pendingItems, usedWithPhoto, usedWithoutPhoto } = (() => {
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

    const withPhoto = used.filter(
      (r) => r.photo_evidence && r.photo_evidence.length > 0
    );
    const withoutPhoto = used.filter(
      (r) => !r.photo_evidence || r.photo_evidence.length === 0
    );

    return {
      usedItems: used,
      unusedItems: unused,
      pendingItems: pending,
      usedWithPhoto: withPhoto,
      usedWithoutPhoto: withoutPhoto,
    };
  })();

  const allUnusedIds = [...unusedItems, ...pendingItems].map((r) => r.id);
  const totalPiecesUsed = usedItems.reduce(
    (sum, r) => sum + (r.used_quantity || r.quantity),
    0
  );
  const totalPiecesReturned = [...unusedItems, ...pendingItems].reduce(
    (sum, r) => sum + r.quantity,
    0
  );

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm(allUnusedIds, notes || undefined);
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
    setStep('review');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">
              {step === 'review' ? 'สรุปการใช้วัสดุ' : 'ยืนยันปิดเคส'}
            </h3>
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
          {step === 'review' ? (
            <>
              {/* Case Info */}
              <div className="bg-gray-50 rounded-lg p-3">
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

              {/* Materials Used — With Photo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-sm">
                    วัสดุที่ใช้แล้ว — มีรูปถ่าย ({usedWithPhoto.length})
                  </span>
                </div>
                {usedWithPhoto.length > 0 ? (
                  <div className="border border-green-200 rounded-lg divide-y divide-green-100">
                    {usedWithPhoto.map((item) => (
                      <div key={item.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.product_ref && `REF: ${item.product_ref}`}
                              {item.lot_number && ` | LOT: ${item.lot_number}`}
                            </p>
                          </div>
                          <Badge variant="success" size="sm">
                            {item.used_quantity || item.quantity} ชิ้น
                          </Badge>
                        </div>
                        {/* Photo thumbnails */}
                        {item.photo_evidence && item.photo_evidence.length > 0 && (
                          <div className="flex gap-1.5 mt-2 overflow-x-auto">
                            {item.photo_evidence.map((url, idx) => (
                              <div
                                key={idx}
                                className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200"
                              >
                                <img
                                  src={url}
                                  alt={`หลักฐาน ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            <div className="flex items-center shrink-0">
                              <Camera className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-xs text-green-600 ml-1">
                                {item.photo_evidence.length}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-1">ไม่มี</p>
                )}
              </div>

              {/* Materials Used — Without Photo (BLOCKING) */}
              {usedWithoutPhoto.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-sm text-red-700">
                      ยังไม่ได้ถ่ายรูป ({usedWithoutPhoto.length} รายการ)
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-300 rounded-lg divide-y divide-red-100">
                    {usedWithoutPhoto.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
                          <div>
                            <p className="font-medium text-sm text-red-900">
                              {item.product_name}
                            </p>
                            <p className="text-xs text-red-400">
                              {item.product_ref && `REF: ${item.product_ref}`}
                              {item.lot_number && ` | LOT: ${item.lot_number}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant="danger" size="sm">
                          {item.used_quantity || item.quantity} ชิ้น
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-600 font-medium">
                    กรุณากลับไปถ่ายรูปหลักฐานให้ครบก่อนปิดเคส
                  </p>
                </div>
              )}

              {/* Unused items — will be returned */}
              {(unusedItems.length > 0 || pendingItems.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Undo2 className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-sm">
                      วัสดุที่ไม่ได้ใช้ — จะคืนสต็อก (
                      {unusedItems.length + pendingItems.length})
                    </span>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg divide-y divide-orange-100">
                    {[...unusedItems, ...pendingItems].map((item) => (
                      <div
                        key={item.id}
                        className="p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {item.product_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.product_ref && `REF: ${item.product_ref}`}
                            {item.lot_number && ` | LOT: ${item.lot_number}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="gray" size="sm">
                            {item.status === 'prepared'
                              ? 'เตรียมแล้ว'
                              : item.status === 'confirmed'
                                ? 'ยืนยันแล้ว'
                                : 'รอดำเนินการ'}
                          </Badge>
                          <Badge variant="warning" size="sm">
                            {item.quantity} ชิ้น
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-orange-600">
                    วัสดุเหล่านี้จะถูกยกเลิกการจองและคืนกลับสู่สต็อก
                  </p>
                </div>
              )}

              {/* No materials at all */}
              {usedItems.length === 0 &&
                unusedItems.length === 0 &&
                pendingItems.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    ไม่มีรายการวัสดุในเคสนี้
                  </p>
                )}

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
            </>
          ) : (
            /* Step 2: Confirmation */
            <>
              <div className="text-center py-2">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="font-semibold text-lg text-gray-900 mb-1">
                  ยืนยันการปิดเคสและตัดสต็อก
                </h4>
                <p className="text-sm text-gray-500">
                  กรุณาตรวจสอบรายการด้านล่างก่อนยืนยัน
                </p>
              </div>

              {/* Summary Box */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">เคส</span>
                  <span className="font-semibold">{caseItem.case_number}</span>
                  <span className="text-gray-400">|</span>
                  <span>{caseItem.patient_name}</span>
                </div>

                <div className="h-px bg-gray-200" />

                {/* Deduct summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600 mb-1">ตัดสต็อก</p>
                    <p className="text-xl font-bold text-green-700">
                      {usedItems.length}{' '}
                      <span className="text-sm font-normal">รายการ</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {totalPiecesUsed} ชิ้น
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-orange-600 mb-1">คืนสต็อก</p>
                    <p className="text-xl font-bold text-orange-700">
                      {unusedItems.length + pendingItems.length}{' '}
                      <span className="text-sm font-normal">รายการ</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {totalPiecesReturned} ชิ้น
                    </p>
                  </div>
                </div>

                {/* Photo evidence summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">หลักฐานรูปถ่าย</span>
                  <span
                    className={
                      usedWithoutPhoto.length > 0
                        ? 'text-amber-600 font-medium'
                        : 'text-green-600 font-medium'
                    }
                  >
                    {usedWithPhoto.length}/{usedItems.length} รายการมีรูป
                  </span>
                </div>

                {notes && (
                  <>
                    <div className="h-px bg-gray-200" />
                    <div className="text-sm">
                      <span className="text-gray-500">หมายเหตุ: </span>
                      <span className="text-gray-700">{notes}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
                  <p>
                    ระบบจะตัดสต็อกวัสดุที่ใช้ คืนวัสดุที่ไม่ได้ใช้
                    และเปลี่ยนสถานะเคสเป็นเสร็จสิ้น
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-3">
          {step === 'review' ? (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleClose}
              >
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setStep('confirm')}
                disabled={usedWithoutPhoto.length > 0}
              >
                {usedWithoutPhoto.length > 0
                  ? `ขาดรูป ${usedWithoutPhoto.length} รายการ`
                  : 'ตรวจสอบแล้ว'}
                {usedWithoutPhoto.length === 0 && (
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setStep('review')}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                กลับ
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'กำลังปิดเคส...' : 'ยืนยันปิดเคส'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
