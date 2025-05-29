
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType } from '@/types';
import { toast } from './use-toast';
import React from 'react'; // Import React for useEffect in useInitializeTransactions

export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH"; // Unique identifier for the family account

interface AuthState {
  familyId: UserType | null; // Stores the family account identifier, or null if not logged in
  transactions: Transaction[];
  login: () => void; // No longer takes userType
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear'>) => Promise<void>;
  fetchTransactionsByMonth: (familyId: UserType, monthYear: string) => Promise<void>;
  getTransactionsForFamilyByMonth: (familyId: UserType, monthYear: string) => Transaction[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      familyId: null,
      transactions: [],
      login: () => set({ familyId: FAMILY_ACCOUNT_ID, transactions: [] }), // Set to the family account ID
      logout: () => set({ familyId: null, transactions: [] }),

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        if (!currentFamilyId) {
          toast({ title: "Lỗi", description: "Bạn cần đăng nhập để thêm giao dịch.", variant: "destructive" });
          return;
        }

        const monthYear = transactionData.date.substring(0, 7);

        const newTransaction: Transaction = {
          ...transactionData,
          id: crypto.randomUUID(),
          userId: currentFamilyId, // Use the family account ID
          monthYear: monthYear,
        };

        set((state) => ({ transactions: [...state.transactions, newTransaction] }));

        try {
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTransaction),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể thêm giao dịch lên server.');
          }
          
          toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });
        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          set((state) => ({ transactions: state.transactions.filter(t => t.id !== newTransaction.id) }));
        }
      },
      
      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải giao dịch từ server.');
          }
          const fetchedTransactions: Transaction[] = await response.json();
          
          set((state) => ({
            transactions: [
              ...state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear)),
              ...fetchedTransactions
            ]
          }));
        } catch (error: any) {
          console.error("Failed to fetch transactions via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
           set((state) => ({
            transactions: state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear))
          }));
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        return get().transactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ familyId: state.familyId }), // Only persist familyId
    }
  )
);

export function useInitializeTransactions(monthYear: string) {
  const { familyId, fetchTransactionsByMonth, transactions } = useAuthStore();

  React.useEffect(() => {
    if (familyId && monthYear) {
      const existing = transactions.some(t => t.userId === familyId && t.monthYear === monthYear);
      if (!existing) {
         fetchTransactionsByMonth(familyId, monthYear);
      }
    }
  }, [familyId, monthYear, fetchTransactionsByMonth, transactions]);
}
