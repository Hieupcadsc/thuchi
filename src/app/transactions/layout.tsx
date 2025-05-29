import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giao Dịch | Ngân Sách Gia Đình',
};

export default function TransactionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
