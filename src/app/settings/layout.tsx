
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cài Đặt | Ngân Sách Gia Đình',
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
