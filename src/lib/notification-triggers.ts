'use client';

/**
 * Client-side notification trigger utilities
 * Use these functions to trigger notifications from React components
 */

type TriggerResult = {
  success: boolean;
  type: string;
  result?: {
    push: { sent: number; failed: number };
    line: { sent: number; failed: number };
    inApp: { sent: number; failed: number };
  };
  error?: string;
};

async function triggerNotification(
  type: string,
  data: Record<string, unknown>
): Promise<TriggerResult> {
  try {
    const response = await fetch('/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[NotificationTrigger] Error:', result.error);
      return { success: false, type, error: result.error };
    }

    return result;
  } catch (error) {
    console.error('[NotificationTrigger] Error:', error);
    return { success: false, type, error: 'Network error' };
  }
}

/**
 * Trigger notification when a case is assigned to a dentist
 */
export async function triggerCaseAssigned(params: {
  caseId: string;
  dentistId: string;
  caseNumber: string;
  patientName: string;
  surgeryDate: string;
}): Promise<TriggerResult> {
  return triggerNotification('case_assigned', params);
}

/**
 * Trigger notification when a reservation is marked as out-of-stock
 */
export async function triggerOutOfStock(params: {
  reservationId: string;
  caseNumber: string;
  productName: string;
  quantity: number;
  surgeryDate: string;
}): Promise<TriggerResult> {
  return triggerNotification('out_of_stock', params);
}

/**
 * Trigger notification to supplier when PO is approved (with access code and link)
 */
export async function triggerSupplierPO(params: {
  orderId: string;
  poNumber: string;
  supplierId: string;
  totalAmount: number;
  accessCode: string;
}): Promise<TriggerResult> {
  return triggerNotification('supplier_po', params);
}

/**
 * Trigger notification to admin when a new PO is created and pending approval
 */
export async function triggerPOCreated(params: {
  orderId: string;
  poNumber: string;
  supplierName: string;
  totalAmount: number;
  createdByName: string;
}): Promise<TriggerResult> {
  return triggerNotification('po_created', params);
}

/**
 * Trigger urgent case notification
 */
export async function triggerUrgentCase(params: {
  caseId: string;
  caseNumber: string;
  patientName: string;
  surgeryDate: string;
  hoursUntilSurgery: number;
  unpreparedCount: number;
}): Promise<TriggerResult> {
  return triggerNotification('urgent_case', params);
}

/**
 * Trigger low stock notification
 */
export async function triggerLowStock(params: {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
}): Promise<TriggerResult> {
  return triggerNotification('low_stock', params);
}

/**
 * Trigger notification when all materials are prepared for a case
 */
export async function triggerMaterialPrepared(params: {
  caseId: string;
  caseNumber: string;
  dentistId: string;
}): Promise<TriggerResult> {
  return triggerNotification('material_prepared', params);
}
