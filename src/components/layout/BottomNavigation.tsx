'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
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
      { id: 'settings', label: 'ตั้งค่า', icon: Settings, href: '/settings' },
      { id: 'users', label: 'ผู้ใช้', icon: UserCog, href: '/settings/users' },
    ],
  },
  dentist: {
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    hoverColor: 'hover:text-emerald-600',
    centerBgColor: 'bg-emerald-600 hover:bg-emerald-700',
    centerActiveColor: 'bg-emerald-700',
    items: [
      { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard, href: '/dashboard' },
      { id: 'cases', label: 'เคส', icon: FileText, href: '/cases' },
      { id: 'dentist-dashboard', label: 'งานฉัน', icon: Stethoscope, href: '/dentist-dashboard' }, // Center - main action
      { id: 'reservations', label: 'จองของ', icon: CalendarCheck, href: '/reservations' },
      { id: 'patients', label: 'คนไข้', icon: Users, href: '/patients' },
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
  const { user } = useAuthStore();

  // Show skeleton while loading
  if (!user) {
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" />

      {/* Safe area padding for devices with home indicator */}
      <div className="relative pb-safe">
        <div className="flex items-end justify-around px-2 pt-2 pb-3">
          {config.items.map((item, index) => {
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
        </div>
      </div>
    </nav>
  );
}
