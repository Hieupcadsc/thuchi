import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Báo Cáo | Ngân Sách Gia Đình',
};

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
