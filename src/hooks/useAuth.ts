
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert } from '@/types';
import { toast } from './use-toast'; // Use the standalone toast function
import React from 'react'; 

export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH"; 
export const FAMILY_MEMBERS: FamilyMember[] = ['Vợ', 'Chồng'];
const HIGH_EXPENSE_THRESHOLD = 1000000;

interface AuthState {
  currentUser: FamilyMember | null;
  familyId: UserType | null; 
  transactions: Transaction[];
  highValueExpenseAlerts: HighValueExpenseAlert[];
  login: (user: FamilyMember) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear' | 'performedBy'>) => Promise<void>;
  fetchTransactionsByMonth: (familyId: UserType, monthYear: string) => Promise<void>;
  getTransactionsForFamilyByMonth: (familyId: UserType, monthYear: string) => Transaction[];
  markAlertAsViewedBySpouse: (alertId: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      familyId: null,
      transactions: [],
      highValueExpenseAlerts: [],
      login: (user) => {
        set({ 
          currentUser: user, 
          familyId: FAMILY_ACCOUNT_ID, 
          transactions: [], // Reset transactions on login to fetch fresh for the family
          // Do not reset highValueExpenseAlerts here, they are persistent for the family
        });
      },
      logout: () => set({ 
        currentUser: null, 
        familyId: null, 
        transactions: [],
        // highValueExpenseAlerts are kept on logout as they pertain to family data
      }),

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
          userId: currentFamilyId, 
          performedBy: loggedInUser,
          monthYear: monthYear,
        };

        // Optimistic update for transactions
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

          // Handle high-value expense alert
          if (newTransaction.type === 'expense' && newTransaction.amount > HIGH_EXPENSE_THRESHOLD) {
            const alert: HighValueExpenseAlert = {
              id: newTransaction.id,
              performedBy: newTransaction.performedBy,
              amount: newTransaction.amount,
              description: newTransaction.description,
              date: new Date().toISOString(),
              spouseHasViewed: false,
            };
            set((state) => ({
              highValueExpenseAlerts: [...state.highValueExpenseAlerts, alert],
            }));
            toast({
              title: "Lưu ý chi tiêu",
              description: `Bạn vừa ghi nhận một khoản chi lớn: ${newTransaction.amount.toLocaleString('vi-VN')} VND cho "${newTransaction.description}".`,
              variant: "default",
              duration: 7000,
            });
          }

        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          // Revert optimistic update on error for transactions
          set((state) => ({ transactions: state.transactions.filter(t => t.id !== newTransaction.id) }));
        }
      },
      
      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID) {
            console.warn("fetchTransactionsByMonth called with incorrect familyId. Defaulting to FAMILY_ACCOUNT_ID");
            familyIdToFetch = FAMILY_ACCOUNT_ID;
        }
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            // console.error("API Error fetching transactions:", errorData);
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
          // console.error("Failed to fetch transactions via API:", error.message, error.stack);
          toast({ title: "Lỗi tải giao dịch", description: error.message, variant: "destructive" });
           set((state) => ({
            transactions: state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear))
          }));
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            console.warn("getTransactionsForFamilyByMonth called with incorrect familyId. Defaulting to FAMILY_ACCOUNT_ID");
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        return get().transactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
      },

      markAlertAsViewedBySpouse: (alertId: string) => {
        set((state) => ({
          highValueExpenseAlerts: state.highValueExpenseAlerts.map(alert =>
            alert.id === alertId ? { ...alert, spouseHasViewed: true } : alert
          ),
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        currentUser: state.currentUser, 
        familyId: state.familyId,
        highValueExpenseAlerts: state.highValueExpenseAlerts, // Persist alerts
      }), 
    }
  )
);

export function useInitializeTransactions(monthYear: string) {
  const { familyId, fetchTransactionsByMonth, transactions } = useAuthStore();

  React.useEffect(() => {
    if (familyId && monthYear) { 
      const existingForMonth = transactions.some(t => t.userId === familyId && t.monthYear === monthYear);
      if (!existingForMonth) { 
         fetchTransactionsByMonth(familyId, monthYear);
      }
    }
  }, [familyId, monthYear, fetchTransactionsByMonth, transactions]);
}
