'use client';

import { type ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Sidebar to avoid SSR issues with zustand
const Sidebar = dynamic(() => import('./Sidebar').then(mod => ({ default: mod.Sidebar })), {
  ssr: false,
  loading: () => <div className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200" />
});

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
