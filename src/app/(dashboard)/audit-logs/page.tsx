'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/layout';
import { Card, Button, Input, Select, Badge, Table } from '@/components/ui';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  User,
  Calendar,
  Clock,
  FileText,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const actionIcons: Record<string, React.ReactNode> = {
  INSERT: <Plus className="w-4 h-4 text-green-600" />,
  UPDATE: <Edit className="w-4 h-4 text-blue-600" />,
  DELETE: <Trash2 className="w-4 h-4 text-red-600" />,
  LOGIN: <LogIn className="w-4 h-4 text-purple-600" />,
  LOGOUT: <LogOut className="w-4 h-4 text-gray-600" />,
  LOGIN_FAILED: <AlertCircle className="w-4 h-4 text-red-600" />,
};

const actionLabels: Record<string, string> = {
  INSERT: 'สร้างข้อมูล',
  UPDATE: 'แก้ไขข้อมูล',
  DELETE: 'ลบข้อมูล',
  LOGIN: 'เข้าสู่ระบบ',
  LOGOUT: 'ออกจากระบบ',
  LOGIN_FAILED: 'เข้าสู่ระบบไม่สำเร็จ',
};

const actionColors: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'gray'> = {
  INSERT: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'success',
  LOGOUT: 'gray',
  LOGIN_FAILED: 'danger',
};

const tableLabels: Record<string, string> = {
  users: 'ผู้ใช้งาน',
  patients: 'คนไข้',
  products: 'สินค้า',
  inventory: 'สต็อก',
  cases: 'เคส',
  case_reservations: 'การจองวัสดุ',
  purchase_orders: 'ใบสั่งซื้อ',
  inventory_transfers: 'การโอนสต็อก',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply filters
      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }
      if (searchTerm) {
        query = query.or(`user_email.ilike.%${searchTerm}%,user_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, tableFilter, dateFrom, dateTo, searchTerm]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }
      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }
      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`);
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Convert to CSV
      const headers = ['วันที่', 'ผู้ใช้', 'อีเมล', 'บทบาท', 'การกระทำ', 'ตาราง', 'รายละเอียด', 'IP Address'];
      const rows = data?.map(log => [
        formatDateTime(log.created_at),
        log.user_name || '-',
        log.user_email || '-',
        log.user_role || '-',
        actionLabels[log.action] || log.action,
        tableLabels[log.table_name || ''] || log.table_name || '-',
        log.description || '-',
        log.ip_address || '-',
      ]);

      const csvContent = [
        headers.join(','),
        ...(rows?.map(row => row.map(cell => `"${cell}"`).join(',')) || []),
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <History className="w-7 h-7 text-blue-600" />
              ประวัติการใช้งานระบบ
            </h1>
            <p className="text-gray-600 mt-1">ดูประวัติทุกการเปลี่ยนแปลงในระบบ (Audit Log)</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchLogs}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              รีเฟรช
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="w-4 h-4" />}
            >
              ส่งออก CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="ค้นหาผู้ใช้, อีเมล, รายละเอียด..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">ทุกการกระทำ</option>
              <option value="INSERT">สร้างข้อมูล</option>
              <option value="UPDATE">แก้ไขข้อมูล</option>
              <option value="DELETE">ลบข้อมูล</option>
              <option value="LOGIN">เข้าสู่ระบบ</option>
              <option value="LOGOUT">ออกจากระบบ</option>
              <option value="LOGIN_FAILED">เข้าสู่ระบบไม่สำเร็จ</option>
            </Select>
            <Select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
            >
              <option value="all">ทุกตาราง</option>
              <option value="users">ผู้ใช้งาน</option>
              <option value="patients">คนไข้</option>
              <option value="products">สินค้า</option>
              <option value="inventory">สต็อก</option>
              <option value="cases">เคส</option>
              <option value="case_reservations">การจองวัสดุ</option>
              <option value="purchase_orders">ใบสั่งซื้อ</option>
            </Select>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="จากวันที่"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="ถึงวันที่"
              />
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">สร้างข้อมูล</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(l => l.action === 'INSERT').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">แก้ไขข้อมูล</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(l => l.action === 'UPDATE').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">ลบข้อมูล</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(l => l.action === 'DELETE').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <LogIn className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">เข้าสู่ระบบ</p>
                <p className="text-xl font-bold text-gray-900">
                  {logs.filter(l => l.action === 'LOGIN').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Logs Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่/เวลา
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้ใช้
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การกระทำ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ตาราง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รายละเอียด
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ดูเพิ่มเติม
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(log.created_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.created_at).toLocaleTimeString('th-TH')}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {log.user_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {log.user_name || '-'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {log.user_email || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {actionIcons[log.action]}
                          <Badge variant={actionColors[log.action] || 'default'}>
                            {actionLabels[log.action] || log.action}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {tableLabels[log.table_name || ''] || log.table_name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {log.description || '-'}
                        </p>
                        {log.changed_fields && log.changed_fields.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            แก้ไข: {log.changed_fields.join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-500 font-mono">
                          {log.ip_address || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                แสดง {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} จาก {totalCount} รายการ
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  หน้า {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  รายละเอียด Audit Log
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">วันที่/เวลา</p>
                    <p className="font-medium">{formatDateTime(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">การกระทำ</p>
                    <Badge variant={actionColors[selectedLog.action] || 'default'}>
                      {actionLabels[selectedLog.action] || selectedLog.action}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ผู้ใช้</p>
                    <p className="font-medium">{selectedLog.user_name || '-'}</p>
                    <p className="text-sm text-gray-500">{selectedLog.user_email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">บทบาท</p>
                    <p className="font-medium">{selectedLog.user_role || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ตาราง</p>
                    <p className="font-medium">
                      {tableLabels[selectedLog.table_name || ''] || selectedLog.table_name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Record ID</p>
                    <p className="font-mono text-sm">{selectedLog.record_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">User Agent</p>
                    <p className="text-sm truncate">{selectedLog.user_agent || '-'}</p>
                  </div>
                </div>

                {selectedLog.description && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">รายละเอียด</p>
                    <p className="text-gray-900">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.changed_fields && selectedLog.changed_fields.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ฟิลด์ที่เปลี่ยนแปลง</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedLog.changed_fields.map((field) => (
                        <Badge key={field} variant="default">{field}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.old_data && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ข้อมูลเดิม</p>
                    <pre className="bg-red-50 p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.new_data && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">ข้อมูลใหม่</p>
                    <pre className="bg-green-50 p-3 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
