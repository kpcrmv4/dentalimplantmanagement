'use client';

import { useState } from 'react';
import { Package, CheckCircle, Clock, AlertCircle, Camera } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { MaterialUsageModal } from './MaterialUsageModal';
import type { AssistantReservationItem, ReservationStatus } from '@/types/database';

interface PickingListProps {
  reservations: AssistantReservationItem[];
  onMarkUsed: (reservationId: string, photoUrls: string[]) => Promise<void>;
}

export function PickingList({ reservations, onMarkUsed }: PickingListProps) {
  const [selectedReservation, setSelectedReservation] = useState<AssistantReservationItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusConfig = (status: ReservationStatus) => {
    const configs: Record<ReservationStatus, { icon: typeof CheckCircle; color: string; text: string; variant: 'success' | 'warning' | 'danger' | 'gray' }> = {
      used: { icon: CheckCircle, color: 'text-green-500', text: 'ใช้แล้ว', variant: 'success' },
      prepared: { icon: Package, color: 'text-blue-500', text: 'เตรียมแล้ว', variant: 'success' },
      confirmed: { icon: Clock, color: 'text-yellow-500', text: 'ยืนยันแล้ว', variant: 'warning' },
      pending: { icon: Clock, color: 'text-gray-500', text: 'รอดำเนินการ', variant: 'gray' },
      cancelled: { icon: AlertCircle, color: 'text-red-500', text: 'ยกเลิก', variant: 'danger' },
    };
    return configs[status];
  };

  const handleOpenModal = (reservation: AssistantReservationItem) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
    setIsModalOpen(false);
  };

  const handleConfirmUsage = async (photoUrls: string[]) => {
    if (!selectedReservation) return;
    await onMarkUsed(selectedReservation.id, photoUrls);
    handleCloseModal();
  };

  // Sort: pending/confirmed first, then prepared, then used
  const sortedReservations = [...reservations].sort((a, b) => {
    const order: Record<ReservationStatus, number> = {
      pending: 0,
      confirmed: 1,
      prepared: 2,
      used: 3,
      cancelled: 4,
    };
    return order[a.status] - order[b.status];
  });

  return (
    <div className="divide-y">
      {sortedReservations.map((reservation) => {
        const config = getStatusConfig(reservation.status);
        const StatusIcon = config.icon;
        const isUsed = reservation.status === 'used';
        const canMarkUsed = reservation.status === 'prepared' || reservation.status === 'confirmed';

        return (
          <div
            key={reservation.id}
            className={`p-4 ${isUsed ? 'bg-green-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                  <span className="font-medium text-sm truncate">
                    {reservation.product_name}
                  </span>
                </div>

                <div className="text-xs text-gray-500 space-y-0.5">
                  {reservation.product_ref && (
                    <p>REF: {reservation.product_ref}</p>
                  )}
                  {reservation.lot_number && (
                    <p>LOT: {reservation.lot_number}</p>
                  )}
                  {reservation.is_out_of_stock && (
                    <p className="text-orange-600">รอสั่งซื้อ</p>
                  )}
                </div>
              </div>

              {/* Quantity & Status */}
              <div className="flex flex-col items-end gap-2">
                <Badge variant={config.variant} size="sm">
                  {config.text}
                </Badge>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {isUsed ? `${reservation.used_quantity}/${reservation.quantity}` : reservation.quantity}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isUsed ? 'ใช้/จอง' : 'จำนวน'}
                  </p>
                </div>
              </div>
            </div>

            {/* Photo Evidence (if used) */}
            {isUsed && reservation.photo_evidence && reservation.photo_evidence.length > 0 && (
              <div className="mt-2 flex gap-1">
                {reservation.photo_evidence.slice(0, 3).map((photo, idx) => (
                  <div
                    key={idx}
                    className="w-12 h-12 rounded overflow-hidden bg-gray-100"
                  >
                    <img
                      src={photo}
                      alt={`หลักฐาน ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                {reservation.photo_evidence.length > 3 && (
                  <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    +{reservation.photo_evidence.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            {canMarkUsed && (
              <div className="mt-3">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenModal(reservation)}
                  disabled={reservation.is_out_of_stock}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  ถ่ายรูป & บันทึกการใช้
                </Button>
                {reservation.is_out_of_stock && (
                  <p className="text-xs text-orange-600 mt-1 text-center">
                    รอเจ้าหน้าที่สต็อกจัดหาวัสดุ
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {reservations.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>ไม่มีวัสดุในรายการ</p>
        </div>
      )}

      {/* Usage Modal */}
      <MaterialUsageModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        reservation={selectedReservation}
        onConfirm={handleConfirmUsage}
      />
    </div>
  );
}
