import DashboardLayout from '@/components/layout/DashboardLayout';
import AuthProvider from '@/components/layout/AuthProvider';

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
