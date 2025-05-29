
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember } from '@/types';
import { toast } from './use-toast'; // Use the standalone toast function
import React from 'react'; 

export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH"; // Unique identifier for the family account
export const FAMILY_MEMBERS: FamilyMember[] = ['Vợ', 'Chồng'];

interface AuthState {
  currentUser: FamilyMember | null; // Who is currently logged in
  familyId: UserType | null; // This will always be FAMILY_ACCOUNT_ID when logged in
  transactions: Transaction[];
  login: (user: FamilyMember) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear' | 'performedBy'>) => Promise<void>;
  fetchTransactionsByMonth: (familyId: UserType, monthYear: string) => Promise<void>;
  getTransactionsForFamilyByMonth: (familyId: UserType, monthYear: string) => Transaction[];
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      familyId: null,
      transactions: [],
      login: (user) => set({ currentUser: user, familyId: FAMILY_ACCOUNT_ID, transactions: [] }),
      logout: () => set({ currentUser: null, familyId: null, transactions: [] }),

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        const loggedInUser = get().currentUser;

        if (!currentFamilyId || !loggedInUser) {
          toast({ title: "Lỗi", description: "Bạn cần đăng nhập để thêm giao dịch.", variant: "destructive" });
          return;
        }

        const monthYear = transactionData.date.substring(0, 7);

        const newTransaction: Transaction = {
          ...transactionData,
          id: crypto.randomUUID(),
          userId: currentFamilyId, // Use the family account ID for data pooling
          performedBy: loggedInUser, // Attribute to the logged-in user
          monthYear: monthYear,
        };

        // Optimistic update
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
          // Revert optimistic update on error
          set((state) => ({ transactions: state.transactions.filter(t => t.id !== newTransaction.id) }));
        }
      },
      
      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        // This function always fetches for the FAMILY_ACCOUNT_ID
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID) {
            console.warn("fetchTransactionsByMonth called with incorrect familyId. Defaulting to FAMILY_ACCOUNT_ID");
            familyIdToFetch = FAMILY_ACCOUNT_ID;
        }
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải giao dịch từ server.');
          }
          const fetchedTransactions: Transaction[] = await response.json();
          
          set((state) => ({
            transactions: [
              ...state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear)), // Remove old ones for this month & family
              ...fetchedTransactions // Add new ones
            ]
          }));
        } catch (error: any) {
          console.error("Failed to fetch transactions via API:", error.message, error.stack);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
           // Clear potentially outdated/failed data for this specific month and family
           set((state) => ({
            transactions: state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear))
          }));
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
         // This function always filters for the FAMILY_ACCOUNT_ID
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            console.warn("getTransactionsForFamilyByMonth called with incorrect familyId. Defaulting to FAMILY_ACCOUNT_ID");
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        return get().transactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ currentUser: state.currentUser, familyId: state.familyId }), // Persist who is logged in and the familyId
    }
  )
);

// This hook can be used in components to initialize transaction data for the current family and a specific month.
export function useInitializeTransactions(monthYear: string) {
  const { familyId, fetchTransactionsByMonth, transactions } = useAuthStore();

  React.useEffect(() => {
    if (familyId && monthYear) { // familyId here will be FAMILY_ACCOUNT_ID
      const existingForMonth = transactions.some(t => t.userId === familyId && t.monthYear === monthYear);
      // Fetch if no transactions for this family and month exist in the store, or if you want to refresh
      if (!existingForMonth) { 
         fetchTransactionsByMonth(familyId, monthYear);
      }
    }
  }, [familyId, monthYear, fetchTransactionsByMonth, transactions]);
}
