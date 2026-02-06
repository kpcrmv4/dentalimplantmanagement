'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, Clock, User, Stethoscope, UserPlus } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select, Modal, ModalFooter } from '@/components/ui';
import { usePatients, useUsers } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import type { CreateCaseInput, CreatePatientInput } from '@/types/database';

const procedureTypes = [
  { value: 'single_implant', label: 'Single Implant' },
  { value: 'multiple_implants', label: 'Multiple Implants' },
  { value: 'full_arch', label: 'Full Arch Implant' },
  { value: 'bone_graft', label: 'Bone Graft' },
  { value: 'sinus_lift', label: 'Sinus Lift' },
  { value: 'implant_with_bone_graft', label: 'Implant with Bone Graft' },
];

const toothPositions = [
  '11', '12', '13', '14', '15', '16', '17', '18',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '31', '32', '33', '34', '35', '36', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48',
];

const genderOptions = [
  { value: '', label: 'เลือกเพศ' },
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
  { value: 'other', label: 'อื่นๆ' },
];

export default function NewCasePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateCaseInput>>({
    surgery_date: '',
    surgery_time: '',
    estimated_duration: 60,
    tooth_positions: [],
    procedure_type: '',
    notes: '',
    pre_op_notes: '',
    is_emergency: false,
  });
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);
  const [patientSearch, setPatientSearch] = useState('');

  // New patient modal state
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<CreatePatientInput>>({
    hn_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: undefined,
    phone: '',
    allergies: '',
    medical_history: '',
  });

  const { data: patients, mutate: mutatePatients } = usePatients(patientSearch);
  const { data: dentists } = useUsers('dentist');
  const { data: assistants } = useUsers('assistant');

  const patientOptions = [
    { value: '', label: 'เลือกคนไข้' },
    ...(patients?.map((p) => ({
      value: p.id,
      label: `${p.hn_number} - ${p.first_name} ${p.last_name}`,
    })) || []),
  ];

  const dentistOptions = [
    { value: '', label: 'เลือกทันตแพทย์' },
    ...(dentists?.map((d) => ({ value: d.id, label: d.full_name })) || []),
  ];

  const assistantOptions = [
    { value: '', label: 'ไม่ระบุ' },
    ...(assistants?.map((a) => ({ value: a.id, label: a.full_name })) || []),
  ];

  const handleToothToggle = (tooth: string) => {
    setSelectedTeeth((prev) =>
      prev.includes(tooth)
        ? prev.filter((t) => t !== tooth)
        : [...prev, tooth]
    );
  };

  const generateCaseNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CASE-${year}${month}-${random}`;
  };

  // Handle new patient creation from modal
  const handleCreatePatient = async () => {
    if (!newPatient.hn_number) {
      toast.error('กรุณากรอก HN');
      return;
    }

    if (!newPatient.first_name || !newPatient.last_name) {
      toast.error('กรุณากรอกชื่อและนามสกุล');
      return;
    }

    setIsCreatingPatient(true);

    try {
      const hnNumber = newPatient.hn_number;

      const { data, error } = await supabase
        .from('patients')
        .insert({
          hn_number: hnNumber,
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          date_of_birth: newPatient.date_of_birth || null,
          gender: newPatient.gender || null,
          phone: newPatient.phone || null,
          email: null,
          address: null,
          medical_history: newPatient.medical_history || null,
          allergies: newPatient.allergies || null,
          notes: null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`เพิ่มคนไข้ ${data.first_name} ${data.last_name} เรียบร้อย`);

      // Auto-select the new patient
      setFormData({ ...formData, patient_id: data.id });
      setPatientSearch(`${data.first_name} ${data.last_name}`);

      // Refresh patient list
      await mutatePatients();

      // Close modal & reset form
      setShowNewPatientModal(false);
      setNewPatient({
        hn_number: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: undefined,
        phone: '',
        allergies: '',
        medical_history: '',
      });
    } catch (error: any) {
      console.error('Error creating patient:', error);
      if (error.code === '23505') {
        toast.error('HN นี้มีอยู่ในระบบแล้ว');
      } else {
        toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } finally {
      setIsCreatingPatient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.patient_id || !formData.dentist_id || !formData.surgery_date) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);

    try {
      const caseNumber = generateCaseNumber();

      const { data, error } = await supabase
        .from('cases')
        .insert({
          case_number: caseNumber,
          patient_id: formData.patient_id,
          dentist_id: formData.dentist_id,
          assistant_id: formData.assistant_id || null,
          surgery_date: formData.surgery_date,
          surgery_time: formData.surgery_time || null,
          estimated_duration: formData.estimated_duration || 60,
          tooth_positions: selectedTeeth.length > 0 ? selectedTeeth : null,
          procedure_type: formData.procedure_type || null,
          notes: formData.notes || null,
          pre_op_notes: formData.pre_op_notes || null,
          is_emergency: formData.is_emergency || false,
          status: 'gray',
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('สร้างเคสเรียบร้อยแล้ว');
      router.push(`/cases/${data.id}`);
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="สร้างเคสใหม่" subtitle="กรอกข้อมูลเคสผ่าตัดรากเทียม" />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายการเคส
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient & Team */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ข้อมูลคนไข้และทีมผ่าตัด</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<UserPlus className="w-4 h-4" />}
                      onClick={() => setShowNewPatientModal(true)}
                    >
                      +คนไข้
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      label="ค้นหาคนไข้"
                      placeholder="พิมพ์ HN หรือชื่อคนไข้..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      leftIcon={<User className="w-4 h-4" />}
                    />
                  </div>
                  <Select
                    label="เลือกคนไข้ *"
                    options={patientOptions}
                    value={formData.patient_id || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, patient_id: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="ทันตแพทย์ *"
                      options={dentistOptions}
                      value={formData.dentist_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, dentist_id: e.target.value })
                      }
                    />
                    <Select
                      label="ผู้ช่วย"
                      options={assistantOptions}
                      value={formData.assistant_id || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, assistant_id: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle>กำหนดการผ่าตัด</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input
                      label="วันผ่าตัด *"
                      type="date"
                      value={formData.surgery_date || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, surgery_date: e.target.value })
                      }
                      leftIcon={<Calendar className="w-4 h-4" />}
                    />
                    <Input
                      label="เวลา"
                      type="time"
                      value={formData.surgery_time || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, surgery_time: e.target.value })
                      }
                      leftIcon={<Clock className="w-4 h-4" />}
                    />
                    <Input
                      label="ระยะเวลา (นาที)"
                      type="number"
                      value={formData.estimated_duration || 60}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          estimated_duration: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Select
                    label="ประเภทการรักษา"
                    options={[
                      { value: '', label: 'เลือกประเภท' },
                      ...procedureTypes,
                    ]}
                    value={formData.procedure_type || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, procedure_type: e.target.value })
                    }
                  />
                </CardContent>
              </Card>

              {/* Tooth Positions */}
              <Card>
                <CardHeader>
                  <CardTitle>ตำแหน่งฟัน</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    เลือกตำแหน่งฟันที่จะทำการรักษา
                  </p>
                  <div className="space-y-4">
                    {/* Upper teeth */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">บน (Upper)</p>
                      <div className="flex flex-wrap gap-2">
                        {toothPositions.slice(0, 16).map((tooth) => (
                          <button
                            key={tooth}
                            type="button"
                            onClick={() => handleToothToggle(tooth)}
                            className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                              selectedTeeth.includes(tooth)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                            }`}
                          >
                            {tooth}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Lower teeth */}
                    <div>
                      <p className="text-xs text-gray-400 mb-2">ล่าง (Lower)</p>
                      <div className="flex flex-wrap gap-2">
                        {toothPositions.slice(16).map((tooth) => (
                          <button
                            key={tooth}
                            type="button"
                            onClick={() => handleToothToggle(tooth)}
                            className={`w-10 h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                              selectedTeeth.includes(tooth)
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                            }`}
                          >
                            {tooth}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {selectedTeeth.length > 0 && (
                    <p className="mt-4 text-sm text-gray-600">
                      เลือกแล้ว: {selectedTeeth.sort().join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>หมายเหตุ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      หมายเหตุทั่วไป
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="หมายเหตุเพิ่มเติม..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pre-op Notes
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      rows={3}
                      value={formData.pre_op_notes || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, pre_op_notes: e.target.value })
                      }
                      placeholder="บันทึกก่อนผ่าตัด..."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardContent>
                  <div className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.is_emergency || false}
                        onChange={(e) =>
                          setFormData({ ...formData, is_emergency: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        เคสฉุกเฉิน
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    บันทึกเคส
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>

      {/* New Patient Modal */}
      <Modal
        isOpen={showNewPatientModal}
        onClose={() => setShowNewPatientModal(false)}
        title="เพิ่มคนไข้ใหม่"
        description="กรอกข้อมูลเบื้องต้นเพื่อสร้างคนไข้ใหม่ สามารถแก้ไขเพิ่มเติมภายหลังได้"
        size="lg"
      >
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="ชื่อ *"
              placeholder="ชื่อจริง"
              value={newPatient.first_name || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, first_name: e.target.value })
              }
              disabled={isCreatingPatient}
            />
            <Input
              label="นามสกุล *"
              placeholder="นามสกุล"
              value={newPatient.last_name || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, last_name: e.target.value })
              }
              disabled={isCreatingPatient}
            />
          </div>

          <Input
            label="HN (Hospital Number) *"
            placeholder="กรอก HN ของคนไข้"
            value={newPatient.hn_number || ''}
            onChange={(e) =>
              setNewPatient({ ...newPatient, hn_number: e.target.value })
            }
            disabled={isCreatingPatient}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="วันเกิด"
              type="date"
              value={newPatient.date_of_birth || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, date_of_birth: e.target.value })
              }
              disabled={isCreatingPatient}
            />
            <Select
              label="เพศ"
              options={genderOptions}
              value={newPatient.gender || ''}
              onChange={(e) =>
                setNewPatient({
                  ...newPatient,
                  gender: e.target.value as 'male' | 'female' | 'other',
                })
              }
              disabled={isCreatingPatient}
            />
            <Input
              label="เบอร์โทรศัพท์"
              type="tel"
              placeholder="0812345678"
              value={newPatient.phone || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, phone: e.target.value })
              }
              disabled={isCreatingPatient}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ประวัติแพ้ยา/อาหาร
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              rows={2}
              value={newPatient.allergies || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, allergies: e.target.value })
              }
              placeholder="ระบุสิ่งที่แพ้..."
              disabled={isCreatingPatient}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ประวัติการรักษา / โรคประจำตัว
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
              rows={2}
              value={newPatient.medical_history || ''}
              onChange={(e) =>
                setNewPatient({ ...newPatient, medical_history: e.target.value })
              }
              placeholder="โรคประจำตัว ยาที่ใช้..."
              disabled={isCreatingPatient}
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowNewPatientModal(false)}
            disabled={isCreatingPatient}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleCreatePatient}
            isLoading={isCreatingPatient}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            เพิ่มคนไข้
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
