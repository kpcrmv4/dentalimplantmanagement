// =====================================================
// DentalStock Management System - TypeScript Types
// Auto-generated types matching Supabase schema
// =====================================================

export type UserRole = 'admin' | 'dentist' | 'stock_staff' | 'assistant' | 'cs';
export type CaseStatus = 'gray' | 'green' | 'yellow' | 'red' | 'completed' | 'cancelled';
export type ReservationStatus = 'pending' | 'confirmed' | 'prepared' | 'used' | 'cancelled';
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'shipped' | 'received' | 'cancelled';
export type TransferType = 'borrow' | 'return' | 'exchange';
export type TransferStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type MovementType = 'receive' | 'use' | 'adjust' | 'transfer_out' | 'transfer_in' | 'expired' | 'damaged';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  license_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  hn_number: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  notes?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ProductSpecifications {
  diameter?: string;
  length?: string;
  platform?: string;
  surface?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  unit: string;
  unit_price: number;
  min_stock_level: number;
  is_implant: boolean;
  specifications?: ProductSpecifications;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: ProductCategory;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  payment_terms?: string;
  lead_time_days: number;
  on_time_delivery_score: number;
  quality_score: number;
  reliability_score: number;
  overall_score: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_sku?: string;
  unit_cost?: number;
  is_preferred: boolean;
  created_at: string;
  // Relations
  product?: Product;
  supplier?: Supplier;
}

export interface Inventory {
  id: string;
  product_id: string;
  lot_number: string;
  serial_number?: string;
  expiry_date?: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  location?: string;
  received_date: string;
  unit_cost?: number;
  supplier_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  product?: Product;
  supplier?: Supplier;
}

export interface Case {
  id: string;
  case_number: string;
  patient_id: string;
  dentist_id: string;
  assistant_id?: string;
  surgery_date: string;
  surgery_time?: string;
  estimated_duration: number;
  tooth_positions?: string[];
  procedure_type?: string;
  status: CaseStatus;
  notes?: string;
  pre_op_notes?: string;
  post_op_notes?: string;
  is_emergency: boolean;
  completed_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  patient?: Patient;
  dentist?: User;
  assistant?: User;
  reservations?: CaseReservation[];
}

export interface CaseReservation {
  id: string;
  case_id: string;
  inventory_id: string;
  product_id: string;
  quantity: number;
  status: ReservationStatus;
  reserved_by?: string;
  reserved_at: string;
  prepared_by?: string;
  prepared_at?: string;
  used_quantity: number;
  used_at?: string;
  used_by?: string;
  photo_evidence?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relations
  case?: Case;
  inventory?: Inventory;
  product?: Product;
}

export interface StockMovement {
  id: string;
  inventory_id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  lot_number?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  // Relations
  inventory?: Inventory;
  product?: Product;
  performer?: User;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: OrderStatus;
  order_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  received_by?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  received_quantity: number;
  lot_number?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  // Relations
  product?: Product;
}

export interface Transfer {
  id: string;
  transfer_number: string;
  transfer_type: TransferType;
  supplier_id?: string;
  status: TransferStatus;
  transfer_date: string;
  return_due_date?: string;
  actual_return_date?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  supplier?: Supplier;
  items?: TransferItem[];
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  inventory_id?: string;
  quantity: number;
  lot_number?: string;
  serial_number?: string;
  notes?: string;
  created_at: string;
  // Relations
  product?: Product;
  inventory?: Inventory;
}

export interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

// Dashboard types
export interface DashboardSummary {
  cases_this_month: number;
  upcoming_cases: number;
  cases_not_ready: number;
  cases_not_reserved: number;
  low_stock_items: number;
  expiring_soon_items: number;
}

export interface LowStockItem {
  product_id: string;
  sku: string;
  product_name: string;
  min_stock_level: number;
  current_stock: number;
  shortage: number;
}

export interface ExpiringItem {
  inventory_id: string;
  sku: string;
  product_name: string;
  lot_number: string;
  expiry_date: string;
  available_quantity: number;
  days_until_expiry: number;
}

// Calendar types
export interface CalendarCase {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  status: CaseStatus;
  patient_name: string;
  dentist_name: string;
  procedure_type?: string;
}

// Form types
export interface CreatePatientInput {
  hn_number: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  medical_history?: string;
  allergies?: string;
  notes?: string;
}

export interface CreateCaseInput {
  patient_id: string;
  dentist_id: string;
  assistant_id?: string;
  surgery_date: string;
  surgery_time?: string;
  estimated_duration?: number;
  tooth_positions?: string[];
  procedure_type?: string;
  notes?: string;
  pre_op_notes?: string;
  is_emergency?: boolean;
}

export interface CreateReservationInput {
  case_id: string;
  inventory_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
}

export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category_id?: string;
  brand?: string;
  unit: string;
  unit_price: number;
  min_stock_level: number;
  is_implant?: boolean;
  specifications?: ProductSpecifications;
}

export interface CreateInventoryInput {
  product_id: string;
  lot_number: string;
  serial_number?: string;
  expiry_date?: string;
  quantity: number;
  location?: string;
  unit_cost?: number;
  supplier_id?: string;
  notes?: string;
}

export interface CreateOrderInput {
  supplier_id: string;
  expected_delivery_date?: string;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_cost: number;
  }[];
}


// Exchange types
export type ExchangeType = 'borrow' | 'lend' | 'exchange';
export type ExchangeStatus = 'pending' | 'active' | 'returned' | 'completed';

export interface Exchange {
  id: string;
  reference_number: string;
  type: ExchangeType;
  supplier_id: string;
  product_id: string;
  inventory_id?: string;
  quantity: number;
  status: ExchangeStatus;
  exchange_date: string;
  expected_return_date?: string;
  actual_return_date?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Relations
  supplier?: Supplier;
  product?: Product;
  inventory?: Inventory;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}
