'use client';

import useSWR from 'swr';
import { supabase } from '@/lib/supabase';
import type {
  DashboardSummary,
  LowStockItem,
  ExpiringItem,
  CalendarCase,
  Case,
  Patient,
  Product,
  Inventory,
  Supplier,
  PurchaseOrder,
  Transfer,
  User,
  Notification,
  CasePreparationItem,
  DateRangeFilter,
  PreparationStatus,
  UrgentCaseForPopup,
  UrgencyLevel,
  DentistDashboardSummary,
  DentistCaseItem,
} from '@/types/database';

// Generic fetcher for Supabase
const fetcher = async <T>(key: string): Promise<T> => {
  const [table, ...params] = key.split(':');
  
  let query = supabase.from(table).select('*');
  
  // Parse additional parameters
  params.forEach((param) => {
    const [action, value] = param.split('=');
    if (action === 'order') {
      const [column, direction] = value.split(',');
      query = query.order(column, { ascending: direction !== 'desc' });
    }
    if (action === 'limit') {
      query = query.limit(parseInt(value));
    }
    if (action === 'eq') {
      const [column, val] = value.split(',');
      query = query.eq(column, val);
    }
  });

  const { data, error } = await query;
  if (error) throw error;
  return data as T;
};

// Dashboard hooks
export function useDashboardSummary() {
  return useSWR<DashboardSummary>('dashboard_summary', async () => {
    const { data, error } = await supabase
      .from('dashboard_summary')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  });
}

export function useLowStockItems() {
  return useSWR<LowStockItem[]>('low_stock_items', async () => {
    const { data, error } = await supabase
      .from('low_stock_items')
      .select('*')
      .limit(10);
    if (error) throw error;
    return data || [];
  });
}

export function useExpiringItems() {
  return useSWR<ExpiringItem[]>('expiring_items', async () => {
    const { data, error } = await supabase
      .from('expiring_items')
      .select('*')
      .limit(10);
    if (error) throw error;
    return data || [];
  });
}

