import {
  LayoutDashboard,
  Calendar,
  Users,
  Boxes,
  ClipboardList,
  ShoppingCart,
  ArrowLeftRight,
  FileText,
  Settings,
  Bell,
  Stethoscope,
  History,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types/database';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  roles: UserRole[];
}

// Single source of truth for all navigation menu items
export const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'cs', 'stock_staff'] },
  { id: 'dentist-dashboard', label: 'Dashboard ทันตแพทย์', icon: Calendar, href: '/dentist-dashboard', roles: ['dentist'] },
  { id: 'assistant-dashboard', label: 'งานวันนี้', icon: ClipboardCheck, href: '/assistant-dashboard', roles: ['assistant'] },
  { id: 'cases', label: 'เคส', icon: Stethoscope, href: '/cases', roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'] },
  { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients', roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'] },
  { id: 'inventory', label: 'สต็อกวัสดุและรากเทียม', icon: Boxes, href: '/inventory', roles: ['admin', 'stock_staff'] },
  { id: 'reservations', label: 'เตรียมวัสดุสำหรับเคส', icon: ClipboardList, href: '/reservations', roles: ['admin', 'stock_staff', 'assistant'] },
  { id: 'orders', label: 'ใบสั่งซื้อ', icon: ShoppingCart, href: '/orders', roles: ['admin', 'stock_staff'] },
  { id: 'exchanges', label: 'ยืม-คืน/แลกเปลี่ยนกับบริษัท', icon: ArrowLeftRight, href: '/exchanges', roles: ['admin', 'stock_staff'] },
  { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell, href: '/notifications', roles: ['admin', 'cs', 'stock_staff', 'dentist', 'assistant'] },
  { id: 'reports', label: 'รายงาน', icon: FileText, href: '/reports', roles: ['admin'] },
  { id: 'audit-logs', label: 'ประวัติการใช้งาน', icon: History, href: '/audit-logs', roles: ['admin'] },
  { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, href: '/settings', roles: ['admin'] },
];

export function getMenuItemsForRole(role: UserRole): MenuItem[] {
  return menuItems.filter((item) => item.roles.includes(role));
}
