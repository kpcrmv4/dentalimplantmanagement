'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn, getRoleText } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { performLogout } from '@/lib/logout';
import { getMenuItemsForRole } from '@/lib/navigation';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const filteredMenuItems = user?.role ? getMenuItemsForRole(user.role) : [];

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await performLogout(user);
    } catch (error) {
      console.error('Logout error:', error);
    }
    // Always clear store and redirect, even if performLogout threw
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300',
        'hidden md:block', // Hide on mobile, show on md and up
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
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
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
                  {user?.role ? getRoleText(user.role) : ''}
                </p>
              </div>
            )}
          </Link>
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
