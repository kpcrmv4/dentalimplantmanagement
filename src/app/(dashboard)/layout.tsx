import { DashboardLayout } from '@/components/layout';
import { AuthProvider } from '@/components/providers/AuthProvider';

// All dashboard pages require auth — skip static prerendering
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
