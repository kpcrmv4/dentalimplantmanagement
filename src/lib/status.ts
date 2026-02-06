import type { CaseStatus } from '@/types/database';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'gray' | 'info' | 'default';

// Case status → Badge variant mapping
// Used across cases list, case detail, dentist/assistant dashboards, preparation components
const CASE_STATUS_VARIANTS: Record<CaseStatus, BadgeVariant> = {
  green: 'success',
  yellow: 'warning',
  red: 'danger',
  gray: 'gray',
  completed: 'info',
  cancelled: 'gray',
};

export function getCaseStatusVariant(status: CaseStatus): BadgeVariant {
  return CASE_STATUS_VARIANTS[status] ?? 'gray';
}

// Case status → dot/indicator color (Tailwind bg class)
const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
  completed: 'bg-green-500',
  cancelled: 'bg-gray-400',
};

export function getCaseStatusColor(status: CaseStatus): string {
  return CASE_STATUS_COLORS[status] ?? 'bg-gray-400';
}

// Case status → card border + background (for assistant-dashboard timeline cards)
const CASE_STATUS_BORDERS: Record<CaseStatus, string> = {
  green: 'border-green-200 bg-green-50',
  yellow: 'border-yellow-200 bg-yellow-50',
  red: 'border-red-200 bg-red-50',
  gray: 'border-gray-200 bg-gray-50',
  completed: 'border-green-200 bg-green-50',
  cancelled: 'border-gray-200 bg-gray-50',
};

export function getCaseStatusBorder(status: CaseStatus): string {
  return CASE_STATUS_BORDERS[status] ?? 'border-gray-200 bg-gray-50';
}

// Material status → dot color (for dentist-dashboard timeline)
type MaterialStatus = 'ready' | 'waiting' | 'not_available' | 'not_reserved';

const MATERIAL_STATUS_COLORS: Record<MaterialStatus, string> = {
  ready: 'bg-green-500',
  waiting: 'bg-orange-500',
  not_available: 'bg-red-500',
  not_reserved: 'bg-gray-400',
};

export function getMaterialStatusColor(status: MaterialStatus): string {
  return MATERIAL_STATUS_COLORS[status] ?? 'bg-gray-400';
}

// Order status → Badge variant
type OrderStatus = 'draft' | 'pending' | 'approved' | 'ordered' | 'shipped' | 'received' | 'cancelled';

const ORDER_STATUS_VARIANTS: Record<OrderStatus, BadgeVariant> = {
  draft: 'gray',
  pending: 'warning',
  approved: 'info',
  ordered: 'info',
  shipped: 'info',
  received: 'success',
  cancelled: 'danger',
};

export function getOrderStatusVariant(status: OrderStatus): BadgeVariant {
  return ORDER_STATUS_VARIANTS[status] ?? 'gray';
}

// Exchange status → Badge variant
type ExchangeStatus = 'pending' | 'active' | 'returned' | 'completed' | 'cancelled';

const EXCHANGE_STATUS_VARIANTS: Record<ExchangeStatus, BadgeVariant> = {
  pending: 'warning',
  active: 'info',
  returned: 'success',
  completed: 'success',
  cancelled: 'gray',
};

export function getExchangeStatusVariant(status: ExchangeStatus): BadgeVariant {
  return EXCHANGE_STATUS_VARIANTS[status] ?? 'gray';
}

// Short role labels for badges (used in settings user table)
const ROLE_SHORT_LABELS: Record<string, string> = {
  admin: 'Admin',
  cs: 'CS',
  dentist: 'ทันตแพทย์',
  assistant: 'ผู้ช่วย',
  stock_staff: 'สต็อก',
};

export function getRoleShortLabel(role: string): string {
  return ROLE_SHORT_LABELS[role] ?? role;
}
