'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  FileText,
  Package,
  Settings,
  Users,
  CalendarCheck,
  ShoppingCart,
  ClipboardList,
  Stethoscope,
  UserCog,
  Bell,
  MoreHorizontal,
  LogOut,
  X,
  Boxes,
  ArrowLeftRight,
  History,
  ClipboardCheck,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/database';

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

interface RoleConfig {
  color: string;
  bgColor: string;
  hoverColor: string;
  centerBgColor: string;
  centerActiveColor: string;
  items: MenuItem[];
}

// All menu items with role access (mirrors Sidebar)
interface FullMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  roles: UserRole[];
}

const allMenuItems: FullMenuItem[] = [
  { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'cs', 'stock_staff'] },
  { id: 'dentist-dashboard', label: 'Dashboard ทันตแพทย์', icon: Calendar, href: '/dentist-dashboard', roles: ['dentist'] },
  { id: 'assistant-dashboard', label: 'งานวันนี้', icon: ClipboardCheck, href: '/assistant-dashboard', roles: ['assistant'] },
  { id: 'cases', label: 'เคส', icon: Stethoscope, href: '/cases', roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'] },
  { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients', roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'] },
  { id: 'inventory', label: 'สต็อกวัสดุ', icon: Boxes, href: '/inventory', roles: ['admin', 'stock_staff'] },
  { id: 'reservations', label: 'เตรียมวัสดุ', icon: ClipboardList, href: '/reservations', roles: ['admin', 'stock_staff', 'assistant'] },
  { id: 'orders', label: 'ใบสั่งซื้อ', icon: ShoppingCart, href: '/orders', roles: ['admin', 'stock_staff'] },
  { id: 'exchanges', label: 'ยืม-คืน/แลกเปลี่ยน', icon: ArrowLeftRight, href: '/exchanges', roles: ['admin', 'stock_staff'] },
  { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell, href: '/notifications', roles: ['admin', 'cs', 'stock_staff', 'dentist', 'assistant'] },
  { id: 'reports', label: 'รายงาน', icon: FileText, href: '/reports', roles: ['admin'] },
  { id: 'audit-logs', label: 'ประวัติการใช้งาน', icon: History, href: '/audit-logs', roles: ['admin'] },
  { id: 'settings', label: 'ตั้งค่าระบบ', icon: Settings, href: '/settings', roles: ['admin'] },
];

// Role-specific configurations with different colors
const roleConfigs: Record<UserRole, RoleConfig> = {
  admin: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    hoverColor: 'hover:text-blue-600',
    centerBgColor: 'bg-blue-600 hover:bg-blue-700',
    centerActiveColor: 'bg-blue-700',
    items: [
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'inventory', label: 'สต็อก', icon: Package, href: '/inventory' },
      { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard' }, // Center - main action
      { id: 'reservations', label: 'เตรียมของ', icon: CalendarCheck, href: '/reservations' },
      { id: 'settings', label: 'ตั้งค่า', icon: Settings, href: '/settings' },
    ],
  },
  dentist: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    hoverColor: 'hover:text-emerald-600',
    centerBgColor: 'bg-emerald-600 hover:bg-emerald-700',
    centerActiveColor: 'bg-emerald-700',
    items: [
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients' },
      { id: 'dentist-dashboard', label: 'หน้าหลัก', icon: Stethoscope, href: '/dentist-dashboard' }, // Center - main action
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, href: '/notifications' },
    ],
  },
  stock_staff: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    hoverColor: 'hover:text-orange-600',
    centerBgColor: 'bg-orange-600 hover:bg-orange-700',
    centerActiveColor: 'bg-orange-700',
    items: [
      { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard' },
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'inventory', label: 'สต็อก', icon: Package, href: '/inventory' }, // Center - main action
      { id: 'orders', label: 'สั่งซื้อ', icon: ShoppingCart, href: '/orders' },
      { id: 'reservations', label: 'จองของ', icon: CalendarCheck, href: '/reservations' },
    ],
  },
  assistant: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    hoverColor: 'hover:text-purple-600',
    centerBgColor: 'bg-purple-600 hover:bg-purple-700',
    centerActiveColor: 'bg-purple-700',
    items: [
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients' },
      { id: 'assistant-dashboard', label: 'งานวันนี้', icon: ClipboardList, href: '/assistant-dashboard' }, // Center - main action
      { id: 'reservations', label: 'จองของ', icon: CalendarCheck, href: '/reservations' },
      { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard' },
    ],
  },
  cs: {
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    hoverColor: 'hover:text-cyan-600',
    centerBgColor: 'bg-cyan-600 hover:bg-cyan-700',
    centerActiveColor: 'bg-cyan-700',
    items: [
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients' },
      { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard' }, // Center - main action
      { id: 'reservations', label: 'จองของ', icon: CalendarCheck, href: '/reservations' },
      { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, href: '/notifications' },
    ],
  },
};

