
import type { LucideIcon } from 'lucide-react';

// UserType will now represent a generic identifier, primarily for the family account.
export type UserType = string; 

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  userId: UserType; // Will store the family account identifier
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense';
  categoryId: string;
  monthYear: string; // YYYY-MM, for sheet organization
  note?: string; // Optional note, primarily for expenses
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
