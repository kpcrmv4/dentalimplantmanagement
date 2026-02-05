'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Sidebar to avoid SSR issues with zustand
const Sidebar = dynamic(() => import('./Sidebar').then(mod => ({ default: mod.Sidebar })), {
  ssr: false,
  loading: () => <div className="hidden md:block fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200" />
});

// Dynamically import BottomNavigation for mobile
const BottomNavigation = dynamic(() => import('./BottomNavigation').then(mod => ({ default: mod.BottomNavigation })), {
  ssr: false,
});

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Main content - no left margin on mobile, add bottom padding for bottom nav */}
      <main className="md:ml-64 min-h-screen transition-all duration-300 pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom Navigation - visible only on mobile */}
      <BottomNavigation />
    </div>
  );
}
