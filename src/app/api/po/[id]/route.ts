import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * POST /api/po/[id] — Public API to verify access code and return PO data
 * No authentication required (public endpoint for suppliers)
 * Body: { code: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'กรุณากรอกรหัสลับ' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS (public endpoint)
    const serviceClient = createServiceRoleClient();

    // Fetch the PO with supplier and items
    const { data: order, error } = await serviceClient
      .from('purchase_orders')
      .select(`
        id,
        po_number,
        status,
        order_date,
        expected_delivery_date,
        subtotal,
        tax_amount,
        total_amount,
        notes,
        supplier_access_code,
        approved_at,
        created_at,
        supplier:suppliers(id, name, code),
        items:purchase_order_items(
          id,
          quantity,
          unit_cost,
          total_cost,
          product:products(id, name, sku)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: 'ไม่พบใบสั่งซื้อ' },
        { status: 404 }
      );
    }

    // Verify access code
    if (!order.supplier_access_code) {
      return NextResponse.json(
        { error: 'ใบสั่งซื้อนี้ยังไม่ได้รับการอนุมัติ' },
        { status: 403 }
      );
    }

    if (order.supplier_access_code.toUpperCase() !== code.toUpperCase()) {
      // Log failed access attempt
      await serviceClient.from('audit_logs').insert({
        action: 'PO_VIEW_FAILED',
        entity_type: 'purchase_orders',
        entity_id: id,
        details: {
          po_number: order.po_number,
          reason: 'invalid_access_code',
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        },
      });

      return NextResponse.json(
        { error: 'รหัสลับไม่ถูกต้อง' },
        { status: 403 }
      );
    }

    // Log successful view by supplier
    await serviceClient.from('audit_logs').insert({
      action: 'PO_VIEWED_BY_SUPPLIER',
      entity_type: 'purchase_orders',
      entity_id: id,
      details: {
        po_number: order.po_number,
        supplier: (order.supplier as any)?.name,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // Return PO data without sensitive internal fields
    const { supplier_access_code, ...safeOrder } = order;

    return NextResponse.json({
      success: true,
      order: safeOrder,
    });
  } catch (error) {
    console.error('[Public PO API] Error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดภายในระบบ' },
      { status: 500 }
    );
  }
}
