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
  return useSWR<any[]>('categories', async () => {
    const { data, error } = await supabase
      .from('categories')
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
