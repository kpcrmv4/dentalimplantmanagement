'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Package,
  Lock,
  CheckCircle,
  Calendar,
  Building2,
  FileText,
  ShoppingCart,
  Eye,
} from 'lucide-react';

interface POItem {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  product: {
    id: string;
    name: string;
    sku: string;
  };
}

interface POData {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  approved_at: string;
  created_at: string;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  items: POItem[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: 'ร่าง',
    pending: 'รออนุมัติ',
    approved: 'อนุมัติแล้ว',
    ordered: 'สั่งซื้อแล้ว',
    shipped: 'กำลังจัดส่ง',
    received: 'รับของแล้ว',
    cancelled: 'ยกเลิก',
  };
  return map[status] || status;
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-blue-100 text-blue-700',
    ordered: 'bg-indigo-100 text-indigo-700',
    shipped: 'bg-purple-100 text-purple-700',
    received: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export default function PublicPOPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<POData | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('กรุณากรอกรหัสลับ');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/po/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'เกิดข้อผิดพลาด');
        return;
      }

      setOrderData(data.order);
      setIsVerified(true);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg font-bold">D</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">DentalStock</h1>
            <p className="text-xs text-gray-500">Purchase Order Viewer</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!isVerified ? (
          /* ===== Code Entry Form ===== */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">ดูรายละเอียดใบสั่งซื้อ</h2>
                <p className="text-gray-500 mt-2 text-sm">กรุณากรอกรหัสลับ 5 ตัวที่ได้รับ</p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
                      setCode(val);
                    }}
                    placeholder="XXXXX"
                    maxLength={5}
                    className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 px-6 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-gray-300 placeholder:tracking-[0.5em]"
                    autoFocus
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || code.length < 5}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      กำลังตรวจสอบ...
                    </>
                  ) : (
                    <>
                      <Eye className="w-5 h-5" />
                      เปิดดูใบสั่งซื้อ
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : orderData ? (
          /* ===== PO Details View ===== */
          <div className="space-y-6">
            {/* PO Header */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{orderData.po_number}</h2>
                      <p className="text-blue-100 text-sm">ใบสั่งซื้อ</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(orderData.status)}`}>
                    <CheckCircle className="w-4 h-4" />
                    {getStatusText(orderData.status)}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">ซัพพลายเออร์</p>
                      <p className="font-medium text-gray-900 mt-1">{orderData.supplier?.name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">วันที่สั่งซื้อ</p>
                      <p className="font-medium text-gray-900 mt-1">{formatDate(orderData.order_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">กำหนดส่ง</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {orderData.expected_delivery_date ? formatDate(orderData.expected_delivery_date) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900">
                  รายการสินค้า ({orderData.items?.length || 0} รายการ)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">สินค้า</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">จำนวน</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">ราคาต่อหน่วย</th>
                      <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderData.items?.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{item.product?.name || '-'}</p>
                          <p className="text-xs text-gray-500">{item.product?.sku || ''}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-center text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center justify-between w-full sm:w-72">
                    <span className="text-sm text-gray-500">ยอดรวมสินค้า</span>
                    <span className="text-sm text-gray-900">{formatCurrency(orderData.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-72">
                    <span className="text-sm text-gray-500">ภาษี (7%)</span>
                    <span className="text-sm text-gray-900">{formatCurrency(orderData.tax_amount)}</span>
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-72 pt-2 border-t border-gray-300">
                    <span className="text-base font-semibold text-gray-900">ยอดรวมทั้งสิ้น</span>
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(orderData.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {orderData.notes && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <h3 className="text-lg font-semibold text-gray-900">หมายเหตุ</h3>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap">{orderData.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-sm text-gray-400 py-4">
              <p>เอกสารนี้สร้างโดยระบบ DentalStock Management</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
