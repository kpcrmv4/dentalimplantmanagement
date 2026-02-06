import { DashboardLayout } from '@/components/layout';
import { AuthProvider } from '@/components/providers/AuthProvider';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
