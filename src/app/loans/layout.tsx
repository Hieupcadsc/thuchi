import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quản lý cho vay - Ngân Sách Gia Đình',
  description: 'Quản lý các khoản cho vay và thu nợ trong gia đình',
};

export default function LoansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 