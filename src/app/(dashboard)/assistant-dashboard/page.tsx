'use client';

import { useState, useCallback } from 'react';
import { Calendar, Package, CheckCircle, AlertCircle, RefreshCw, Plus } from 'lucide-react';
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
import { formatDate } from '@/lib/utils';
import type { AssistantCaseItem } from '@/types/database';

export default function AssistantDashboardPage() {
  const { user } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [addMaterialCaseId, setAddMaterialCaseId] = useState<string | null>(null);
  const [closeCaseItem, setCloseCaseItem] = useState<AssistantCaseItem | null>(null);

  const { data: cases, mutate: mutateCases } = useAssistantTodayCases(user?.id || null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await mutateCases();
    setIsRefreshing(false);
  }, [mutateCases]);

  // Mark a reservation as used with photo evidence
  const handleMarkUsed = useCallback(
    async (reservationId: string, photoUrls: string[]) => {
      const { error } = await supabase
        .from('case_reservations')
        .update({
          status: 'used',
          used_quantity: 1, // Assuming 1 for now; can be made configurable
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
          status: 'used', // Directly mark as used since it's an additional material during surgery
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
        // Get current inventory
        const { data: inv, error: invError } = await supabase
          .from('inventory')
          .select('quantity, reserved_quantity, available_quantity')
          .eq('id', inventoryId)
          .single();

        if (invError) throw invError;

        // Update inventory (deduct from available)
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            quantity: inv.quantity - quantity,
            available_quantity: inv.available_quantity - quantity,
          })
          .eq('id', inventoryId);

        if (updateError) throw updateError;

        // Log stock movement
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

      // Log the action
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

      // Refresh data
      await mutateCases();
      setAddMaterialCaseId(null);
    },
    [addMaterialCaseId, user?.id, mutateCases]
  );

  // Close a case
  const handleCloseCase = useCallback(
    async (unusedReservationIds: string[], notes?: string) => {
      if (!closeCaseItem) return;

      // Cancel unused reservations and release stock
      for (const reservationId of unusedReservationIds) {
        const reservation = closeCaseItem.reservations.find((r) => r.id === reservationId);
        if (!reservation) continue;

        // Update reservation status
        await supabase
          .from('case_reservations')
          .update({
            status: 'cancelled',
            notes: reservation.notes
              ? `${reservation.notes} [ยกเลิกเมื่อปิดเคส]`
              : '[ยกเลิกเมื่อปิดเคส]',
          })
          .eq('id', reservationId);

        // Release reserved stock back to inventory
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

      // Update case status to completed
      await supabase
        .from('cases')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          post_op_notes: notes,
        })
        .eq('id', closeCaseItem.id);

      // Log the case closure
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

      // Refresh data
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

  const today = new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="งานวันนี้"
        subtitle={`${formatDate(today)} - ${user?.full_name || 'ผู้ช่วยทันตแพทย์'}`}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="p-4 space-y-4 pb-20">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">เคสทั้งหมด</p>
                <p className="text-xl font-bold text-blue-600">{summary.total}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">วัสดุพร้อม</p>
                <p className="text-xl font-bold text-green-600">{summary.ready}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">รอเตรียม</p>
                <p className="text-xl font-bold text-yellow-600">{summary.pending}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">เสร็จแล้ว</p>
                <p className="text-xl font-bold text-purple-600">{summary.completed}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Case List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">รายการเคส</h2>

          {!cases && (
            <Card>
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            </Card>
          )}

          {cases && cases.length === 0 && (
            <Card>
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">ไม่มีเคสสำหรับวันนี้</p>
              </div>
            </Card>
          )}

          {cases &&
            cases.map((caseItem, index) => (
              <AssistantCaseCard
                key={caseItem.id}
                caseItem={caseItem}
                onMarkUsed={handleMarkUsed}
                onAddMaterial={(caseId) => setAddMaterialCaseId(caseId)}
                onCloseCase={(caseId) => {
                  const item = cases.find((c) => c.id === caseId);
                  if (item) setCloseCaseItem(item);
                }}
                isExpanded={index === 0} // Expand first case by default
              />
            ))}
        </div>
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
