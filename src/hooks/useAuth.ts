
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert } from '@/types';
import { toast } from './use-toast'; 
import { FAMILY_MEMBERS, APP_NAME } from '@/lib/constants';

export const FAMILY_ACCOUNT_ID: UserType = "GIA_DINH";
const HIGH_EXPENSE_THRESHOLD = 1000000;
const SHARED_PASSWORD = "123456";

interface AuthState {
  currentUser: FamilyMember | null;
  familyId: UserType | null;
  transactions: Transaction[];
  highValueExpenseAlerts: HighValueExpenseAlert[];
  login: (user: FamilyMember, pass: string) => boolean;
  logout: () => void;
  addTransaction: (transactionData: Omit<Transaction, 'id' | 'userId' | 'monthYear' | 'performedBy' | 'note'> & { date: string, performedBy: FamilyMember, note?: string }) => Promise<void>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string, monthYear: string) => Promise<void>;
  bulkDeleteTransactions: (transactionsToDelete: Array<{ id: string, monthYear: string }>) => Promise<void>; // Added
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
        if (pass === SHARED_PASSWORD && FAMILY_MEMBERS.includes(user as FamilyMember)) {
          set({
            currentUser: user,
            familyId: FAMILY_ACCOUNT_ID,
          });
          return true;
        }
        toast({
          title: "Đăng nhập thất bại",
          description: "Tài khoản hoặc mật khẩu không đúng. Vui lòng thử lại.",
          variant: "destructive",
        });
        return false;
      },
      logout: () => set({
        currentUser: null,
        familyId: null,
      }),

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        const loggedInUser = get().currentUser;


        if (!currentFamilyId || !loggedInUser) {
          toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
          return;
        }
        
        const monthYear = transactionData.date.substring(0, 7);

        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          userId: currentFamilyId, 
          performedBy: loggedInUser, 
          description: transactionData.description,
          amount: transactionData.amount,
          date: transactionData.date, 
          type: transactionData.type,
          categoryId: transactionData.categoryId,
          monthYear: monthYear,
          note: transactionData.note || undefined,
        };
        
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
          set((state) => ({
            transactions: state.transactions.map(t => t.id === newTransaction.id ? savedTransaction : t)
                                       .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          }));
          toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });

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
            // Toast for the spouse will be handled by GlobalAlertToaster
            // Toast for the current user who made the large expense:
            if (get().currentUser === newTransaction.performedBy) {
                 toast({
                    title: "Lưu ý chi tiêu",
                    description: `Bạn vừa ghi nhận một khoản chi lớn: ${newTransaction.amount.toLocaleString('vi-VN')} VND cho "${newTransaction.description}".`,
                    variant: "default",
                    duration: 7000,
                });
            }
          }

        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          set({ transactions: originalTransactions });
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
            toast({ title: "Thành công!", description: "Đã cập nhật giao dịch." });
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

      bulkDeleteTransactions: async (transactionsToDelete) => {
        if (transactionsToDelete.length === 0) return;
        const originalTransactions = get().transactions;
        const idsToDelete = new Set(transactionsToDelete.map(t => t.id));

        // Optimistic update
        set(state => ({
            transactions: state.transactions.filter(t => !idsToDelete.has(t.id))
        }));

        try {
            const response = await fetch(`/api/transactions/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: transactionsToDelete }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Không thể xóa hàng loạt giao dịch. ${errorData.details || ''}`);
            }
            const result = await response.json();
            toast({ title: "Thành công!", description: result.message || `Đã xóa ${result.deletedCount || transactionsToDelete.length} giao dịch.` });
        } catch (error: any) {
            console.error("Failed to bulk delete transactions:", error);
            toast({ title: "Lỗi Xóa Hàng Loạt", description: error.message, variant: "destructive" });
            set({ transactions: originalTransactions }); // Revert optimistic update on error
        }
      },


      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID) {
            familyIdToFetch = FAMILY_ACCOUNT_ID;
        }
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Error response from API when fetching transactions:", errorData);
            throw new Error(errorData.message || 'Không thể tải giao dịch từ server.');
          }
          const fetchedTransactions: Transaction[] = await response.json();
          
          set((state) => {
            const existingTransactionIdsForMonth = new Set(
              state.transactions.filter(t => t.userId === familyIdToFetch && t.monthYear === monthYear).map(t => t.id)
            );
            const newTransactionsFromServer = fetchedTransactions.filter(ft => !existingTransactionIdsForMonth.has(ft.id));
            
            const allOtherTransactions = state.transactions.filter(t => !(t.userId === familyIdToFetch && t.monthYear === monthYear));
            
            const updatedTransactionsForMonth = state.transactions
              .filter(t => t.userId === familyIdToFetch && t.monthYear === monthYear)
              .map(existingT => {
                const serverT = fetchedTransactions.find(ft => ft.id === existingT.id);
                return serverT || existingT; // Prefer server version if exists
              })
              .concat(newTransactionsFromServer); // Add new ones not in local state for this month

            const finalTransactions = [...allOtherTransactions, ...updatedTransactionsForMonth]
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            return { transactions: finalTransactions };
          });
        } catch (error: any) {
          // toast({ title: "Lỗi tải giao dịch", description: error.message, variant: "destructive" });
          console.error(`[useAuthStore fetchTransactionsByMonth] Error for ${monthYear}:`, error.message);
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        const allTransactions = get().transactions;
        const filtered = allTransactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
        // console.log(`[useAuthStore] getTransactionsForFamilyByMonth for ${monthYear} (familyId: ${familyIdToFilter}): Found ${filtered.length} of ${allTransactions.length} total.`, {filteredTransactionIds: filtered.map(f=>f.id)});
        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
      name: 'auth-storage-v2', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        familyId: state.familyId,
        highValueExpenseAlerts: state.highValueExpenseAlerts,
      }),
       onRehydrateStorage: (state) => {
        // console.log("[useAuthStore] Hydration finished.");
      },
    }
  )
);

