import { Metadata } from 'next';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export const metadata: Metadata = {
  title: 'Smart Hub - Thu Chi Gia Đình',
  description: 'Trung tâm điều khiển thông minh cho gia đình - theo dõi mục tiêu, thời tiết, smart home',
};

export default function SmartHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthenticatedLayout>
      {children}
    </AuthenticatedLayout>
  );
} 