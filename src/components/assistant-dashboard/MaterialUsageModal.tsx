'use client';

import { useState } from 'react';
import { X, Package, AlertTriangle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { PhotoUpload } from './PhotoUpload';
import type { AssistantReservationItem } from '@/types/database';

interface MaterialUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: AssistantReservationItem | null;
  onConfirm: (photoUrls: string[]) => Promise<void>;
}

export function MaterialUsageModal({
  isOpen,
  onClose,
  reservation,
  onConfirm,
}: MaterialUsageModalProps) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !reservation) return null;

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('กรุณาถ่ายรูปหลักฐานการใช้งานอย่างน้อย 1 รูป');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(photos);
      setPhotos([]); // Reset for next use
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPhotos([]);
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
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">บันทึกการใช้วัสดุ</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Material Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">
                  {reservation.product_name}
                </p>
                <div className="text-sm text-blue-700 mt-1 space-y-0.5">
                  {reservation.product_ref && (
                    <p>REF: {reservation.product_ref}</p>
                  )}
                  {reservation.lot_number && (
                    <p>LOT: {reservation.lot_number}</p>
                  )}
                  <p>จำนวน: {reservation.quantity} ชิ้น</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">ต้องถ่ายรูปหลักฐาน</p>
              <p>กรุณาถ่ายรูปวัสดุที่ใช้งานเพื่อเป็นหลักฐานการใช้</p>
            </div>
          </div>

          {/* Photo Upload */}
          <PhotoUpload
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
            required={true}
          />

          {/* Error Message */}
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
            disabled={isSubmitting || photos.length === 0}
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการใช้'}
          </Button>
        </div>
      </div>
    </div>
  );
}
