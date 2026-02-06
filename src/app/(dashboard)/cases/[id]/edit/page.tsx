'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, Clock } from 'lucide-react';
import { Header } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Select } from '@/components/ui';
import { useCase, useUsers, useProcedureTypes } from '@/hooks/useApi';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const toothPositions = [
  '11', '12', '13', '14', '15', '16', '17', '18',
  '21', '22', '23', '24', '25', '26', '27', '28',
  '31', '32', '33', '34', '35', '36', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48',
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditCasePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: caseData, isLoading: isCaseLoading } = useCase(id);
  const { data: dentists } = useUsers('dentist');
  const { data: assistants } = useUsers('assistant');
  const { data: procedureTypesData } = useProcedureTypes();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    dentist_id: '',
    assistant_id: '',
    surgery_date: '',
    surgery_time: '',
    estimated_duration: 60,
    procedure_type: '',
    notes: '',
    pre_op_notes: '',
    is_emergency: false,
  });
  const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

  useEffect(() => {
    if (caseData && !isInitialized) {
      setFormData({
        dentist_id: caseData.dentist_id || '',
        assistant_id: caseData.assistant_id || '',
        surgery_date: caseData.surgery_date || '',
        surgery_time: caseData.surgery_time?.slice(0, 5) || '',
        estimated_duration: caseData.estimated_duration || 60,
        procedure_type: caseData.procedure_type || '',
        notes: caseData.notes || '',
        pre_op_notes: caseData.pre_op_notes || '',
        is_emergency: caseData.is_emergency || false,
      });
      setSelectedTeeth(caseData.tooth_positions || []);
      setIsInitialized(true);
    }
  }, [caseData, isInitialized]);

  const procedureTypeOptions = [
    { value: '', label: 'เลือกประเภท' },
    ...(procedureTypesData || []).map((pt) => ({ value: pt.value, label: pt.name })),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dentist_id || !formData.surgery_date) {
      toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('cases')
        .update({
          dentist_id: formData.dentist_id,
          assistant_id: formData.assistant_id || null,
          surgery_date: formData.surgery_date,
          surgery_time: formData.surgery_time || null,
          estimated_duration: formData.estimated_duration || 60,
          tooth_positions: selectedTeeth.length > 0 ? selectedTeeth : null,
          procedure_type: formData.procedure_type || null,
          notes: formData.notes || null,
          pre_op_notes: formData.pre_op_notes || null,
          is_emergency: formData.is_emergency,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('บันทึกการแก้ไขเรียบร้อย');
      router.push(`/cases/${id}`);
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่พบข้อมูลเคส</p>
          <Link href="/cases">
            <Button variant="outline">กลับไปหน้ารายการเคส</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (['completed', 'cancelled'].includes(caseData.status)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่สามารถแก้ไขเคสที่เสร็จสิ้นหรือยกเลิกแล้ว</p>
          <Link href={`/cases/${id}`}>
            <Button variant="outline">กลับไปหน้ารายละเอียดเคส</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={`แก้ไขเคส ${caseData.case_number}`}
        subtitle={`คนไข้: ${caseData.patient?.first_name || ''} ${caseData.patient?.last_name || ''} (${caseData.patient?.hn_number || ''})`}
      />

      <div className="p-4 sm:p-6 lg:p-8">
        <Link
          href={`/cases/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปรายละเอียดเคส
        </Link>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Team */}
              <Card>
                <CardHeader>
                  <CardTitle>ทีมผ่าตัด</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="ทันตแพทย์ *"
                      options={dentistOptions}
                      value={formData.dentist_id}
                      onChange={(e) =>
                        setFormData({ ...formData, dentist_id: e.target.value })
                      }
                    />
                    <Select
                      label="ผู้ช่วย"
                      options={assistantOptions}
                      value={formData.assistant_id}
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
                      value={formData.surgery_date}
                      onChange={(e) =>
                        setFormData({ ...formData, surgery_date: e.target.value })
                      }
                      leftIcon={<Calendar className="w-4 h-4" />}
                    />
                    <Input
                      label="เวลา"
                      type="time"
                      value={formData.surgery_time}
                      onChange={(e) =>
                        setFormData({ ...formData, surgery_time: e.target.value })
                      }
                      leftIcon={<Clock className="w-4 h-4" />}
                    />
                    <Input
                      label="ระยะเวลา (นาที)"
                      type="number"
                      value={formData.estimated_duration}
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
                    options={procedureTypeOptions}
                    value={formData.procedure_type}
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
                      value={formData.notes}
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
                      value={formData.pre_op_notes}
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
                        checked={formData.is_emergency}
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
                <CardContent className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSubmitting}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    บันทึกการแก้ไข
                  </Button>
                  <Link href={`/cases/${id}`} className="block">
                    <Button type="button" variant="outline" className="w-full">
                      ยกเลิก
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
