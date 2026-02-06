import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import {
  notifyCaseAssigned,
  notifyOutOfStock,
  notifySupplierPO,
  notifyUrgentCase,
  notifyLowStock,
  notifyMaterialPrepared,
  notifyPOCreated,
} from '@/lib/notification-service';

type TriggerType =
  | 'case_assigned'
  | 'out_of_stock'
  | 'supplier_po'
  | 'urgent_case'
  | 'low_stock'
  | 'material_prepared'
  | 'po_created';

interface TriggerPayload {
  type: TriggerType;
  data: Record<string, unknown>;
}

/**
 * POST /api/notifications/trigger
 * Trigger a notification based on an event
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TriggerPayload = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing type or data' },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case 'case_assigned':
        result = await notifyCaseAssigned(
          data.caseId as string,
          data.dentistId as string,
          data.caseNumber as string,
          data.patientName as string,
          data.surgeryDate as string
        );
        break;

      case 'out_of_stock':
        result = await notifyOutOfStock(
          data.reservationId as string,
          data.caseNumber as string,
          data.productName as string,
          data.quantity as number,
          data.surgeryDate as string
        );
        break;

      case 'supplier_po':
        result = await notifySupplierPO(
          data.orderId as string,
          data.poNumber as string,
          data.supplierId as string,
          data.totalAmount as number,
          data.accessCode as string
        );
        break;

      case 'po_created':
        result = await notifyPOCreated(
          data.orderId as string,
          data.poNumber as string,
          data.supplierName as string,
          data.totalAmount as number,
          data.createdByName as string
        );
        break;

      case 'urgent_case':
        result = await notifyUrgentCase(
          data.caseId as string,
          data.caseNumber as string,
          data.patientName as string,
          data.surgeryDate as string,
          data.hoursUntilSurgery as number,
          data.unpreparedCount as number
        );
        break;

      case 'low_stock':
        result = await notifyLowStock(
          data.productId as string,
          data.productName as string,
          data.currentStock as number,
          data.minStock as number
        );
        break;

      case 'material_prepared':
        result = await notifyMaterialPrepared(
          data.caseId as string,
          data.caseNumber as string,
          data.dentistId as string
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unknown trigger type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      result,
    });
  } catch (error) {
    console.error('[Notification Trigger] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
