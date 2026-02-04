'use client';

import Link from 'next/link';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { LowStockItem } from '@/types/database';

interface LowStockAlertProps {
  items: LowStockItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">รายการที่ใกล้หมด</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">รายการที่ต่ำกว่าเกณฑ์ขั้นต่ำ</p>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-green-600 font-medium">สต็อกอยู่ในระดับปกติ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900">รายการที่ใกล้หมด</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">รายการที่ต่ำกว่าเกณฑ์ขั้นต่ำ</p>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <Link
            key={item.product_id}
            href={`/inventory?product=${item.product_id}`}
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {item.product_name}
                </p>
                <p className="text-xs text-gray-500">{item.sku}</p>
              </div>
            </div>
            <Badge variant="danger" size="sm">
              {item.current_stock}/{item.min_stock_level}
            </Badge>
          </Link>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Link
          href="/inventory?filter=low-stock"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          ดูทั้งหมด →
        </Link>
      </div>
    </div>
  );
}
