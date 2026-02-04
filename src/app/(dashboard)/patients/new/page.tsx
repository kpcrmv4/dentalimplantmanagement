'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { CreatePatientInput } from '@/types/database';

const genderOptions = [
  { value: '', label: 'เลือกเพศ' },
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreatePatientInput>>({
    hn_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: undefined,
    phone: '',
    email: '',
    address: '',
    medical_history: '',
    allergies: '',
    notes: '',
  });

  const generateHN = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `HN${year}${month}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name) {
      toast.error('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    setIsSubmitting(true);

    try {
      const hnNumber = formData.hn_number || generateHN();

      const { data, error } = await supabase
        .from('patients')
        .insert({
          hn_number: hnNumber,
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth || null,
          gender: formData.gender || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          medical_history: formData.medical_history || null,
          allergies: formData.allergies || null,
          notes: formData.notes || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('เพิ่มคนไข้เรียบร้อยแล้ว');
      router.push(`/patients/${data.id}`);
    } catch (error: any) {
      console.error('Error creating patient:', error);
      if (error.code === '23505') {
        toast.error('HN นี้มีอยู่ในระบบแล้ว');
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="เพิ่มคนไข้ใหม่" subtitle="กรอกข้อมูลคนไข้" />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/patients"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายชื่อคนไข้
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    ข้อมูลพื้นฐาน
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="HN (Hospital Number)"
                    placeholder="ระบบจะสร้างให้อัตโนมัติถ้าไม่กรอก"
                    value={formData.hn_number || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, hn_number: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="ชื่อ *"
                      placeholder="ชื่อจริง"
                      value={formData.first_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                    />
                    <Input
                      label="นามสกุล *"
                      placeholder="นามสกุล"
                      value={formData.last_name || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="วันเกิด"
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, date_of_birth: e.target.value })
                      }
                    />
                    <Select
                      label="เพศ"
                      options={genderOptions}
                      value={formData.gender || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gender: e.target.value as 'male' | 'female' | 'other',
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลติดต่อ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="เบอร์โทรศัพท์"
                      type="tel"
                      placeholder="0812345678"
                      value={formData.phone || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                    <Input
                      label="อีเมล"
                      type="email"
                      placeholder="email@example.com"
                      value={formData.email || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ที่อยู่
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={3}
                      value={formData.address || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="ที่อยู่..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Medical Info */}
              <Card>
                <CardHeader>
                  <CardTitle>ข้อมูลทางการแพทย์</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประวัติการรักษา
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={3}
                      value={formData.medical_history || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, medical_history: e.target.value })
                      }
                      placeholder="ประวัติการรักษา โรคประจำตัว ยาที่ใช้..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประวัติแพ้ยา/อาหาร
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={2}
                      value={formData.allergies || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, allergies: e.target.value })
                      }
                      placeholder="ระบุสิ่งที่แพ้..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      หมายเหตุ
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={2}
                      value={formData.notes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="หมายเหตุเพิ่มเติม..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    บันทึกข้อมูลคนไข้
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
