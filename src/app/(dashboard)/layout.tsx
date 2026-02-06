import { DashboardLayout } from '@/components/layout';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';

// All dashboard pages require auth — skip static prerendering
export const dynamic = 'force-dynamic';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SWRProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </SWRProvider>
    </AuthProvider>
  );
}
