import type { LucideIcon } from 'lucide-react';

export type UserType = 'Vợ' | 'Chồng';

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  userId: UserType;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  categoryId: string;
  monthYear: string; // YYYY-MM, for sheet organization
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
