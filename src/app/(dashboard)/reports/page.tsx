'use client';

import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Package,
  Calendar,
  Users,
  Download,
  Filter,
  FileText,
  PieChart,
  Activity,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Select, Badge, ConfirmModal } from '@/components/ui';
import { useCases, useInventory, useOrders, usePatients } from '@/hooks/useApi';
import { formatCurrency, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('month');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('');

  const { data: cases } = useCases();
  const { data: inventory } = useInventory();
  const { data: orders } = useOrders();
  const { data: patients } = usePatients();

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const casesThisMonth = cases?.filter(
      (c) => new Date(c.surgery_date) >= startOfMonth
    ).length || 0;

    const casesThisYear = cases?.filter(
      (c) => new Date(c.surgery_date) >= startOfYear
    ).length || 0;

    const completedCases = cases?.filter((c) => c.status === 'completed').length || 0;
    const pendingCases = cases?.filter(
      (c) => !['completed', 'cancelled'].includes(c.status)
    ).length || 0;

    const lowStockItems = inventory?.filter(
      (i) => i.available_quantity <= (i.product?.min_stock_level || 0)
    ).length || 0;

    const totalInventoryValue = inventory?.reduce(
      (sum, i) => sum + (i.available_quantity * (i.unit_cost || 0)),
      0
    ) || 0;

    const totalOrdersThisMonth = orders?.filter(
      (o) => o.order_date && new Date(o.order_date) >= startOfMonth
    ).reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

    const pendingOrders = orders?.filter(
      (o) => ['pending', 'approved', 'ordered', 'shipped'].includes(o.status)
    ).length || 0;

    return {
      casesThisMonth,
      casesThisYear,
      completedCases,
      pendingCases,
      lowStockItems,
      totalInventoryValue,
      totalOrdersThisMonth,
      pendingOrders,
      totalPatients: patients?.length || 0,
    };
  }, [cases, inventory, orders, patients]);

  // Case status breakdown
  const caseStatusBreakdown = useMemo(() => {
    if (!cases) return [];

    const statusCounts: Record<string, number> = {};
    cases.forEach((c) => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });

    const statusLabels: Record<string, string> = {
      gray: 'รอดำเนินการ',
      yellow: 'รอวัสดุ',
      green: 'พร้อม',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      label: statusLabels[status] || status,
      count,
      percentage: Math.round((count / cases.length) * 100),
    }));
  }, [cases]);

  // Monthly cases trend
  const monthlyTrend = useMemo(() => {
    if (!cases) return [];

    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[key] = 0;
    }

    cases.forEach((c) => {
      const date = new Date(c.surgery_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (months[key] !== undefined) {
        months[key]++;
      }
    });

    return Object.entries(months).map(([month, count]) => ({
      month,
      label: new Date(month + '-01').toLocaleDateString('th-TH', {
        month: 'short',
        year: '2-digit',
      }),
      count,
    }));
  }, [cases]);

  const handleExport = (type: string) => {
    setExportType(type);
    setShowExportModal(true);
  };

  return (
    <div className="min-h-screen">
      <Header
        title="รายงาน"
        subtitle="ดูสถิติและรายงานของระบบ"
        actions={
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => handleExport('overview')}
          >
            ส่งออกรายงาน
          </Button>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">เคสเดือนนี้</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.casesThisMonth}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">เคสที่เสร็จสิ้น</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.completedCases}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">สต็อกต่ำ</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.lowStockItems}
                </p>
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">คนไข้ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalPatients}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Case Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                สถานะเคส
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseStatusBreakdown.length > 0 ? (
                <div className="space-y-4">
                  {caseStatusBreakdown.map((item) => (
                    <div key={item.status}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className="text-sm font-medium">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            item.status === 'completed'
                              ? 'bg-green-500'
                              : item.status === 'green'
                              ? 'bg-emerald-500'
                              : item.status === 'yellow'
                              ? 'bg-yellow-500'
                              : item.status === 'cancelled'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">ไม่มีข้อมูล</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                แนวโน้มเคสรายเดือน
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length > 0 ? (
                <div className="flex items-end justify-between h-48 gap-2">
                  {monthlyTrend.map((item) => {
                    const maxCount = Math.max(...monthlyTrend.map((m) => m.count));
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center">
                        <span className="text-sm font-medium mb-2">{item.count}</span>
                        <div
                          className="w-full bg-blue-500 rounded-t-lg transition-all"
                          style={{ height: `${Math.max(height, 5)}%` }}
                        />
                        <span className="text-xs text-gray-500 mt-2">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">ไม่มีข้อมูล</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>มูลค่าสต็อก</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(stats.totalInventoryValue)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                รวม {inventory?.length || 0} รายการ
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ยอดสั่งซื้อเดือนนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(stats.totalOrdersThisMonth)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                รอดำเนินการ {stats.pendingOrders} รายการ
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>เคสปีนี้</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {stats.casesThisYear}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                รอดำเนินการ {stats.pendingCases} เคส
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              รายงานที่สามารถส่งออก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => handleExport('cases')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <Calendar className="w-8 h-8 text-blue-500 mb-2" />
                <h3 className="font-medium">รายงานเคส</h3>
                <p className="text-sm text-gray-500">
                  รายละเอียดเคสทั้งหมดพร้อมสถานะ
                </p>
              </button>
              <button
                onClick={() => handleExport('inventory')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <Package className="w-8 h-8 text-green-500 mb-2" />
                <h3 className="font-medium">รายงานสต็อก</h3>
                <p className="text-sm text-gray-500">
                  รายการสต็อกและมูลค่าคงเหลือ
                </p>
              </button>
              <button
                onClick={() => handleExport('orders')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <BarChart3 className="w-8 h-8 text-purple-500 mb-2" />
                <h3 className="font-medium">รายงานการสั่งซื้อ</h3>
                <p className="text-sm text-gray-500">
                  ประวัติการสั่งซื้อและยอดรวม
                </p>
              </button>
              <button
                onClick={() => handleExport('patients')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <Users className="w-8 h-8 text-orange-500 mb-2" />
                <h3 className="font-medium">รายงานคนไข้</h3>
                <p className="text-sm text-gray-500">
                  รายชื่อคนไข้และประวัติการรักษา
                </p>
              </button>
              <button
                onClick={() => handleExport('usage')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <Activity className="w-8 h-8 text-red-500 mb-2" />
                <h3 className="font-medium">รายงานการใช้วัสดุ</h3>
                <p className="text-sm text-gray-500">
                  สถิติการใช้วัสดุแต่ละประเภท
                </p>
              </button>
              <button
                onClick={() => handleExport('expiry')}
                className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <TrendingUp className="w-8 h-8 text-yellow-500 mb-2" />
                <h3 className="font-medium">รายงานวันหมดอายุ</h3>
                <p className="text-sm text-gray-500">
                  สินค้าที่ใกล้หมดอายุ
                </p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Confirmation */}
      <ConfirmModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={() => {
          setShowExportModal(false);
          // In a real app, this would generate and download a report
          toast.success(`กำลังเตรียมรายงาน ${exportType}...`);
        }}
        title="ส่งออกรายงาน"
        message={`ต้องการส่งออกรายงาน ${exportType}? ระบบจะเตรียมไฟล์ให้ดาวน์โหลด`}
        variant="info"
        confirmText="ส่งออก"
        cancelText="ยกเลิก"
      />
    </div>
  );
}
