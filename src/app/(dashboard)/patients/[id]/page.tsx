'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  AlertTriangle,
  FileText,
  Stethoscope,
  Clock,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Badge, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { usePatient } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import useSWR from 'swr';
import type { Case } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: patient, isLoading } = usePatient(id);

  // Fetch cases for this patient
  const { data: cases } = useSWR<Case[]>(`patient_cases:${id}`, async () => {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        dentist:users!cases_dentist_id_fkey(full_name)
      `)
      .eq('patient_id', id)
      .order('surgery_date', { ascending: false });

    if (error) throw error;
    return data || [];
  });

  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'gray' | 'info'> = {
      green: 'success',
      yellow: 'warning',
      red: 'danger',
      gray: 'gray',
      completed: 'info',
      cancelled: 'gray',
    };
    return variants[status] || 'gray';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่พบข้อมูลคนไข้</p>
          <Link href="/patients">
            <Button variant="outline">กลับไปหน้ารายชื่อคนไข้</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={`${patient.first_name} ${patient.last_name}`}
        subtitle={`HN: ${patient.hn_number}`}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายชื่อคนไข้
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  ข้อมูลส่วนตัว
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">HN</p>
                      <p className="font-medium">{patient.hn_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ชื่อ-นามสกุล</p>
                      <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                    </div>
                    {patient.gender && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">เพศ</p>
                        <p className="font-medium">
                          {patient.gender === 'male' ? 'ชาย' : patient.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
                        </p>
                      </div>
                    )}
                    {patient.date_of_birth && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">วันเกิด</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{formatDate(patient.date_of_birth)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {patient.phone && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">เบอร์โทร</p>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{patient.phone}</span>
                        </div>
                      </div>
                    )}
                    {patient.email && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">อีเมล</p>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{patient.email}</span>
                        </div>
                      </div>
                    )}
                    {patient.address && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">ที่อยู่</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{patient.address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cases */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  ประวัติเคส
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!cases || cases.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">ยังไม่มีเคส</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cases.map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="block p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">{c.case_number}</span>
                          <Badge variant={getStatusVariant(c.status)} size="sm">
                            {getCaseStatusText(c.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(c.surgery_date)}</span>
                          </div>
                          {c.dentist && (
                            <span>ทพ. {(c.dentist as any).full_name}</span>
                          )}
                          {c.procedure_type && (
                            <span>{c.procedure_type}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Medical Info */}
            {(patient.allergies || patient.medical_history) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    ข้อมูลทางการแพทย์
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patient.allergies && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ประวัติแพ้ยา/อาหาร</p>
                      <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                        {patient.allergies}
                      </div>
                    </div>
                  )}
                  {patient.medical_history && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">ประวัติการรักษา / โรคประจำตัว</p>
                      <p className="text-gray-700 text-sm">{patient.medical_history}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {patient.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    หมายเหตุ
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 text-sm">{patient.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Meta */}
            <Card>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>สร้างเมื่อ {formatDate(patient.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
