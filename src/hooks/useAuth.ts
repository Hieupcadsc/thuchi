
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert, PaymentSource } from '@/types';
import { toast as DONT_USE_THIS_useToast_IMPORT_toast_INSTEAD } from './use-toast'; // Renamed to avoid confusion
import { FAMILY_MEMBERS, APP_NAME, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID, FAMILY_ACCOUNT_ID } from '@/lib/constants';
import { format } from 'date-fns';

// Use the standalone toast function
const { toast } = DONT_USE_THIS_useToast_IMPORT_toast_INSTEAD;


const HIGH_EXPENSE_THRESHOLD = 1000000;
const SHARED_PASSWORD = "123456";

interface AuthState {
  currentUser: FamilyMember | null;
  familyId: UserType | null; // Will always be FAMILY_ACCOUNT_ID when logged in
  transactions: Transaction[];
  highValueExpenseAlerts: HighValueExpenseAlert[];
  login: (user: FamilyMember, pass: string) => boolean;
  logout: () => void;
  addTransaction: (transactionData: Omit<Transaction, 'id' | 'userId' | 'monthYear' > & { date: string, performedBy: FamilyMember }) => Promise<Transaction | null>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string, monthYear: string) => Promise<void>;
  bulkDeleteTransactions: (transactionsToDelete: Array<{ id: string, monthYear: string }>) => Promise<void>;
  fetchTransactionsByMonth: (familyId: UserType, monthYear: string) => Promise<void>;
  getTransactionsForFamilyByMonth: (familyId: UserType, monthYear: string) => Transaction[];
  markAlertAsViewedBySpouse: (alertId: string) => void;
  processCashWithdrawal: (amount: number, note?: string) => Promise<boolean>;
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
            familyId: FAMILY_ACCOUNT_ID, // Always set familyId to the shared ID
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
      logout: () => {
        set({
          currentUser: null,
          familyId: null,
          // Consider if transactions and alerts should be cleared on logout
          // transactions: [],
          // highValueExpenseAlerts: [],
        });
        // Optionally clear all local storage if desired, but be careful
        // localStorage.removeItem('auth-storage-v2');
      },

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        const loggedInUser = get().currentUser;

        if (!currentFamilyId || !loggedInUser) {
          toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
          return null;
        }
        
        // Ensure performedBy is the logged-in user FOR NEW transactions
        // For updates, this logic is handled in updateTransaction
        // This check is crucial for new transactions submitted through this function.
        if (transactionData.performedBy !== loggedInUser) {
            console.warn(`[useAuthStore addTransaction] performedBy mismatch for new transaction. Expected: ${loggedInUser}, Got: ${transactionData.performedBy}. Overriding.`);
            transactionData.performedBy = loggedInUser;
        }


        const monthYear = transactionData.date.substring(0, 7);

        const newTransaction: Transaction = {
          id: crypto.randomUUID(),
          userId: currentFamilyId, // Use the shared family ID
          description: transactionData.description,
          amount: transactionData.amount,
          date: transactionData.date,
          type: transactionData.type,
          categoryId: transactionData.categoryId,
          monthYear: monthYear,
          note: transactionData.note || undefined,
          performedBy: transactionData.performedBy, // This is now correctly set to loggedInUser
          paymentSource: transactionData.paymentSource,
        };

        const originalTransactions = get().transactions;
        // Optimistic update
        set((state) => ({ transactions: [...state.transactions, newTransaction].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }));

        try {
          const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTransaction),
          });

          if (!response.ok) {
            let errorData: any = {};
            let responseBodyText = '';
            try {
                responseBodyText = await response.text();
                errorData = JSON.parse(responseBodyText);
            } catch (e) {
                console.warn("[useAuthStore addTransaction] API error response was not valid JSON. Raw text:", responseBodyText);
            }
            console.error("[useAuthStore addTransaction] Error response from API:", errorData, `Raw Body: "${responseBodyText}"`);
            throw new Error(errorData.message || responseBodyText || 'Không thể thêm giao dịch lên server.');
          }

          const savedTransaction = await response.json();
          // Replace optimistic transaction with server-confirmed one (though IDs should match)
          set((state) => ({
            transactions: state.transactions.map(t => t.id === newTransaction.id ? savedTransaction : t)
                                       .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          }));
          toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });

          if (newTransaction.type === 'expense' &&
              newTransaction.amount > HIGH_EXPENSE_THRESHOLD &&
              newTransaction.categoryId !== RUT_TIEN_MAT_CATEGORY_ID
             ) {
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
            // Only toast the creator if they are the one who performed the high-value expense
            if (get().currentUser === newTransaction.performedBy) {
                 toast({
                    title: "Lưu ý chi tiêu",
                    description: `Bạn vừa ghi nhận một khoản chi lớn: ${newTransaction.amount.toLocaleString('vi-VN')} VND cho "${newTransaction.description}".`,
                    variant: "default",
                    duration: 7000,
                });
            }
          }
          return savedTransaction;
        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          set({ transactions: originalTransactions }); // Rollback optimistic update
          return null;
        }
      },

      updateTransaction: async (updatedTransaction) => {
        const originalTransactions = get().transactions;
        const loggedInUser = get().currentUser;

        if (!loggedInUser) {
          toast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
          return;
        }
        
        // Ensure monthYear is correctly derived from the updated date
        updatedTransaction.monthYear = updatedTransaction.date.substring(0,7);


        // Optimistic update
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
            set({ transactions: originalTransactions }); // Rollback
        }
      },

      deleteTransaction: async (transactionId, monthYear) => {
        const originalTransactions = get().transactions;
        // Optimistic update
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
            set({ transactions: originalTransactions }); // Rollback
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
            set({ transactions: originalTransactions }); // Rollback
        }
      },

      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID) {
            familyIdToFetch = FAMILY_ACCOUNT_ID;
        }
        // Determine the base URL. If NEXT_PUBLIC_APP_URL is set (e.g., in Vercel deployment), use it.
        // Otherwise, assume local development.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 9003}`;
        const apiUrl = `${baseUrl}/api/transactions?userId=${encodeURIComponent(familyIdToFetch)}&monthYear=${encodeURIComponent(monthYear)}`;
        
        console.log(`[useAuthStore fetchTransactionsByMonth] Attempting to fetch from: ${apiUrl}`); 

        try {
          const response = await fetch(apiUrl, { cache: 'no-store' });
          if (!response.ok) {
            let errorData: any = {};
            let responseBodyText = '';
            try {
              responseBodyText = await response.text(); 
              try {
                errorData = JSON.parse(responseBodyText); 
              } catch (e) {
                console.warn("[useAuthStore fetchTransactionsByMonth] API error response was not valid JSON. Raw text:", responseBodyText);
              }
            } catch (textErr) {
              console.error("[useAuthStore fetchTransactionsByMonth] Failed to read API error response text:", textErr);
            }
      
            console.error(
              `[useAuthStore fetchTransactionsByMonth] Error response from API (status: ${response.status}, statusText: ${response.statusText}) when fetching transactions. Parsed JSON:`,
              errorData,
              responseBodyText ? `Raw Body: "${responseBodyText}"` : "Raw body could not be read."
            );
            
            let finalErrorMessage = 'Không thể tải giao dịch từ server.';
            if (errorData?.message) {
              finalErrorMessage = errorData.message;
            } else if (responseBodyText && responseBodyText.trim() !== '' && !responseBodyText.trim().startsWith('<') && responseBodyText.trim() !== '{}' ) { // Avoid HTML error pages
              finalErrorMessage = `Lỗi server: ${responseBodyText.substring(0, 150)}${responseBodyText.length > 150 ? '...' : ''}`;
            } else if (response.statusText) {
              finalErrorMessage = `Lỗi server: ${response.status} ${response.statusText}`;
            }
            
            throw new Error(finalErrorMessage);
          }
          const fetchedTransactions: Transaction[] = await response.json();
          console.log(`[useAuthStore fetchTransactionsByMonth] Successfully fetched ${fetchedTransactions.length} transactions for ${monthYear} from ${apiUrl}`);

          set((state) => {
            // Create a map of existing transactions for quick lookups
            const existingTransactionsMap = new Map(state.transactions.map(t => [t.id, t]));
            
            // Update existing or add new transactions from fetched data
            fetchedTransactions.forEach(ft => {
                existingTransactionsMap.set(ft.id, ft);
            });

            // Filter out transactions for the current monthYear that are no longer on the server
            const currentMonthTransactionsFromServerIds = new Set(fetchedTransactions.map(ft => ft.id));
            const transactionsToKeepForCurrentMonth = state.transactions.filter(t => 
                !(t.monthYear === monthYear && t.userId === familyIdToFetch && !currentMonthTransactionsFromServerIds.has(t.id))
            );

            // Rebuild the transactions array efficiently
            // Start with transactions not in the current month/familyId context
            const otherTransactions = transactionsToKeepForCurrentMonth.filter(t => 
                !(t.monthYear === monthYear && t.userId === familyIdToFetch)
            );
            
            const updatedTransactions = [...otherTransactions, ...fetchedTransactions]
                                      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            // console.log(`[useAuthStore fetchTransactionsByMonth] State updated. Total transactions now: ${updatedTransactions.length}`);
            return { transactions: updatedTransactions };
          });
        } catch (error: any) {
          console.error(`[useAuthStore fetchTransactionsByMonth] CATCH_ALL Error for ${monthYear}:`, error.message, error.stack);
          throw error; // Re-throw to be caught by the calling component
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID) {
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        const allTransactions = get().transactions;
        const filtered = allTransactions.filter(t => t.userId === familyIdToFilter && t.monthYear === monthYear);
        // console.log(`[useAuthStore] getTransactionsForFamilyByMonth for ${monthYear} (familyId: ${familyIdToFilter}): Found ${filtered.length} of ${allTransactions.length} total transactions in state.`);
        return filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      markAlertAsViewedBySpouse: (alertId: string) => {
        set((state) => ({
          highValueExpenseAlerts: state.highValueExpenseAlerts.map(alert =>
            alert.id === alertId ? { ...alert, spouseHasViewed: true } : alert
          ),
        }));
      },

      processCashWithdrawal: async (amount: number, note?: string) => {
        const loggedInUser = get().currentUser;
        if (!loggedInUser) {
          toast({ title: "Lỗi", description: "Vui lòng đăng nhập để thực hiện.", variant: "destructive" });
          return false;
        }
        if (amount <= 0) {
          toast({ title: "Số tiền không hợp lệ", description: "Số tiền rút phải lớn hơn 0.", variant: "destructive" });
          return false;
        }

        const currentDate = format(new Date(), "yyyy-MM-dd");
        const withdrawalDescription = note ? `Rút tiền mặt - ${note}` : "Rút tiền mặt";
        const depositDescription = note ? `Nạp tiền mặt từ NH - ${note}` : "Nạp tiền mặt từ NH";

        const expenseTransactionData = {
          description: withdrawalDescription,
          amount: amount,
          date: currentDate,
          type: 'expense' as 'expense',
          categoryId: RUT_TIEN_MAT_CATEGORY_ID,
          performedBy: loggedInUser, 
          paymentSource: 'bank' as PaymentSource,
          note: note || undefined,
        };

        const incomeTransactionData = {
          description: depositDescription,
          amount: amount,
          date: currentDate,
          type: 'income' as 'income',
          categoryId: NAP_TIEN_MAT_CATEGORY_ID,
          performedBy: loggedInUser, 
          paymentSource: 'cash' as PaymentSource,
          note: note || undefined,
        };
        
        const expenseResult = await get().addTransaction(expenseTransactionData);
        if (!expenseResult) {
          toast({ title: "Lỗi Rút Tiền", description: "Không thể tạo giao dịch chi từ ngân hàng.", variant: "destructive" });
          return false;
        }
        const incomeResult = await get().addTransaction(incomeTransactionData);
        if (!incomeResult) {
          toast({ title: "Lỗi Rút Tiền", description: "Đã tạo giao dịch chi, nhưng không thể tạo giao dịch thu tiền mặt. Vui lòng kiểm tra lại.", variant: "destructive" });
          return false;
        }
        
        toast({ title: "Thành Công", description: `Đã rút ${amount.toLocaleString('vi-VN')} VND tiền mặt.` });
        return true;
      },
    }),
    {
      name: 'auth-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        familyId: state.familyId,
        highValueExpenseAlerts: state.highValueExpenseAlerts,
        // Do not persist transactions here, as they are fetched from the API
        // Keep transactions in memory, fetch on mount/month change
      }),
    }
  )
);
// Ensure FAMILY_ACCOUNT_ID is exported if needed elsewhere from this module, though it's better from constants.ts
// export { FAMILY_ACCOUNT_ID }; 
