'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Stethoscope,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Badge, Card, Input, Select } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { useCases, useUsers } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import {
  formatDate,
  formatTime,
  getCaseStatusText,
  cn,
} from '@/lib/utils';
import { getCaseStatusVariant } from '@/lib/status';

const statusOptions = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'gray', label: 'ยังไม่จอง' },
  { value: 'green', label: 'พร้อม' },
  { value: 'yellow', label: 'รอของ' },
  { value: 'red', label: 'ขาด' },
  { value: 'completed', label: 'เสร็จสิ้น' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

export default function CasesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dentistFilter, setDentistFilter] = useState('');

  const { data: cases, isLoading, mutate } = useCases();
  const { data: dentists } = useUsers('dentist');

  const canCreateCase = user?.role === 'admin' || user?.role === 'dentist' || user?.role === 'cs';
  const canEditCase = user?.role === 'admin' || user?.role === 'dentist' || user?.role === 'cs';

  const filteredCases = useMemo(() => {
    if (!cases) return [];

    return cases.filter((c) => {
      const matchesSearch =
        !search ||
        c.case_number.toLowerCase().includes(search.toLowerCase()) ||
        c.patient?.hn_number?.toLowerCase().includes(search.toLowerCase()) ||
        c.patient?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.patient?.last_name?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || c.status === statusFilter;
      const matchesDentist = !dentistFilter || c.dentist_id === dentistFilter;

      return matchesSearch && matchesStatus && matchesDentist;
    });
  }, [cases, search, statusFilter, dentistFilter]);

  const dentistOptions = [
    { value: '', label: 'ทันตแพทย์ทั้งหมด' },
    ...(dentists?.map((d) => ({ value: d.id, label: d.full_name })) || []),
  ];

  return (
    <div className="min-h-screen">
      <Header
        title="เคสผ่าตัดรากเทียม"
        subtitle="จัดการเคสผ่าตัดและติดตามสถานะ"
        actions={
          canCreateCase ? (
            <Link href="/cases/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                สร้างเคสใหม่
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          {/* Filters */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row sm:gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="ค้นหาเคส, ชื่อคนไข้..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40"
              />
              <Select
                options={dentistOptions}
                value={dentistFilter}
                onChange={(e) => setDentistFilter(e.target.value)}
                className="w-full sm:w-48"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">ไม่พบเคสที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>เลขเคส</TableHead>
                  <TableHead>คนไข้</TableHead>
                  <TableHead className="hidden sm:table-cell">รหัสคนไข้</TableHead>
                  <TableHead className="hidden md:table-cell">ทันตแพทย์</TableHead>
                  <TableHead>วันผ่าตัด</TableHead>
                  <TableHead className="hidden lg:table-cell">เวลา</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ยืนยันนัด</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem) => (
                  <TableRow
                    key={caseItem.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/cases/${caseItem.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {caseItem.case_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>
                          {caseItem.patient
                            ? `${caseItem.patient.first_name} ${caseItem.patient.last_name}`
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="font-mono text-sm text-gray-600">
                        {caseItem.patient?.hn_number || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-gray-400" />
                        <span>{caseItem.dentist?.full_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(caseItem.surgery_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {caseItem.surgery_time
                            ? formatTime(caseItem.surgery_time)
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCaseStatusVariant(caseItem.status)} dot>
                        {getCaseStatusText(caseItem.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = caseItem.confirmation_status || 'pending';
                        const configs: Record<string, { variant: 'gray' | 'success' | 'warning' | 'danger'; text: string }> = {
                          pending: { variant: 'gray', text: 'รอโทร' },
                          confirmed: { variant: 'success', text: 'ยืนยัน' },
                          postponed: { variant: 'warning', text: 'เลื่อน' },
                          cancelled: { variant: 'danger', text: 'ยกเลิก' },
                        };
                        const config = configs[status] || configs.pending;
                        return (
                          <Badge variant={config.variant} size="sm" dot>
                            {config.text}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/cases/${caseItem.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {canEditCase && (
                          <Link
                            href={`/cases/${caseItem.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
