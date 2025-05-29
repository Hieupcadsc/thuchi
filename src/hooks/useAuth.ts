
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert } from '@/types';
import { toast } from './use-toast'; // Ensure toast is imported for login errors

export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH"; 
export const FAMILY_MEMBERS: FamilyMember[] = ['Minh Đan', 'Minh Hiếu'];
const HIGH_EXPENSE_THRESHOLD = 1000000;
const SHARED_PASSWORD = "123456"; // Hardcoded password - NOT FOR PRODUCTION

interface AuthState {
  currentUser: FamilyMember | null;
  familyId: UserType | null; 
  transactions: Transaction[];
  highValueExpenseAlerts: HighValueExpenseAlert[];
  login: (user: FamilyMember, pass: string) => boolean; // Returns true if login successful
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear' | 'performedBy'>) => Promise<void>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string, monthYear: string) => Promise<void>;
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
      login: (user, pass) => {
        if (pass === SHARED_PASSWORD) {
          set({ 
            currentUser: user, 
            familyId: FAMILY_ACCOUNT_ID, 
            // Reset transactions on login to ensure fresh data for the family account view
            // Or, you might want to persist transactions across user sessions if they all see the same data
            transactions: [], 
          });
          return true;
        }
        toast({
          title: "Đăng nhập thất bại",
          description: "Mật khẩu không đúng. Vui lòng thử lại.",
          variant: "destructive",
        });
        return false;
      },
      logout: () => set({ 
        currentUser: null, 
        familyId: null, 
        transactions: [],
        // Optionally clear highValueExpenseAlerts on logout or handle them differently
        // highValueExpenseAlerts: [], 
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
          performedBy: loggedInUser, // Set by current logged-in user
          monthYear: monthYear,
        };
        
        // Optimistic update
        const originalTransactions = get().transactions;
        set((state) => ({ transactions: [...state.transactions, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));

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
          
          const savedTransaction = await response.json();
          // Update local state with the actual saved transaction
          set((state) => ({ 
            transactions: state.transactions.map(t => t.id === newTransaction.id ? savedTransaction : t)
                                       .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          }));

          // toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." }); // Already handled in TransactionForm

          if (newTransaction.type === 'expense' && newTransaction.amount > HIGH_EXPENSE_THRESHOLD) {
            const alert: HighValueExpenseAlert = {
              id: newTransaction.id, // Use transaction ID as alert ID
              performedBy: newTransaction.performedBy,
              amount: newTransaction.amount,
              description: newTransaction.description,
              date: new Date().toISOString(), // Timestamp of the alert
              spouseHasViewed: false,
            };
            set((state) => ({
              highValueExpenseAlerts: [...state.highValueExpenseAlerts, alert],
            }));
            // This toast is for the person who made the transaction
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
          set({ transactions: originalTransactions }); // Revert on error
        }
      },

      updateTransaction: async (updatedTransaction) => {
        const originalTransactions = get().transactions;
        set(state => ({
            transactions: state.transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
                                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));
        try {
            const response = await fetch(`/api/transactions/${updatedTransaction.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedTransaction),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể cập nhật giao dịch.');
            }
            // toast({ title: "Thành công!", description: "Đã cập nhật giao dịch." }); // Handled in form
        } catch (error: any) {
            console.error("Failed to update transaction:", error);
            toast({ title: "Lỗi cập nhật", description: error.message, variant: "destructive" });
            set({ transactions: originalTransactions }); 
        }
      },

      deleteTransaction: async (transactionId, monthYear) => {
        const originalTransactions = get().transactions;
        set(state => ({
            transactions: state.transactions.filter(t => t.id !== transactionId)
        }));
        try {
            const response = await fetch(`/api/transactions/${transactionId}?monthYear=${encodeURIComponent(monthYear)}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không thể xóa giao dịch.');
            }
            toast({ title: "Thành công!", description: "Đã xóa giao dịch." });
        } catch (error: any) {
            console.error("Failed to delete transaction:", error);
            toast({ title: "Lỗi xóa", description: error.message, variant: "destructive" });
            set({ transactions: originalTransactions }); 
        }
      },
      
      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID) {
            familyIdToFetch = FAMILY_ACCOUNT_ID; // Ensure we always fetch for the family
        }
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải giao dịch từ server.');
          }
          const fetchedTransactions: Transaction[] = await response.json();
          
          set((state) => {
            const existingTransactionMap = new Map(state.transactions.map(t => [t.id, t]));
            fetchedTransactions.forEach(ft => existingTransactionMap.set(ft.id, ft));
            const updatedTransactions = Array.from(existingTransactionMap.values())
                                            .filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear && !fetchedTransactions.find(ft => ft.id === t.id)))
                                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return { transactions: updatedTransactions };
          });
        } catch (error: any) {
          // toast({ title: "Lỗi tải giao dịch", description: error.message, variant: "destructive" });
          console.error("Error fetching transactions in useAuthStore:", error); // Log for debugging
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        return get().transactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear)
                                 .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
