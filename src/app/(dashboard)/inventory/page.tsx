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
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  Trash2,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Badge, Modal, ModalFooter } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useInventory, useProducts, usePendingStockRequests, useCategories } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency, daysUntil, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { PendingStockRequest } from '@/types/database';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState(filterParam || '');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PendingStockRequest | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: inventory, isLoading, mutate } = useInventory();
  const { data: products } = useProducts();
  const { data: pendingRequests, mutate: mutatePendingRequests } = usePendingStockRequests();
  const { data: categories, mutate: mutateCategories } = useCategories();

  // Check if user can manage stock
  const canManageStock = user?.role === 'admin' || user?.role === 'stock_staff';

  // Category CRUD functions
  const handleSaveCategory = async () => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('product_categories')
          .update(categoryForm)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('แก้ไขหมวดหมู่เรียบร้อย');
      } else {
        const { error } = await supabase
          .from('product_categories')
          .insert(categoryForm);
        if (error) throw error;
        toast.success('เพิ่มหมวดหมู่เรียบร้อย');
      }
      mutateCategories();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('ต้องการลบหมวดหมู่นี้?')) return;
    try {
      const { error } = await supabase.from('product_categories').delete().eq('id', id);
      if (error) throw error;
      toast.success('ลบหมวดหมู่เรียบร้อย');
      mutateCategories();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // Handle sort toggle
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon for column header
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
  };

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];

    let filtered = inventory.filter((item) => {
      const matchesSearch =
        !search ||
        item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
        item.product?.ref_number?.toLowerCase().includes(search.toLowerCase()) ||
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
      } else if (stockFilter === 'out_of_stock') {
        matchesStock = item.available_quantity <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'ref':
            aValue = a.product?.ref_number || a.product?.sku || '';
            bValue = b.product?.ref_number || b.product?.sku || '';
            break;
          case 'name':
            aValue = a.product?.name || '';
            bValue = b.product?.name || '';
            break;
          case 'lot':
            aValue = a.lot_number || '';
            bValue = b.lot_number || '';
            break;
          case 'quantity':
            aValue = a.available_quantity;
            bValue = b.available_quantity;
            break;
          case 'reserved':
            aValue = a.reserved_quantity;
            bValue = b.reserved_quantity;
            break;
          case 'expiry':
            aValue = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
            bValue = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
            break;
          case 'location':
            aValue = a.location || '';
            bValue = b.location || '';
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc'
            ? aValue.localeCompare(bValue, 'th')
            : bValue.localeCompare(aValue, 'th');
        }

        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [inventory, search, categoryFilter, stockFilter, sortField, sortDirection]);

  const stockFilterOptions = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'low-stock', label: 'สต็อกต่ำ' },
    { value: 'out_of_stock', label: 'หมดสต็อก' },
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

  const handleViewRequest = (request: PendingStockRequest) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  };

  const handleResolveRequest = async (request: PendingStockRequest) => {
    try {
      // Update reservation status to confirmed (stock has been ordered/received)
      const { error } = await supabase
        .from('case_reservations')
        .update({
          is_out_of_stock: false,
          status: 'confirmed',
        })
        .eq('id', request.reservation_id);

      if (error) throw error;

      toast.success('อัพเดทสถานะเรียบร้อย');
      mutatePendingRequests();
      setShowRequestModal(false);
    } catch (error) {
      console.error('Error resolving request:', error);
      toast.error('เกิดข้อผิดพลาด');
    }
  };

  // Count stats
  const urgentRequestsCount = pendingRequests?.filter(r => r.urgency === 'urgent').length || 0;
  const soonRequestsCount = pendingRequests?.filter(r => r.urgency === 'soon').length || 0;
  const totalRequestsCount = pendingRequests?.length || 0;

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

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Out of Stock Requests Alert */}
        {canManageStock && totalRequestsCount > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-purple-900">
                      คำขอสินค้าที่ไม่มีในสต็อก
                    </CardTitle>
                    <p className="text-sm text-purple-700">
                      สินค้าที่ทันตแพทย์จองแต่ไม่มีในคลัง - ต้องสั่งซื้อเพิ่ม
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {urgentRequestsCount > 0 && (
                    <Badge variant="danger">{urgentRequestsCount} ด่วนมาก</Badge>
                  )}
                  {soonRequestsCount > 0 && (
                    <Badge variant="warning">{soonRequestsCount} เร็วๆ นี้</Badge>
                  )}
                  <Badge variant="gray">{totalRequestsCount} รายการ</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {pendingRequests?.map((request) => (
                  <div
                    key={request.reservation_id}
                    className={cn(
                      'p-4 rounded-lg border bg-white cursor-pointer hover:shadow-md transition-shadow',
                      request.urgency === 'urgent' && 'border-red-200',
                      request.urgency === 'soon' && 'border-yellow-200',
                      request.urgency === 'normal' && 'border-gray-200'
                    )}
                    onClick={() => handleViewRequest(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {request.product_name}
                          </span>
                          {request.urgency === 'urgent' && (
                            <Badge variant="danger" size="sm">
                              ด่วน! {request.days_until_surgery <= 0 ? 'วันนี้' : `${request.days_until_surgery} วัน`}
                            </Badge>
                          )}
                          {request.urgency === 'soon' && (
                            <Badge variant="warning" size="sm">
                              {request.days_until_surgery} วัน
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span>REF: {request.requested_ref || request.ref_number || request.sku}</span>
                          {request.requested_lot && <span>LOT: {request.requested_lot}</span>}
                          <span>จำนวน: {request.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <Link
                          href={`/cases/${request.case_id}`}
                          className="text-blue-600 hover:text-blue-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          เคส {request.case_number}
                        </Link>
                        <p className="text-gray-500">
                          ผ่าตัด {formatDate(request.surgery_date)}
                        </p>
                        <p className="text-gray-500">
                          ทพ. {request.dentist_name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200 flex items-center justify-between">
                <Link
                  href="/orders/new"
                  className="text-sm font-medium text-purple-600 hover:text-purple-700"
                >
                  สร้างใบสั่งซื้อ →
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
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
                    (i) => i.available_quantity <= (i.product?.min_stock_level || 0) && i.available_quantity > 0
                  ).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">หมดสต็อก</p>
                <p className="text-xl font-bold text-red-600">
                  {inventory?.filter((i) => i.available_quantity <= 0).length || 0}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ใกล้หมดอายุ</p>
                <p className="text-xl font-bold text-orange-600">
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

        {/* Category Management Section */}
        {canManageStock && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                หมวดหมู่สินค้า
              </CardTitle>
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryForm({ name: '', description: '' });
                  setShowCategoryModal(true);
                }}
              >
                เพิ่มหมวดหมู่
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories?.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
                  >
                    <span className="font-medium">{category.name}</span>
                    {category.description && (
                      <span className="text-sm text-gray-500">({category.description})</span>
                    )}
                    <button
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({
                          name: category.name,
                          description: category.description || '',
                        });
                        setShowCategoryModal(true);
                      }}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <Edit className="w-3 h-3 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                ))}
                {(!categories || categories.length === 0) && (
                  <p className="text-gray-500 text-sm">ยังไม่มีหมวดหมู่</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          {/* Filters */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="ค้นหารหัส, REF, ชื่อสินค้า, Lot..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Select
              options={stockFilterOptions}
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full sm:w-40"
            />
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
                  <TableHead>
                    <button
                      onClick={() => handleSort('ref')}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      REF / SKU
                      {getSortIcon('ref')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      ชื่อสินค้า
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('lot')}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      Lot Number
                      {getSortIcon('lot')}
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort('quantity')}
                      className="flex items-center justify-center hover:text-blue-600 transition-colors w-full"
                    >
                      คงเหลือ
                      {getSortIcon('quantity')}
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      onClick={() => handleSort('reserved')}
                      className="flex items-center justify-center hover:text-blue-600 transition-colors w-full"
                    >
                      จอง
                      {getSortIcon('reserved')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('expiry')}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      วันหมดอายุ
                      {getSortIcon('expiry')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('location')}
                      className="flex items-center hover:text-blue-600 transition-colors"
                    >
                      ที่เก็บ
                      {getSortIcon('location')}
                    </button>
                  </TableHead>
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
                        <div>
                          <span className="font-medium text-blue-600">
                            {item.product?.ref_number || item.product?.sku}
                          </span>
                          {item.product?.ref_number && (
                            <p className="text-xs text-gray-400">{item.product?.sku}</p>
                          )}
                        </div>
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

      {/* Request Detail Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title="รายละเอียดคำขอสินค้า"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className={cn(
              'p-4 rounded-lg',
              selectedRequest.urgency === 'urgent' && 'bg-red-50',
              selectedRequest.urgency === 'soon' && 'bg-yellow-50',
              selectedRequest.urgency === 'normal' && 'bg-gray-50'
            )}>
              <div className="flex items-center gap-2 mb-2">
                {selectedRequest.urgency === 'urgent' && (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-700">ด่วนมาก!</span>
                    <Badge variant="danger">
                      ผ่าตัดใน {selectedRequest.days_until_surgery <= 0 ? 'วันนี้' : `${selectedRequest.days_until_surgery} วัน`}
                    </Badge>
                  </>
                )}
                {selectedRequest.urgency === 'soon' && (
                  <>
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-700">เร็วๆ นี้</span>
                    <Badge variant="warning">
                      ผ่าตัดใน {selectedRequest.days_until_surgery} วัน
                    </Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-600">
                กรุณาสั่งซื้อสินค้านี้โดยเร็วเพื่อให้ทันกับวันผ่าตัด
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">สินค้า:</span>
                <p className="font-medium">{selectedRequest.product_name}</p>
              </div>
              <div>
                <span className="text-gray-500">REF ที่ต้องการ:</span>
                <p className="font-medium">{selectedRequest.requested_ref || selectedRequest.ref_number || selectedRequest.sku}</p>
              </div>
              {selectedRequest.requested_lot && (
                <div>
                  <span className="text-gray-500">LOT ที่ต้องการ:</span>
                  <p className="font-medium">{selectedRequest.requested_lot}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">จำนวน:</span>
                <p className="font-medium">{selectedRequest.quantity}</p>
              </div>
              <div>
                <span className="text-gray-500">เคส:</span>
                <Link href={`/cases/${selectedRequest.case_id}`} className="font-medium text-blue-600 hover:text-blue-700">
                  {selectedRequest.case_number}
                </Link>
              </div>
              <div>
                <span className="text-gray-500">วันผ่าตัด:</span>
                <p className="font-medium">{formatDate(selectedRequest.surgery_date)}</p>
              </div>
              <div>
                <span className="text-gray-500">ทันตแพทย์:</span>
                <p className="font-medium">ทพ. {selectedRequest.dentist_name}</p>
              </div>
              <div>
                <span className="text-gray-500">วันที่ขอ:</span>
                <p className="font-medium">{formatDate(selectedRequest.requested_at)}</p>
              </div>
            </div>

            {selectedRequest.requested_specs && Object.keys(selectedRequest.requested_specs).length > 0 && (
              <div>
                <span className="text-gray-500 text-sm">รายละเอียดเพิ่มเติม:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Object.entries(selectedRequest.requested_specs).map(([key, value]) => (
                    value && (
                      <span key={key} className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {key}: {value}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowRequestModal(false)}>
            ปิด
          </Button>
          <Link href="/orders/new">
            <Button leftIcon={<ShoppingCart className="w-4 h-4" />}>
              สร้างใบสั่งซื้อ
            </Button>
          </Link>
          {selectedRequest && canManageStock && (
            <Button
              variant="primary"
              onClick={() => handleResolveRequest(selectedRequest)}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              มีสินค้าแล้ว
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}
      >
        <div className="space-y-4">
          <Input
            label="ชื่อหมวดหมู่ *"
            value={categoryForm.name}
            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              rows={2}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSaveCategory} isLoading={isSubmitting}>
            บันทึก
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
