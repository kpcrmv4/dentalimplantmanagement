'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  Calendar,
  MapPin,
  Eye,
  Edit,
  MoreVertical,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Input, Select, Badge } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useInventory, useProducts } from '@/hooks/useApi';
import { formatDate, formatCurrency, daysUntil, cn } from '@/lib/utils';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(filterParam || '');

  const { data: inventory, isLoading, mutate } = useInventory();
  const { data: products } = useProducts();

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    return inventory.filter((item) => {
      const matchesSearch =
        !search ||
        item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        item.lot_number?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        !categoryFilter || item.product?.category_id === categoryFilter;

      let matchesStock = true;
      if (stockFilter === 'low-stock') {
        matchesStock =
          item.available_quantity <= (item.product?.min_stock_level || 0);
      } else if (stockFilter === 'expiring') {
        const days = item.expiry_date ? daysUntil(item.expiry_date) : 999;
        matchesStock = days >= 0 && days <= 30;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [inventory, search, categoryFilter, stockFilter]);

  const stockFilterOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'low-stock', label: 'สต็อกต่ำ' },
    { value: 'expiring', label: 'ใกล้หมดอายุ' },
  ];

  const getExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return null;
    const days = daysUntil(expiryDate);
    if (days < 0) return { variant: 'danger' as const, text: 'หมดอายุแล้ว' };
    if (days <= 30) return { variant: 'warning' as const, text: `${days} วัน` };
    return null;
  };

  const getStockStatus = (available: number, minLevel: number) => {
    if (available <= 0) return { variant: 'danger' as const, text: 'หมด' };
    if (available <= minLevel) return { variant: 'warning' as const, text: 'ต่ำ' };
    return null;
  };

  return (
    <div className="min-h-screen">
      <Header
        title="สต็อกวัสดุและรากเทียม"
        subtitle="จัดการคลังสินค้าและติดตามสต็อก"
        actions={
          <div className="flex gap-2">
            <Link href="/inventory/receive">
              <Button variant="outline" leftIcon={<Package className="w-4 h-4" />}>
                รับของเข้า
              </Button>
            </Link>
            <Link href="/products/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                เพิ่มสินค้าใหม่
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">รายการทั้งหมด</p>
                <p className="text-xl font-bold text-gray-900">
                  {inventory?.length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">สต็อกต่ำ</p>
                <p className="text-xl font-bold text-yellow-600">
                  {inventory?.filter(
                    (i) => i.available_quantity <= (i.product?.min_stock_level || 0)
                  ).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ใกล้หมดอายุ</p>
                <p className="text-xl font-bold text-red-600">
                  {inventory?.filter((i) => {
                    if (!i.expiry_date) return false;
                    const days = daysUntil(i.expiry_date);
                    return days >= 0 && days <= 30;
                  }).length || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="ค้นหารหัส, ชื่อสินค้า, Lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-3">
              <Select
                options={stockFilterOptions}
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบรายการสต็อก</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัสสินค้า</TableHead>
                  <TableHead>ชื่อสินค้า</TableHead>
                  <TableHead>Lot Number</TableHead>
                  <TableHead className="text-center">คงเหลือ</TableHead>
                  <TableHead className="text-center">จอง</TableHead>
                  <TableHead>วันหมดอายุ</TableHead>
                  <TableHead>ที่เก็บ</TableHead>
                  <TableHead>สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const expiryStatus = getExpiryStatus(item.expiry_date);
                  const stockStatus = getStockStatus(
                    item.available_quantity,
                    item.product?.min_stock_level || 0
                  );

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {item.product?.sku}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.product?.brand}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{item.lot_number}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            'font-medium',
                            stockStatus?.variant === 'danger' && 'text-red-600',
                            stockStatus?.variant === 'warning' && 'text-yellow-600'
                          )}
                        >
                          {item.available_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.reserved_quantity > 0 ? (
                          <Badge variant="info" size="sm">
                            {item.reserved_quantity}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <div className="flex items-center gap-2">
                            <span>{formatDate(item.expiry_date)}</span>
                            {expiryStatus && (
                              <Badge variant={expiryStatus.variant} size="sm">
                                {expiryStatus.text}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{item.location}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {stockStatus && (
                          <Badge variant={stockStatus.variant} size="sm">
                            {stockStatus.text}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
