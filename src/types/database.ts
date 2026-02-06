// =====================================================
// DentalStock Management System - TypeScript Types
// Auto-generated types matching Supabase schema
// Version: 1.1.0 - Added REF/LOT support and out-of-stock reservations
// =====================================================

export type UserRole = 'admin' | 'dentist' | 'stock_staff' | 'assistant' | 'cs';
export type CaseStatus = 'gray' | 'green' | 'yellow' | 'red' | 'completed' | 'cancelled';
export type ReservationStatus = 'pending' | 'confirmed' | 'prepared' | 'used' | 'cancelled';
export type OrderStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'shipped' | 'received' | 'cancelled';
export type TransferType = 'borrow' | 'return' | 'exchange';
export type TransferStatus = 'pending' | 'approved' | 'completed' | 'rejected';
export type MovementType = 'receive' | 'use' | 'adjust' | 'transfer_out' | 'transfer_in' | 'expired' | 'damaged';
export type AlertType = 'out_of_stock' | 'urgent_48h' | 'material_shortage';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  license_number?: string;
  line_user_id?: string;
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
  material?: string;
  connection?: string;
  [key: string]: string | undefined;
}

export interface Product {
  id: string;
  sku?: string;
  ref_number?: string; // REF number from manufacturer
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
  // Computed for display
  total_stock?: number;
  available_stock?: number;
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
  inventory_id?: string; // Can be null for out-of-stock reservations
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
  // Out-of-stock reservation fields
  is_out_of_stock: boolean;
  requested_ref?: string;
  requested_lot?: string;
  requested_specs?: ProductSpecifications;
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
  supplier_access_code?: string;
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

// Urgent Case Alert
export interface UrgentCaseAlert {
  id: string;
  case_id: string;
  reservation_id?: string;
  alert_type: AlertType;
  message: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  // Relations
  case?: Case;
  reservation?: CaseReservation;
}

// Pending Stock Request (View)
export interface PendingStockRequest {
  reservation_id: string;
  case_id: string;
  case_number: string;
  surgery_date: string;
  dentist_id: string;
  dentist_name: string;
  product_id: string;
  sku?: string;
  product_name: string;
  ref_number?: string;
  requested_ref?: string;
  requested_lot?: string;
  requested_specs?: ProductSpecifications;
  quantity: number;
  is_out_of_stock: boolean;
  requested_at: string;
  urgency: 'urgent' | 'soon' | 'normal';
  days_until_surgery: number;
}

// Urgent Case 48h (View)
export interface UrgentCase48h {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  status: CaseStatus;
  dentist_id: string;
  dentist_name: string;
  patient_name: string;
  hn_number: string;
  days_until_surgery: number;
  unprepared_items: number;
  out_of_stock_items: number;
}

// Dashboard types
export interface DashboardSummary {
  cases_this_month: number;
  upcoming_cases: number;
  cases_not_ready: number;
  cases_not_reserved: number;
  low_stock_items: number;
  expiring_soon_items: number;
  urgent_alerts: number;
  out_of_stock_requests: number;
}

export interface LowStockItem {
  product_id: string;
  sku?: string;
  ref_number?: string;
  product_name: string;
  min_stock_level: number;
  current_stock: number;
  shortage: number;
}

export interface ExpiringItem {
  inventory_id: string;
  sku?: string;
  ref_number?: string;
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

// Search result for products with inventory info
export interface ProductSearchResult {
  id: string;
  sku?: string;
  ref_number?: string;
  name: string;
  brand?: string;
  category_name?: string;
  specifications?: ProductSpecifications;
  is_implant: boolean;
  // Stock info
  total_stock: number;
  available_stock: number;
  // Best lots to use
  inventory_items: InventorySearchItem[];
}

export interface InventorySearchItem {
  id: string;
  lot_number: string;
  expiry_date?: string;
  available_quantity: number;
  days_until_expiry?: number;
  recommendation: 'expiring_soon' | 'most_stock' | 'normal';
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
  inventory_id?: string; // Optional for out-of-stock
  product_id: string;
  quantity: number;
  is_out_of_stock?: boolean;
  requested_ref?: string;
  requested_lot?: string;
  requested_specs?: ProductSpecifications;
  notes?: string;
}

export interface CreateProductInput {
  sku?: string;
  ref_number?: string;
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

// =====================================================
// Case Preparation Types
// =====================================================

export type PreparationStatus = 'ready' | 'partial' | 'not_started' | 'blocked';

export interface CasePreparationItem {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  patient_id: string;
  patient_name: string;
  hn_number: string;
  dentist_id: string;
  dentist_name: string;
  procedure_type?: string;
  status: CaseStatus;
  reservations: CaseReservation[];
  preparation_summary: {
    total: number;
    prepared: number;
    pending: number;
    confirmed: number;
    out_of_stock: number;
  };
  preparation_status: PreparationStatus;
}

export type DateRangeType = 'today' | 'week' | 'month' | 'custom';

export interface DateRangeFilter {
  type: DateRangeType;
  startDate?: string;
  endDate?: string;
}

// =====================================================
// Emergency Popup Types
// =====================================================

export type UrgencyLevel = 'critical' | 'high' | 'medium';

export interface UrgentCaseForPopup {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  patient_name: string;
  hn_number: string;
  dentist_id: string;
  dentist_name: string;
  hours_until_surgery: number;
  minutes_until_surgery: number;
  has_no_reservations: boolean;
  unprepared_count: number;
  out_of_stock_count: number;
  urgency_level: UrgencyLevel;
}

// =====================================================
// Dentist Dashboard Types
// =====================================================

export interface DentistDashboardSummary {
  total_cases: number;
  pending_reservations: number;
  ready_cases: number;
  not_ready_cases: number;
  cases_today: number;
  cases_this_week: number;
  cases_this_month: number;
}

export interface DentistCaseItem {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  status: CaseStatus;
  patient_id: string;
  patient_name: string;
  hn_number: string;
  procedure_type?: string;
  material_status: 'ready' | 'waiting' | 'not_available' | 'not_reserved';
  reservation_summary: {
    total: number;
    prepared: number;
    confirmed: number;
    pending: number;
    out_of_stock: number;
  };
}

// =====================================================
// Assistant Dashboard Types
// =====================================================

export interface AssistantCaseItem {
  id: string;
  case_number: string;
  surgery_date: string;
  surgery_time?: string;
  status: CaseStatus;
  patient_id: string;
  patient_name: string;
  hn_number: string;
  dentist_id: string;
  dentist_name: string;
  procedure_type?: string;
  tooth_positions?: string[];
  notes?: string;
  reservations: AssistantReservationItem[];
  material_summary: {
    total: number;
    prepared: number;
    used: number;
    pending: number;
  };
}

export interface AssistantReservationItem {
  id: string;
  case_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_ref?: string;
  inventory_id?: string;
  lot_number?: string;
  expiry_date?: string;
  quantity: number;
  used_quantity: number;
  status: ReservationStatus;
  photo_evidence?: string[];
  is_out_of_stock: boolean;
  notes?: string;
}

export interface MaterialUsageRecord {
  id: string;
  case_id: string;
  reservation_id?: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_ref?: string;
  inventory_id?: string;
  lot_number?: string;
  quantity_used: number;
  photo_evidence: string[];
  used_by: string;
  used_at: string;
  is_additional: boolean; // true if added during surgery (not pre-reserved)
  notes?: string;
}

export interface CaseClosureSummary {
  case_id: string;
  case_number: string;
  patient_name: string;
  surgery_date: string;
  dentist_name: string;
  materials_used: MaterialUsageRecord[];
  materials_returned: {
    reservation_id: string;
    product_name: string;
    quantity: number;
  }[];
  total_materials_used: number;
  total_materials_returned: number;
  closed_by: string;
  closed_at: string;
  notes?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_name: string;
  details: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// Push Notification Types
// =====================================================

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePushSubscriptionInput {
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent?: string;
}

// =====================================================
// Notification Log Types
// =====================================================

export type NotificationChannel = 'push' | 'line' | 'in_app' | 'email' | 'cron';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
export type RecipientType = 'user' | 'role' | 'supplier' | 'system';

export interface NotificationLog {
  id: string;
  recipient_type: RecipientType;
  recipient_id?: string;
  channel: NotificationChannel;
  notification_type: string;
  title: string;
  message: string;
  status: NotificationStatus;
  sent_at?: string;
  read_at?: string;
  error_message?: string;
  retry_count: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// =====================================================
// Scheduled Notification Types
// =====================================================

export interface ScheduledNotificationSettings {
  enabled: boolean;
  morningTime: string;
  eveningTime: string;
  notifyStock: boolean;
  notifyCs: boolean;
  notifyDentist: boolean;
}

export interface ScheduledNotificationQueue {
  id: string;
  notification_type: string;
  scheduled_for: string;
  recipient_type: RecipientType;
  recipient_id?: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processed_at?: string;
  error_message?: string;
  created_at: string;
}

// =====================================================
// LINE Integration Types
// =====================================================

export interface LineBotInfo {
  userId: string;
  basicId: string;
  displayName: string;
  pictureUrl?: string;
  chatMode?: string;
  markAsReadMode?: string;
}

export interface LineWebhookEvent {
  type: 'follow' | 'unfollow' | 'message' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
}

// Extend existing User interface
export interface UserWithLine extends User {
  line_user_id?: string;
}

// Extend existing Supplier interface
export interface SupplierWithLine extends Supplier {
  line_user_id?: string;
}
