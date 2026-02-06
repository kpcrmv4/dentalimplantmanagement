'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Calendar,
  Package,
  CheckCircle,
  RefreshCw,
  Clock,
  ChevronRight,
  Stethoscope,
  User,
} from 'lucide-react';
import { Header } from '@/components/layout';
import { Card, Badge, Button } from '@/components/ui';
import {
  AssistantCaseCard,
  AddMaterialModal,
  CloseCaseModal,
} from '@/components/assistant-dashboard';
import { useAssistantTodayCases } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { formatDate, getCaseStatusText } from '@/lib/utils';
import type { AssistantCaseItem, CaseStatus } from '@/types/database';

export default function AssistantDashboardPage() {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addMaterialCaseId, setAddMaterialCaseId] = useState<string | null>(null);
  const [closeCaseItem, setCloseCaseItem] = useState<AssistantCaseItem | null>(null);
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);

  const { data: cases, mutate: mutateCases } = useAssistantTodayCases(user?.id || null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutateCases();
    setIsRefreshing(false);
  }, [mutateCases]);

  // Mark a reservation as used with photo evidence
  const handleMarkUsed = useCallback(
    async (reservationId: string, photoUrls: string[]) => {
      // Fetch reservation to get actual quantity
      const { data: reservation } = await supabase
        .from('case_reservations')
        .select('quantity')
        .eq('id', reservationId)
        .single();

      const qty = reservation?.quantity || 1;

      const { error } = await supabase
        .from('case_reservations')
        .update({
          status: 'used',
          used_quantity: qty,
          used_at: new Date().toISOString(),
          used_by: user?.id,
          photo_evidence: photoUrls,
        })
        .eq('id', reservationId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'MATERIAL_USED',
        entity_type: 'case_reservations',
        entity_id: reservationId,
        user_id: user?.id,
        details: {
          quantity: qty,
          photo_count: photoUrls.length,
        },
      });

      // Refresh data
      await mutateCases();
    },
    [user?.id, mutateCases]
  );

  // Add material to a case
  const handleAddMaterial = useCallback(
    async (
      productId: string,
      inventoryId: string | null,
      quantity: number,
      photoUrls: string[],
      notes?: string
    ) => {
      if (!addMaterialCaseId) return;

      // Create a new reservation record
      const { data: reservation, error: resError } = await supabase
        .from('case_reservations')
        .insert({
          case_id: addMaterialCaseId,
          product_id: productId,
          inventory_id: inventoryId,
          quantity: quantity,
          status: 'used',
          used_quantity: quantity,
          used_at: new Date().toISOString(),
          used_by: user?.id,
          photo_evidence: photoUrls,
          is_out_of_stock: !inventoryId,
          notes: notes ? `[เพิ่มระหว่างผ่าตัด] ${notes}` : '[เพิ่มระหว่างผ่าตัด]',
        })
        .select()
        .single();

      if (resError) throw resError;

      // If we have inventory, deduct the stock
      if (inventoryId) {
        const { data: inv, error: invError } = await supabase
          .from('inventory')
          .select('quantity, reserved_quantity, available_quantity')
          .eq('id', inventoryId)
          .single();

        if (invError) throw invError;

        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: inv.quantity - quantity,
            available_quantity: inv.available_quantity - quantity,
          })
          .eq('id', inventoryId);

        if (updateError) throw updateError;

        await supabase.from('stock_movements').insert({
          inventory_id: inventoryId,
          product_id: productId,
          movement_type: 'use',
          quantity: -quantity,
          reference_type: 'case_reservations',
          reference_id: reservation.id,
          notes: `เพิ่มวัสดุระหว่างผ่าตัด - เคส ${addMaterialCaseId}`,
          performed_by: user?.id,
        });
      }

      await supabase.from('audit_logs').insert({
        action: 'MATERIAL_ADDED_DURING_SURGERY',
        entity_type: 'case_reservations',
        entity_id: reservation.id,
        user_id: user?.id,
        details: {
          case_id: addMaterialCaseId,
          product_id: productId,
          inventory_id: inventoryId,
          quantity,
          has_stock: !!inventoryId,
          photo_count: photoUrls.length,
          notes,
        },
      });

      await mutateCases();
      setAddMaterialCaseId(null);
    },
    [addMaterialCaseId, user?.id, mutateCases]
  );

  // Close a case
  const handleCloseCase = useCallback(
    async (unusedReservationIds: string[], notes?: string) => {
      if (!closeCaseItem) return;

      for (const reservationId of unusedReservationIds) {
        const reservation = closeCaseItem.reservations.find((r) => r.id === reservationId);
        if (!reservation) continue;

        await supabase
          .from('case_reservations')
          .update({
            status: 'cancelled',
            notes: reservation.notes
              ? `${reservation.notes} [ยกเลิกเมื่อปิดเคส]`
              : '[ยกเลิกเมื่อปิดเคส]',
          })
          .eq('id', reservationId);

        if (reservation.inventory_id) {
          const { data: inv } = await supabase
            .from('inventory')
            .select('reserved_quantity, available_quantity')
            .eq('id', reservation.inventory_id)
            .single();

          if (inv) {
            await supabase
              .from('inventory')
              .update({
                reserved_quantity: Math.max(0, inv.reserved_quantity - reservation.quantity),
                available_quantity: inv.available_quantity + reservation.quantity,
              })
              .eq('id', reservation.inventory_id);
          }
        }
      }

      await supabase
        .from('cases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          post_op_notes: notes,
        })
        .eq('id', closeCaseItem.id);

      await supabase.from('audit_logs').insert({
        action: 'CASE_CLOSED',
        entity_type: 'cases',
        entity_id: closeCaseItem.id,
        user_id: user?.id,
        details: {
          case_number: closeCaseItem.case_number,
          patient_name: closeCaseItem.patient_name,
          materials_used: closeCaseItem.reservations.filter((r) => r.status === 'used').length,
          materials_returned: unusedReservationIds.length,
          notes,
        },
      });

      await mutateCases();
      setCloseCaseItem(null);
    },
    [closeCaseItem, user?.id, mutateCases]
  );

  // Calculate summary
  const summary = cases
    ? {
        total: cases.length,
        completed: cases.filter((c) => c.status === 'completed').length,
        pending: cases.filter((c) => c.material_summary.pending > 0).length,
        ready: cases.filter(
          (c) =>
            c.material_summary.prepared + c.material_summary.used ===
              c.material_summary.total && c.material_summary.total > 0
        ).length,
      }
    : { total: 0, completed: 0, pending: 0, ready: 0 };

  // Use state for today's date to avoid hydration mismatch (server vs client timezone)
  const [todayStr, setTodayStr] = useState('');
  useEffect(() => {
    setTodayStr(formatDate(new Date()));
  }, []);

  // Group cases by time slots for timeline
  const timelineSlots = useMemo(() => {
    if (!cases) return [];

    const slots: { time: string; cases: AssistantCaseItem[] }[] = [];
    const sortedCases = [...cases].sort((a, b) => {
      const timeA = a.surgery_time || '99:99';
      const timeB = b.surgery_time || '99:99';
      return timeA.localeCompare(timeB);
    });

    for (const c of sortedCases) {
      const time = c.surgery_time ? c.surgery_time.slice(0, 5) : 'ไม่ระบุเวลา';
      const existingSlot = slots.find((s) => s.time === time);
      if (existingSlot) {
        existingSlot.cases.push(c);
      } else {
        slots.push({ time, cases: [c] });
      }
    }

    return slots;
  }, [cases]);

  const getStatusColor = (status: CaseStatus) => {
    const colors: Record<CaseStatus, string> = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      gray: 'bg-gray-400',
      completed: 'bg-green-500',
      cancelled: 'bg-gray-400',
    };
    return colors[status];
  };

  const getStatusBorder = (status: CaseStatus) => {
    const colors: Record<CaseStatus, string> = {
      green: 'border-green-200 bg-green-50',
      yellow: 'border-yellow-200 bg-yellow-50',
      red: 'border-red-200 bg-red-50',
      gray: 'border-gray-200 bg-gray-50',
      completed: 'border-green-200 bg-green-50',
      cancelled: 'border-gray-200 bg-gray-50',
    };
    return colors[status];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="งานวันนี้"
        subtitle={`${todayStr || ''} - ${user?.full_name || 'ผู้ช่วยทันตแพทย์'}`}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 space-y-5 pb-20 max-w-2xl mx-auto">
        {/* Summary Stats - Compact horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200 shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">เคส</p>
              <p className="text-lg font-bold text-blue-600 leading-tight">{summary.total}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200 shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">พร้อม</p>
              <p className="text-lg font-bold text-green-600 leading-tight">{summary.ready}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200 shrink-0">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Package className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">รอเตรียม</p>
              <p className="text-lg font-bold text-yellow-600 leading-tight">{summary.pending}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-gray-200 shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 leading-none">เสร็จ</p>
              <p className="text-lg font-bold text-purple-600 leading-tight">{summary.completed}</p>
            </div>
          </div>
        </div>

        {/* Timeline Section */}
        {!cases && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {cases && cases.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">ไม่มีเคสสำหรับวันนี้</p>
            <p className="text-gray-400 text-sm mt-1">ดึงข้อมูลใหม่ได้ที่ปุ่มรีเฟรช</p>
          </div>
        )}

        {cases && cases.length > 0 && (
          <div className="space-y-0">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">ตารางเคสวันนี้</h2>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gray-200" />

              {timelineSlots.map((slot, slotIndex) => (
                <div key={slot.time} className="relative">
                  {/* Time marker */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="relative z-10 w-[47px] flex justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-500 ring-4 ring-blue-100" />
                    </div>
                    <span className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                      {slot.time === 'ไม่ระบุเวลา' ? slot.time : `${slot.time} น.`}
                    </span>
                  </div>

                  {/* Cases in this slot */}
                  <div className={`ml-[47px] space-y-2 ${slotIndex < timelineSlots.length - 1 ? 'pb-4' : 'pb-2'}`}>
                    {slot.cases.map((caseItem) => {
                      const isCompleted = caseItem.status === 'completed';
                      const { used, total } = caseItem.material_summary;
                      const progressPercent = total > 0 ? Math.round((used / total) * 100) : 0;

                      return (
                        <div
                          key={caseItem.id}
                          className={`border rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98] ${getStatusBorder(caseItem.status)} ${
                            expandedCaseId === caseItem.id ? 'ring-2 ring-blue-300' : ''
                          }`}
                          onClick={() => setExpandedCaseId(expandedCaseId === caseItem.id ? null : caseItem.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(caseItem.status)}`} />
                                <span className="font-semibold text-sm text-gray-900 truncate">
                                  {caseItem.case_number}
                                </span>
                                <Badge
                                  variant={
                                    caseItem.status === 'completed' ? 'success' :
                                    caseItem.status === 'green' ? 'success' :
                                    caseItem.status === 'yellow' ? 'warning' :
                                    caseItem.status === 'red' ? 'danger' : 'gray'
                                  }
                                  size="sm"
                                >
                                  {getCaseStatusText(caseItem.status)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {caseItem.patient_name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="w-3 h-3" />
                                  {caseItem.dentist_name}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-xs font-semibold text-gray-700">{used}/{total}</p>
                                <p className="text-[10px] text-gray-400">วัสดุ</p>
                              </div>
                              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedCaseId === caseItem.id ? 'rotate-90' : ''}`} />
                            </div>
                          </div>

                          {/* Mini progress bar */}
                          <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted || (used === total && total > 0) ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Case Detail */}
        {expandedCaseId && cases && (
          <>
            {cases
              .filter((c) => c.id === expandedCaseId)
              .map((caseItem) => (
                <AssistantCaseCard
                  key={caseItem.id}
                  caseItem={caseItem}
                  onMarkUsed={handleMarkUsed}
                  onAddMaterial={(caseId) => setAddMaterialCaseId(caseId)}
                  onCloseCase={(caseId) => {
                    const item = cases.find((c) => c.id === caseId);
                    if (item) setCloseCaseItem(item);
                  }}
                />
              ))}
          </>
        )}
      </div>

      {/* Add Material Modal */}
      <AddMaterialModal
        isOpen={!!addMaterialCaseId}
        onClose={() => setAddMaterialCaseId(null)}
        caseId={addMaterialCaseId || ''}
        onAddMaterial={handleAddMaterial}
      />

      {/* Close Case Modal */}
      <CloseCaseModal
        isOpen={!!closeCaseItem}
        onClose={() => setCloseCaseItem(null)}
        caseItem={closeCaseItem}
        onConfirm={handleCloseCase}
      />
    </div>
  );
}