// Calendar hooks
export function useCalendarCases(month?: Date) {
  const monthKey = month ? month.toISOString().slice(0, 7) : 'current';
  
  return useSWR<CalendarCase[]>(`calendar_cases:${monthKey}`, async () => {
    const startDate = month 
      ? new Date(month.getFullYear(), month.getMonth(), 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        surgery_date,
        surgery_time,
        status,
        procedure_type,
        patient:patients(first_name, last_name),
        dentist:users!cases_dentist_id_fkey(full_name)
      `)
      .gte('surgery_date', startDate.toISOString().split('T')[0])
      .lte('surgery_date', endDate.toISOString().split('T')[0])
      .order('surgery_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      case_number: c.case_number,
      surgery_date: c.surgery_date,
      surgery_time: c.surgery_time,
      status: c.status,
      procedure_type: c.procedure_type,
      patient_name: c.patient 
        ? `${c.patient.first_name} ${c.patient.last_name}` 
        : 'ไม่ระบุ',
      dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
    }));
  });
}

// Cases hooks
export function useCases(filters?: { status?: string; dentist_id?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  
  return useSWR<Case[]>(`cases:${filterKey}`, async () => {
    let query = supabase
      .from('cases')
      .select(`
        *,
        patient:patients(*),
        dentist:users!cases_dentist_id_fkey(*),
        assistant:users!cases_assistant_id_fkey(*)
      `)
      .order('surgery_date', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.dentist_id) {
      query = query.eq('dentist_id', filters.dentist_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

export function useCase(id: string) {
  return useSWR<Case>(`case:${id}`, async () => {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        patient:patients(*),
        dentist:users!cases_dentist_id_fkey(*),
        assistant:users!cases_assistant_id_fkey(*),
        reservations:case_reservations(
          *,
          product:products(*),
          inventory:inventory(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  });
}

// Patients hooks
export function usePatients(search?: string) {
  return useSWR<Patient[]>(`patients:${search || 'all'}`, async () => {
    let query = supabase
      .from('patients')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,hn_number.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

export function usePatient(id: string) {
  return useSWR<Patient>(`patient:${id}`, async () => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  });
}

// Products hooks
export function useProducts(categoryId?: string) {
  return useSWR<Product[]>(`products:${categoryId || 'all'}`, async () => {
    let query = supabase
      .from('products')
      .select(`
        *,
        category:product_categories(*)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Inventory hooks
export function useInventory(productId?: string) {
  return useSWR<Inventory[]>(`inventory:${productId || 'all'}`, async () => {
    let query = supabase
      .from('inventory')
      .select(`
        *,
        product:products(*),
        supplier:suppliers(*)
      `)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Suppliers hooks
export function useSuppliers() {
  return useSWR<Supplier[]>('suppliers', async () => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

// Orders hooks
export function useOrders(status?: string) {
  return useSWR<PurchaseOrder[]>(`orders:${status || 'all'}`, async () => {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_order_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Transfers hooks
export function useTransfers(type?: string) {
  return useSWR<Transfer[]>(`transfers:${type || 'all'}`, async () => {
    let query = supabase
      .from('transfers')
      .select(`
        *,
        supplier:suppliers(*),
        items:transfer_items(
          *,
          product:products(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('transfer_type', type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Users hooks
export function useUsers(role?: string) {
  return useSWR<User[]>(`users:${role || 'all'}`, async () => {
    let query = supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Notifications hooks
export function useNotifications(userId: string) {
  return useSWR<Notification[]>(`notifications:${userId}`, async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  });
}

export function useUnreadNotificationCount(userId: string) {
  return useSWR<number>(`notifications_count:${userId}`, async () => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  });
}

// Categories hooks
export function useCategories() {
  return useSWR<any[]>('product_categories', async () => {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  });
}

// Exchanges hooks
export function useExchanges(filters?: { type?: string; status?: string }) {
  const filterKey = filters ? JSON.stringify(filters) : 'all';
  
  return useSWR<any[]>(`exchanges:${filterKey}`, async () => {
    let query = supabase
      .from('exchanges')
      .select(`
        *,
        supplier:suppliers(*),
        product:products(*),
        inventory:inventory(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}

// Reservations hooks
export function useReservations(caseId?: string) {
  return useSWR<any[]>(`reservations:${caseId || 'all'}`, async () => {
    let query = supabase
      .from('case_reservations')
      .select(`
        *,
        case:cases(*),
        product:products(*),
        inventory:inventory(*)
      `)
      .order('created_at', { ascending: false });

    if (caseId) {
      query = query.eq('case_id', caseId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  });
}


// =====================================================
// Urgent Cases and Alerts Hooks
// =====================================================

import type { UrgentCase48h, PendingStockRequest, UrgentCaseAlert } from '@/types/database';

// Urgent cases within 48 hours
export function useUrgentCases48h() {
  return useSWR<UrgentCase48h[]>('urgent_cases_48h', async () => {
    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        surgery_date,
        surgery_time,
        status,
        dentist:users!cases_dentist_id_fkey(id, full_name),
        patient:patients(first_name, last_name, hn_number),
        reservations:case_reservations(id, status, is_out_of_stock)
      `)
      .gte('surgery_date', today.toISOString().split('T')[0])
      .lte('surgery_date', twoDaysLater.toISOString().split('T')[0])
      .not('status', 'in', '("completed","cancelled")')
      .order('surgery_date', { ascending: true })
      .order('surgery_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((c: any) => {
      const surgeryDate = new Date(c.surgery_date);
      const daysUntil = Math.ceil((surgeryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const unpreparedItems = (c.reservations || []).filter(
        (r: any) => r.status !== 'prepared' && r.status !== 'used'
      ).length;
      
      const outOfStockItems = (c.reservations || []).filter(
        (r: any) => r.is_out_of_stock === true
      ).length;

      return {
        id: c.id,
        case_number: c.case_number,
        surgery_date: c.surgery_date,
        surgery_time: c.surgery_time,
        status: c.status,
        dentist_id: c.dentist?.id,
        dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
        patient_name: c.patient 
          ? `${c.patient.first_name} ${c.patient.last_name}` 
          : 'ไม่ระบุ',
        hn_number: c.patient?.hn_number || '',
        days_until_surgery: daysUntil,
        unprepared_items: unpreparedItems,
        out_of_stock_items: outOfStockItems,
      };
    });
  });
}

// Pending stock requests (out-of-stock reservations)
export function usePendingStockRequests() {
  return useSWR<PendingStockRequest[]>('pending_stock_requests', async () => {
    const { data, error } = await supabase
      .from('case_reservations')
      .select(`
        id,
        case_id,
        product_id,
        quantity,
        is_out_of_stock,
        requested_ref,
        requested_lot,
        requested_specs,
        created_at,
        case:cases(
          case_number,
          surgery_date,
          dentist_id,
          dentist:users!cases_dentist_id_fkey(full_name)
        ),
        product:products(sku, name, ref_number)
      `)
      .eq('is_out_of_stock', true)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const today = new Date();

    return (data || []).map((r: any) => {
      const surgeryDate = new Date(r.case?.surgery_date);
      const daysUntil = Math.ceil((surgeryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: 'urgent' | 'soon' | 'normal' = 'normal';
      if (daysUntil <= 2) urgency = 'urgent';
      else if (daysUntil <= 7) urgency = 'soon';

      return {
        reservation_id: r.id,
        case_id: r.case_id,
        case_number: r.case?.case_number || '',
        surgery_date: r.case?.surgery_date || '',
        dentist_id: r.case?.dentist_id || '',
        dentist_name: r.case?.dentist?.full_name || 'ไม่ระบุ',
        product_id: r.product_id,
        sku: r.product?.sku || '',
        product_name: r.product?.name || '',
        ref_number: r.product?.ref_number,
        requested_ref: r.requested_ref,
        requested_lot: r.requested_lot,
        requested_specs: r.requested_specs,
        quantity: r.quantity,
        is_out_of_stock: r.is_out_of_stock,
        requested_at: r.created_at,
        urgency,
        days_until_surgery: daysUntil,
      };
    });
  });
}

// Urgent case alerts
export function useUrgentAlerts() {
  return useSWR<UrgentCaseAlert[]>('urgent_alerts', async () => {
    const { data, error } = await supabase
      .from('urgent_case_alerts')
      .select(`
        *,
        case:cases(case_number, surgery_date),
        reservation:case_reservations(
          product:products(name, sku)
        )
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  });
}

// Count of urgent alerts for badge
export function useUrgentAlertCount() {
  return useSWR<number>('urgent_alert_count', async () => {
    const { count, error } = await supabase
      .from('urgent_case_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false);

    if (error) throw error;
    return count || 0;
  });
}

// Product search with inventory info for shopping-like UX
export function useProductSearch(searchTerm: string) {
  return useSWR(
    searchTerm.length >= 2 ? `product_search:${searchTerm}` : null,
    async () => {
      // Search products by name, SKU, or REF
      const { data: products, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          ref_number,
          name,
          brand,
          is_implant,
          specifications,
          category:product_categories(name)
        `)
        .eq('is_active', true)
        .or(`name.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%,ref_number.ilike.%${searchTerm}%`)
        .limit(20);

      if (productError) throw productError;
      if (!products || products.length === 0) return [];

      // Get inventory for these products
      const productIds = products.map((p) => p.id);
      const { data: inventory, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .in('product_id', productIds)
        .gt('available_quantity', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      if (invError) throw invError;

      const today = new Date();

      // Map products with their inventory
      return products.map((product: any) => {
        const productInventory = (inventory || []).filter(
          (i: any) => i.product_id === product.id
        );

        const totalStock = productInventory.reduce(
          (sum: number, i: any) => sum + i.quantity,
          0
        );
        const availableStock = productInventory.reduce(
          (sum: number, i: any) => sum + i.available_quantity,
          0
        );

        // Sort inventory items for recommendations
        const inventoryItems = productInventory.map((inv: any) => {
          const expiryDate = inv.expiry_date ? new Date(inv.expiry_date) : null;
          const daysUntilExpiry = expiryDate
            ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;

          let recommendation: 'expiring_soon' | 'most_stock' | 'normal' = 'normal';
          if (daysUntilExpiry !== undefined && daysUntilExpiry <= 90) {
            recommendation = 'expiring_soon';
          }

          return {
            id: inv.id,
            lot_number: inv.lot_number,
            expiry_date: inv.expiry_date,
            available_quantity: inv.available_quantity,
            days_until_expiry: daysUntilExpiry,
            recommendation,
          };
        });

        // Mark the one with most stock
        if (inventoryItems.length > 0) {
          const maxStockItem = inventoryItems.reduce((max, item) =>
            item.available_quantity > max.available_quantity ? item : max
          );
          if (maxStockItem.recommendation === 'normal') {
            (maxStockItem as { recommendation: 'expiring_soon' | 'most_stock' | 'normal' }).recommendation = 'most_stock';
          }
        }

        return {
          id: product.id,
          sku: product.sku,
          ref_number: product.ref_number,
          name: product.name,
          brand: product.brand,
          category_name: product.category?.name,
          specifications: product.specifications,
          is_implant: product.is_implant,
          total_stock: totalStock,
          available_stock: availableStock,
          inventory_items: inventoryItems,
        };
      });
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 500,
    }
  );
}

// =====================================================
// Case Preparation Hooks
// =====================================================

export function useCasePreparation(filter: DateRangeFilter) {
  const filterKey = JSON.stringify(filter);

  return useSWR<CasePreparationItem[]>(`case_preparation:${filterKey}`, async () => {
    if (!filter.startDate || !filter.endDate) {
      return [];
    }

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        surgery_date,
        surgery_time,
        status,
        procedure_type,
        patient:patients(id, first_name, last_name, hn_number),
        dentist:users!cases_dentist_id_fkey(id, full_name),
        reservations:case_reservations(
          id,
          status,
          quantity,
          is_out_of_stock,
          product:products(id, name, sku, ref_number),
          inventory:inventory(id, lot_number, expiry_date)
        )
      `)
      .gte('surgery_date', filter.startDate)
      .lte('surgery_date', filter.endDate)
      .not('status', 'in', '("completed","cancelled")')
      .order('surgery_date', { ascending: true })
      .order('surgery_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((c: any) => {
      const reservations = c.reservations || [];
      const total = reservations.length;
      const prepared = reservations.filter((r: any) => r.status === 'prepared' || r.status === 'used').length;
      const pending = reservations.filter((r: any) => r.status === 'pending').length;
      const confirmed = reservations.filter((r: any) => r.status === 'confirmed').length;
      const out_of_stock = reservations.filter((r: any) => r.is_out_of_stock).length;

      let preparation_status: PreparationStatus = 'not_started';
      if (total === 0) {
        preparation_status = 'not_started';
      } else if (out_of_stock > 0) {
        preparation_status = 'blocked';
      } else if (prepared === total) {
        preparation_status = 'ready';
      } else if (prepared > 0) {
        preparation_status = 'partial';
      }

      return {
        id: c.id,
        case_number: c.case_number,
        surgery_date: c.surgery_date,
        surgery_time: c.surgery_time,
        patient_id: c.patient?.id || '',
        patient_name: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'ไม่ระบุ',
        hn_number: c.patient?.hn_number || '',
        dentist_id: c.dentist?.id || '',
        dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
        procedure_type: c.procedure_type,
        status: c.status,
        reservations: reservations.map((r: any) => ({
          ...r,
          product: r.product,
          inventory: r.inventory,
        })),
        preparation_summary: {
          total,
          prepared,
          pending,
          confirmed,
          out_of_stock,
        },
        preparation_status,
      };
    });
  });
}

// =====================================================
// Emergency Popup Hooks
// =====================================================

export function useUrgentCasesForPopup() {
  return useSWR<UrgentCaseForPopup[]>('urgent_cases_popup', async () => {
    const now = new Date();
    const twoDaysLater = new Date(now);
    twoDaysLater.setDate(now.getDate() + 2);

    const { data, error } = await supabase
      .from('cases')
      .select(`
        id,
        case_number,
        surgery_date,
        surgery_time,
        status,
        dentist:users!cases_dentist_id_fkey(id, full_name),
        patient:patients(first_name, last_name, hn_number),
        reservations:case_reservations(id, status, is_out_of_stock)
      `)
      .gte('surgery_date', now.toISOString().split('T')[0])
      .lte('surgery_date', twoDaysLater.toISOString().split('T')[0])
      .not('status', 'in', '("completed","cancelled")')
      .order('surgery_date', { ascending: true })
      .order('surgery_time', { ascending: true });

    if (error) throw error;

    const urgentCases: UrgentCaseForPopup[] = [];

    (data || []).forEach((c: any) => {
      const reservations = c.reservations || [];
      const hasNoReservations = reservations.length === 0;
      const unpreparedCount = reservations.filter(
        (r: any) => r.status !== 'prepared' && r.status !== 'used'
      ).length;
      const outOfStockCount = reservations.filter((r: any) => r.is_out_of_stock).length;

      // Only include cases with issues: no reservations, unprepared items, or out-of-stock items
      if (hasNoReservations || unpreparedCount > 0 || outOfStockCount > 0) {
        // Calculate time until surgery
        const surgeryDateTime = new Date(c.surgery_date);
        if (c.surgery_time) {
          const [hours, minutes] = c.surgery_time.split(':').map(Number);
          surgeryDateTime.setHours(hours, minutes, 0, 0);
        } else {
          surgeryDateTime.setHours(8, 0, 0, 0); // Default to 8 AM if no time specified
        }

        const timeDiff = surgeryDateTime.getTime() - now.getTime();
        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

        let urgency_level: UrgencyLevel = 'medium';
        if (hoursUntil < 6) {
          urgency_level = 'critical';
        } else if (hoursUntil < 24) {
          urgency_level = 'high';
        }

        urgentCases.push({
          id: c.id,
          case_number: c.case_number,
          surgery_date: c.surgery_date,
          surgery_time: c.surgery_time,
          patient_name: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'ไม่ระบุ',
          hn_number: c.patient?.hn_number || '',
          dentist_id: c.dentist?.id || '',
          dentist_name: c.dentist?.full_name || 'ไม่ระบุ',
          hours_until_surgery: Math.max(0, hoursUntil),
          minutes_until_surgery: Math.max(0, minutesUntil),
          has_no_reservations: hasNoReservations,
          unprepared_count: unpreparedCount,
          out_of_stock_count: outOfStockCount,
          urgency_level,
        });
      }
    });

    // Sort by urgency (most urgent first)
    return urgentCases.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      if (urgencyOrder[a.urgency_level] !== urgencyOrder[b.urgency_level]) {
        return urgencyOrder[a.urgency_level] - urgencyOrder[b.urgency_level];
      }
      return a.hours_until_surgery - b.hours_until_surgery;
    });
  }, {
    refreshInterval: 60000, // Refresh every minute for countdown accuracy
  });
}

// =====================================================
// Dentist Dashboard Hooks
// =====================================================

export function useDentistDashboard(dentistId: string, filter: DateRangeFilter) {
  const filterKey = JSON.stringify({ dentistId, filter });

  return useSWR<{ summary: DentistDashboardSummary; cases: DentistCaseItem[] }>(
    dentistId ? `dentist_dashboard:${filterKey}` : null,
    async () => {
      if (!filter.startDate || !filter.endDate) {
        return {
          summary: {
            total_cases: 0,
            pending_reservations: 0,
            ready_cases: 0,
            not_ready_cases: 0,
            cases_today: 0,
            cases_this_week: 0,
            cases_this_month: 0,
          },
          cases: [],
        };
      }

      // Fetch cases for the dentist within date range
      const { data, error } = await supabase
        .from('cases')
        .select(`
          id,
          case_number,
          surgery_date,
          surgery_time,
          status,
          procedure_type,
          patient:patients(id, first_name, last_name, hn_number),
          reservations:case_reservations(id, status, is_out_of_stock)
        `)
        .eq('dentist_id', dentistId)
        .gte('surgery_date', filter.startDate)
        .lte('surgery_date', filter.endDate)
        .not('status', 'in', '("completed","cancelled")')
        .order('surgery_date', { ascending: true })
        .order('surgery_time', { ascending: true });

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      let totalCases = 0;
      let pendingReservations = 0;
      let readyCases = 0;
      let notReadyCases = 0;
      let casesToday = 0;
      let casesThisWeek = 0;
      let casesThisMonth = 0;

      const cases: DentistCaseItem[] = (data || []).map((c: any) => {
        const reservations = c.reservations || [];
        const total = reservations.length;
        const prepared = reservations.filter((r: any) => r.status === 'prepared' || r.status === 'used').length;
        const confirmed = reservations.filter((r: any) => r.status === 'confirmed').length;
        const pending = reservations.filter((r: any) => r.status === 'pending').length;
        const out_of_stock = reservations.filter((r: any) => r.is_out_of_stock).length;

        let material_status: 'ready' | 'waiting' | 'not_available' | 'not_reserved' = 'not_reserved';
        if (total === 0) {
          material_status = 'not_reserved';
        } else if (out_of_stock > 0) {
          material_status = 'not_available';
        } else if (prepared === total) {
          material_status = 'ready';
        } else {
          material_status = 'waiting';
        }

        // Count for summary
        totalCases++;
        pendingReservations += pending;
        if (material_status === 'ready') readyCases++;
        if (material_status !== 'ready' && material_status !== 'not_reserved') notReadyCases++;

        const caseDate = c.surgery_date;
        if (caseDate === today) casesToday++;
        if (caseDate >= weekStart.toISOString().split('T')[0] && caseDate <= weekEnd.toISOString().split('T')[0]) {
          casesThisWeek++;
        }
        if (caseDate >= monthStart.toISOString().split('T')[0] && caseDate <= monthEnd.toISOString().split('T')[0]) {
          casesThisMonth++;
        }

        return {
          id: c.id,
          case_number: c.case_number,
          surgery_date: c.surgery_date,
          surgery_time: c.surgery_time,
          status: c.status,
          patient_id: c.patient?.id || '',
          patient_name: c.patient ? `${c.patient.first_name} ${c.patient.last_name}` : 'ไม่ระบุ',
          hn_number: c.patient?.hn_number || '',
          procedure_type: c.procedure_type,
          material_status,
          reservation_summary: {
            total,
            prepared,
            confirmed,
            pending,
            out_of_stock,
          },
        };
      });

      return {
        summary: {
          total_cases: totalCases,
          pending_reservations: pendingReservations,
          ready_cases: readyCases,
          not_ready_cases: notReadyCases,
          cases_today: casesToday,
          cases_this_week: casesThisWeek,
          cases_this_month: casesThisMonth,
        },
        cases,
      };
    }
  );
}