// Get the default/home page for each role (the center button)
export function getRoleHomePage(role: UserRole): string {
  const config = roleConfigs[role];
  // Return the center (3rd) item's href as the home page
  return config.items[2].href;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, _hasHydrated } = useAuthStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
      setShowMoreMenu(false);
    }
  };

  // Show skeleton while hydrating or no user
  if (!_hasHydrated || !user) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="absolute inset-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" />
        <div className="relative pb-safe">
          <div className="flex items-end justify-around px-2 pt-2 pb-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={cn("flex flex-col items-center", i === 3 && "-mt-6")}>
                <div className={cn(
                  "bg-gray-200 rounded-full animate-pulse",
                  i === 3 ? "w-14 h-14 ring-4 ring-white" : "w-9 h-9"
                )} />
                <div className="w-8 h-2 bg-gray-200 rounded mt-1 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  const role = user.role as UserRole;
  const config = roleConfigs[role];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Get only first 4 items for nav, 5th slot is "more" menu
  const navItems = config.items.slice(0, 4);

  // Get all menu items for this role that are NOT already in the bottom nav
  const bottomNavHrefs = new Set(navItems.map((item) => item.href));
  const moreMenuItems = allMenuItems.filter(
    (item) => item.roles.includes(role) && !bottomNavHrefs.has(item.href)
  );

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 bg-black/50 z-50 md:hidden animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-safe animate-slide-up max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  router.push('/profile');
                  setShowMoreMenu(false);
                }}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-medium", config.centerBgColor.split(' ')[0])}>
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{user.full_name}</p>
                  <p className="text-xs text-gray-500">
                    {role === 'admin' && 'Admin'}
                    {role === 'dentist' && 'ทันตแพทย์'}
                    {role === 'assistant' && 'ผู้ช่วยทันตแพทย์'}
                    {role === 'stock_staff' && 'เจ้าหน้าที่สต็อก'}
                    {role === 'cs' && 'Customer Service'}
                  </p>
                </div>
              </button>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* All remaining menu items for this role */}
            <div className="space-y-1">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavigation(item.href);
                      setShowMoreMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors",
                      active ? cn(config.bgColor, config.color) : "hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", active ? config.color : "text-gray-500")} />
                    <span className={active ? "font-medium" : "text-gray-700"}>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2" />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors text-red-600"
            >
              <LogOut className={cn("w-5 h-5", loggingOut && "animate-pulse")} />
              <span>{loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        {/* Background with blur effect */}
        <div className="absolute inset-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" />

        {/* Safe area padding for devices with home indicator */}
        <div className="relative pb-safe">
          <div className="flex items-end justify-around px-2 pt-2 pb-3">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isCenter = index === 2;

              if (isCenter) {
                // Center elevated button
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.href)}
                    className="relative -mt-6 flex flex-col items-center"
                  >
                    {/* Elevated circle button */}
                    <div
                      className={cn(
                        'flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200',
                        'transform hover:scale-105 active:scale-95',
                        active ? config.centerActiveColor : config.centerBgColor,
                        'ring-4 ring-white'
                      )}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        'text-[10px] font-medium mt-1 transition-colors',
                        active ? config.color : 'text-gray-500'
                      )}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              }

              // Regular nav items
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex flex-col items-center justify-center py-1 px-3 min-w-[60px] transition-all duration-200',
                    'active:scale-95'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-xl transition-all duration-200',
                      active ? config.bgColor : 'hover:bg-gray-100'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-colors',
                        active ? config.color : 'text-gray-500'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium mt-0.5 transition-colors',
                      active ? config.color : 'text-gray-500'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            {/* More button (5th slot) */}
            <button
              onClick={() => setShowMoreMenu(true)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-3 min-w-[60px] transition-all duration-200',
                'active:scale-95'
              )}
            >
              <div className="p-2 rounded-xl transition-all duration-200 hover:bg-gray-100">
                <MoreHorizontal className="w-5 h-5 text-gray-500" />
              </div>
              <span className="text-[10px] font-medium mt-0.5 text-gray-500">
                เพิ่มเติม
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
