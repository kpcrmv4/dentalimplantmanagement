'use client';

import { useState } from 'react';
import { Package, CheckCircle, Clock, AlertCircle, Camera, ImageIcon, AlertTriangle } from 'lucide-react';
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
    const configs: Record<ReservationStatus, {
      icon: typeof CheckCircle;
      color: string;
      bgColor: string;
      borderColor: string;
      text: string;
      variant: 'success' | 'warning' | 'danger' | 'gray';
    }> = {
      used: {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: 'ใช้แล้ว',
        variant: 'success',
      },
      prepared: {
        icon: Package,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        text: 'เตรียมแล้ว',
        variant: 'success',
      },
      confirmed: {
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        text: 'ยืนยันแล้ว',
        variant: 'warning',
      },
      pending: {
        icon: Clock,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        text: 'รอดำเนินการ',
        variant: 'gray',
      },
      cancelled: {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        text: 'ยกเลิก',
        variant: 'danger',
      },
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

  // Sort: prepared first (actionable), then confirmed, then pending, then used, then cancelled
  const sortedReservations = [...reservations].sort((a, b) => {
    const order: Record<ReservationStatus, number> = {
      prepared: 0,
      confirmed: 1,
      pending: 2,
      used: 3,
      cancelled: 4,
    };
    return order[a.status] - order[b.status];
  });

  if (reservations.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-gray-300" />
        </div>
        <p className="text-gray-500 text-sm">ไม่มีวัสดุในรายการ</p>
      </div>
    );
  }

  return (
    <div>
      {/* 2-column grid for material cards */}
      <div className="grid grid-cols-2 gap-2">
        {sortedReservations.map((reservation) => {
          const config = getStatusConfig(reservation.status);
          const StatusIcon = config.icon;
          const isUsed = reservation.status === 'used';
          const isCancelled = reservation.status === 'cancelled';
          const canMarkUsed = reservation.status === 'prepared' || reservation.status === 'confirmed';
          const hasPhotos = isUsed && reservation.photo_evidence && reservation.photo_evidence.length > 0;

          return (
            <div
              key={reservation.id}
              className={`rounded-xl border overflow-hidden ${config.borderColor} ${
                isUsed ? config.bgColor : 'bg-white'
              } ${isCancelled ? 'opacity-50' : ''}`}
            >
              {/* Status bar top */}
              <div className={`h-1 ${
                isUsed ? 'bg-green-500' :
                reservation.status === 'prepared' ? 'bg-blue-500' :
                reservation.status === 'confirmed' ? 'bg-yellow-500' :
                reservation.status === 'pending' ? 'bg-gray-300' :
                'bg-red-400'
              }`} />

              <div className="p-3">
                {/* Row 1: Product name + status */}
                <div className="flex items-start justify-between gap-1 mb-2">
                  <h5 className="font-semibold text-xs text-gray-900 leading-tight line-clamp-2 flex-1">
                    {reservation.product_name}
                  </h5>
                  <StatusIcon className={`w-4 h-4 shrink-0 ${config.color}`} />
                </div>

                {/* Row 2: Details */}
                <div className="space-y-0.5 mb-2">
                  {reservation.product_ref && (
                    <p className="text-[10px] text-gray-500 font-mono">
                      REF: {reservation.product_ref}
                    </p>
                  )}
                  {reservation.lot_number && (
                    <p className="text-[10px] text-gray-500 font-mono">
                      LOT: {reservation.lot_number}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {isUsed ? 'ใช้/จอง' : 'จำนวน'}
                    </span>
                    <span className="text-xs font-bold text-gray-700">
                      {isUsed ? `${reservation.used_quantity}/${reservation.quantity}` : `${reservation.quantity} ชิ้น`}
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="mb-2">
                  <Badge variant={config.variant} size="sm">
                    {config.text}
                  </Badge>
                </div>

                {/* Out of stock warning */}
                {reservation.is_out_of_stock && !isCancelled && (
                  <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1 mb-2">
                    <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                    <span className="text-[10px] text-orange-700 leading-tight">รอสั่งซื้อ</span>
                  </div>
                )}

                {/* Photo evidence section (when used) */}
                {hasPhotos && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1 mb-1">
                      <ImageIcon className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] text-green-600 font-medium">
                        ถ่ายรูปแล้ว ({reservation.photo_evidence!.length})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {reservation.photo_evidence!.slice(0, 2).map((photo, idx) => (
                        <div
                          key={idx}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
                        >
                          <img
                            src={photo}
                            alt={`หลักฐาน ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {reservation.photo_evidence!.length > 2 && (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                          <span className="text-[10px] text-gray-500 font-medium">
                            +{reservation.photo_evidence!.length - 2}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Used but no photos */}
                {isUsed && (!reservation.photo_evidence || reservation.photo_evidence.length === 0) && (
                  <div className="flex items-center gap-1 bg-green-50 rounded-lg px-2 py-1 mb-2">
                    <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="text-[10px] text-green-600">บันทึกแล้ว</span>
                  </div>
                )}

                {/* Action button */}
                {canMarkUsed && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => handleOpenModal(reservation)}
                    disabled={reservation.is_out_of_stock}
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    ถ่ายรูป
                  </Button>
                )}

                {canMarkUsed && reservation.is_out_of_stock && (
                  <p className="text-[10px] text-orange-600 mt-1 text-center leading-tight">
                    รอสต็อกจัดหาวัสดุ
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
