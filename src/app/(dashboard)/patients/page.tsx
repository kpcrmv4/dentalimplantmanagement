'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  Eye,
  Edit,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, Input, Badge, LoadingSpinner } from '@/components/ui';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { usePatients } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { formatDate } from '@/lib/utils';

export default function PatientsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const { data: patients, error: patientsError, isLoading, mutate } = usePatients(search);

  const canCreatePatient = user?.role === 'admin' || user?.role === 'cs' || user?.role === 'dentist';
  const canEditPatient = user?.role === 'admin' || user?.role === 'cs';

  return (
    <div className="min-h-screen">
      <Header
        title="รายชื่อคนไข้"
        subtitle="จัดการข้อมูลคนไข้ทั้งหมด"
        actions={
          canCreatePatient ? (
            <Link href="/patients/new">
              <Button leftIcon={<Plus className="w-4 h-4" />}>
                เพิ่มคนไข้ใหม่
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="ค้นหา HN, ชื่อ, นามสกุล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              className="max-w-md"
            />
          </div>

          {/* Table */}
          {isLoading ? (
            <LoadingSpinner onRetry={() => mutate()} />
          ) : patientsError ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-3">ไม่สามารถโหลดข้อมูลได้</p>
              <Button variant="outline" size="sm" onClick={() => mutate()}>
                ลองใหม่
              </Button>
            </div>
          ) : !patients || patients.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">ไม่พบข้อมูลคนไข้</p>
              <Link href="/patients/new">
                <Button variant="outline" size="sm" className="mt-4">
                  เพิ่มคนไข้ใหม่
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HN</TableHead>
                  <TableHead>ชื่อ-นามสกุล</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>อีเมล</TableHead>
                  <TableHead>วันเกิด</TableHead>
                  <TableHead className="text-right">การดำเนินการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/patients/${patient.id}`)}
                  >
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {patient.hn_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <span>
                          {patient.first_name} {patient.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {patient.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{patient.phone}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{patient.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.date_of_birth ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(patient.date_of_birth)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/patients/${patient.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        {canEditPatient && (
                          <Link
                            href={`/patients/${patient.id}/edit`}
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
