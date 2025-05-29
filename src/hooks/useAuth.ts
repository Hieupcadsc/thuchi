
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert } from '@/types';
import { toast } from './use-toast'; // Ensure this is the standalone toast function
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
            // transactions: [], // Keep existing transactions on login if any
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
        // transactions: [], // Optionally clear transactions on logout
        // highValueExpenseAlerts: [], // Optionally clear alerts on logout
      }),

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        // performedBy is now passed in transactionData
        // const loggedInUser = get().currentUser;


        if (!currentFamilyId || !transactionData.performedBy) {
          toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng hoặc người thực hiện. Vui lòng đăng nhập lại.", variant: "destructive" });
          return;
        }
        console.log("[useAuthStore addTransaction] Received data for add:", transactionData);

        const monthYear = transactionData.date.substring(0, 7);

        const newTransaction: Transaction = {
          ...transactionData, // description, amount, date (already formatted YYYY-MM-DD), type, categoryId, note?
          id: crypto.randomUUID(),
          userId: currentFamilyId,
          performedBy: transactionData.performedBy,
          monthYear: monthYear,
          note: transactionData.note || undefined,
        };
        console.log("[useAuthStore addTransaction] Constructed newTransaction:", newTransaction);


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
            toast({
              title: "Lưu ý chi tiêu",
              description: `${newTransaction.performedBy} vừa ghi nhận một khoản chi lớn: ${newTransaction.amount.toLocaleString('vi-VN')} VND cho "${newTransaction.description}".`,
              variant: "default",
              duration: 7000,
            });
          }

        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          set({ transactions: originalTransactions });
        }
      },

      updateTransaction: async (updatedTransaction) => {
        const originalTransactions = get().transactions;
        console.log("[useAuthStore updateTransaction] Updating with:", updatedTransaction);
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
          console.log(`[useAuthStore] Fetched ${fetchedTransactions.length} transactions from API for ${monthYear}`);

          set((state) => {
            const existingTransactionMap = new Map(state.transactions.map(t => [t.id, t]));
            fetchedTransactions.forEach(ft => existingTransactionMap.set(ft.id, ft));

            const updatedTransactions = Array.from(existingTransactionMap.values())
                                            .filter(t => {
                                                if (t.userId === familyIdToFetch && t.monthYear === monthYear) {
                                                    return fetchedTransactions.some(ft => ft.id === t.id);
                                                }
                                                return true;
                                            })
                                            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return { transactions: updatedTransactions };
          });
        } catch (error: any) {
          toast({ title: "Lỗi tải giao dịch", description: error.message, variant: "destructive" });
          console.error("Error fetching transactions in useAuthStore:", error);
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        const allTransactions = get().transactions;
        const filtered = allTransactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
        console.log(`[useAuthStore] getTransactionsForFamilyByMonth for ${monthYear} (familyId: ${familyIdToFilter}): Found ${filtered.length} of ${allTransactions.length} total. Filters: categoryId, performedBy might apply later.`, {filteredTransactions: filtered.map(f=> ({id: f.id, date:f.date, monthYear: f.monthYear, desc: f.description}))});
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
      name: 'auth-storage-v2', // Changed name to potentially reset storage if needed, or keep old one
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        familyId: state.familyId,
        highValueExpenseAlerts: state.highValueExpenseAlerts,
        // Do not persist transactions here if they are always fetched,
        // or be careful about merging logic if they are.
        // For now, not persisting transactions to simplify and rely on fetch.
      }),
       onRehydrateStorage: (state) => {
        console.log("[useAuthStore] Hydration finished.");
        // return (state, error) => {
        //   if (error) {
        //     console.error("[useAuthStore] An error happened during hydration", error);
        //   } else {
        //     console.log("[useAuthStore] Hydration finished.");
        //   }
        // };
      },
    }
  )
);
