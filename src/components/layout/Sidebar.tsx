'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  Boxes,
  ClipboardList,
  ShoppingCart,
  ArrowLeftRight,
  FileText,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Stethoscope,
  History,
} from 'lucide-react';
import type { UserRole } from '@/types/database';

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const menuItems: MenuItem[] = [
  {
    name: 'ภาพรวม',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'cs', 'stock_staff'],
  },
  {
    name: 'เคสผ่าตัดรากเทียม',
    href: '/cases',
    icon: Stethoscope,
    roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'],
  },
  {
    name: 'รายชื่อคนไข้',
    href: '/patients',
    icon: Users,
    roles: ['admin', 'dentist', 'cs', 'stock_staff', 'assistant'],
  },
  {
    name: 'สต็อกวัสดุและรากเทียม',
    href: '/inventory',
    icon: Boxes,
    roles: ['admin', 'stock_staff'],
  },
  {
    name: 'การจองของสำหรับเคส',
    href: '/reservations',
    icon: ClipboardList,
    roles: ['admin', 'dentist', 'stock_staff', 'assistant'],
  },
  {
    name: 'ใบสั่งซื้อ',
    href: '/orders',
    icon: ShoppingCart,
    roles: ['admin', 'stock_staff'],
  },
  {
    name: 'ยืม-คืน/แลกเปลี่ยนกับบริษัท',
    href: '/exchanges',
    icon: ArrowLeftRight,
    roles: ['admin', 'stock_staff'],
  },
  {
    name: 'รายงาน',
    href: '/reports',
    icon: FileText,
    roles: ['admin'],
  },
  {
    name: 'ประวัติการใช้งาน',
    href: '/audit-logs',
    icon: History,
    roles: ['admin'],
  },
  {
    name: 'ตั้งค่าระบบ',
    href: '/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const filteredMenuItems = menuItems.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    if (loggingOut) return;
    
    setLoggingOut(true);
    try {
      // Log the logout event
      if (user) {
        await fetch('/api/auth/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'LOGOUT',
            userId: user.id,
            email: user.email,
          }),
        });
      }

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear local state
      logout();
      
      // Redirect to login
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-gray-900">DentalStock</h1>
              <p className="text-xs text-gray-500">Management System</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
        {filteredMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-blue-600')} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-gray-600 font-medium">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'ผู้ใช้งาน'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'admin' && 'Admin'}
                {user?.role === 'cs' && 'CS'}
                {user?.role === 'dentist' && 'Dentist'}
                {user?.role === 'assistant' && 'Dental Assistant'}
                {user?.role === 'stock_staff' && 'Inventory Manager'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className={cn(
                'p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors',
                loggingOut && 'opacity-50 cursor-not-allowed'
              )}
              title="ออกจากระบบ"
            >
              <LogOut className={cn('w-5 h-5', loggingOut && 'animate-pulse')} />
            </button>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </aside>
  );
}
