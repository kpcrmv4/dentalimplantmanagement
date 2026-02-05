'use client';

import Link from 'next/link';
import { ShoppingCart, AlertTriangle, Clock, Package } from 'lucide-react';
import { Badge } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import type { PendingStockRequest } from '@/types/database';

interface OutOfStockRequestsProps {
  requests: PendingStockRequest[];
}

export function OutOfStockRequests({ requests }: OutOfStockRequestsProps) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            คำขอสินค้าที่ไม่มีในสต็อก
          </h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">สินค้าที่ทันตแพทย์จองแต่ไม่มีในคลัง</p>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-600 font-medium">ไม่มีคำขอรอดำเนินการ</p>
        </div>
      </div>
    );
  }

  const getUrgencyBadge = (urgency: string, daysUntil: number) => {
    if (urgency === 'urgent') {
      return (
        <Badge variant="danger" size="sm">
          ด่วน! {daysUntil <= 0 ? 'วันนี้' : `${daysUntil} วัน`}
        </Badge>
      );
    }
    if (urgency === 'soon') {
      return <Badge variant="warning" size="sm">{daysUntil} วัน</Badge>;
    }
    return <Badge variant="gray" size="sm">{daysUntil} วัน</Badge>;
  };

  // Group by urgency
  const urgentRequests = requests.filter((r) => r.urgency === 'urgent');
  const soonRequests = requests.filter((r) => r.urgency === 'soon');
  const normalRequests = requests.filter((r) => r.urgency === 'normal');

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              คำขอสินค้าที่ไม่มีในสต็อก
            </h3>
            <p className="text-sm text-gray-500">สินค้าที่ต้องสั่งซื้อเพิ่ม</p>
          </div>
        </div>
        <Badge variant="danger">{requests.length} รายการ</Badge>
      </div>

      <div className="space-y-4 max-h-80 overflow-y-auto">
        {/* Urgent requests */}
        {urgentRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-600">
                ด่วนมาก ({urgentRequests.length})
              </span>
            </div>
            <div className="space-y-2">
              {urgentRequests.map((request) => (
                <RequestItem key={request.reservation_id} request={request} />
              ))}
            </div>
          </div>
        )}

        {/* Soon requests */}
        {soonRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-600">
                เร็วๆ นี้ ({soonRequests.length})
              </span>
            </div>
            <div className="space-y-2">
              {soonRequests.map((request) => (
                <RequestItem key={request.reservation_id} request={request} />
              ))}
            </div>
          </div>
        )}

        {/* Normal requests */}
        {normalRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">
                ปกติ ({normalRequests.length})
              </span>
            </div>
            <div className="space-y-2">
              {normalRequests.map((request) => (
                <RequestItem key={request.reservation_id} request={request} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <Link
          href="/inventory?filter=out_of_stock"
          className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
        >
          ดูทั้งหมด →
        </Link>
        <Link
          href="/orders/new"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          สร้างใบสั่งซื้อ →
        </Link>
      </div>
    </div>
  );
}

function RequestItem({ request }: { request: PendingStockRequest }) {
  const getUrgencyBadge = (urgency: string, daysUntil: number) => {
    if (urgency === 'urgent') {
      return (
        <Badge variant="danger" size="sm">
          {daysUntil <= 0 ? 'วันนี้!' : `${daysUntil} วัน`}
        </Badge>
      );
    }
    if (urgency === 'soon') {
      return <Badge variant="warning" size="sm">{daysUntil} วัน</Badge>;
    }
    return <Badge variant="gray" size="sm">{daysUntil} วัน</Badge>;
  };

  return (
    <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm">
              {request.product_name}
            </span>
            {getUrgencyBadge(request.urgency, request.days_until_surgery)}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span>REF: {request.requested_ref || request.ref_number || request.sku}</span>
            {request.requested_lot && <span>LOT: {request.requested_lot}</span>}
            <span>จำนวน: {request.quantity}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <Link
          href={`/cases/${request.case_id}`}
          className="text-blue-600 hover:text-blue-700"
        >
          เคส {request.case_number}
        </Link>
        <span>ผ่าตัด {formatDate(request.surgery_date)}</span>
        <span>ทพ. {request.dentist_name}</span>
      </div>
    </div>
  );
}
