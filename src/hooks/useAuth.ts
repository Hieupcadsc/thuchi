
"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType } from '@/types';
import { useToast } from './use-toast'; // Assuming useToast is available for notifications

interface AuthState {
  user: UserType | null;
  transactions: Transaction[]; // Keep local cache for optimistic updates / immediate display
  login: (userType: UserType) => void;
  logout: () => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear'>) => Promise<void>;
  fetchTransactionsByMonth: (userId: UserType, monthYear: string) => Promise<void>; // Renamed for clarity
  getTransactionsByUserAndMonth: (userId: UserType, monthYear: string) => Transaction[]; // This will now read from local cache
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      transactions: [], // Initialize as empty, will be populated by API calls
      login: (userType) => set({ user: userType, transactions: [] }), // Clear transactions on login
      logout: () => set({ user: null, transactions: [] }), // Clear transactions on logout

      addTransaction: async (transactionData) => {
        const { toast } = useToast();
        const user = get().user;
        if (!user) {
          toast({ title: "Lỗi", description: "Bạn cần đăng nhập để thêm giao dịch.", variant: "destructive" });
          return;
        }

        const monthYear = transactionData.date.substring(0, 7); // YYYY-MM from YYYY-MM-DD

        const newTransaction: Transaction = {
          ...transactionData,
          id: crypto.randomUUID(), // Temporary ID, real ID might come from backend/sheet
          userId: user,
          monthYear: monthYear,
        };

        // Optimistic update to local cache
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
          
          // Optional: Update local cache with response from server if it differs (e.g., server-generated ID)
          // const savedTransaction = await response.json();
          // set((state) => ({ 
          //   transactions: state.transactions.map(t => t.id === newTransaction.id ? savedTransaction : t) 
          // }));

          toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });
        } catch (error: any) {
          console.error("Failed to add transaction via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          // Revert optimistic update if API call fails
          set((state) => ({ transactions: state.transactions.filter(t => t.id !== newTransaction.id) }));
        }
      },
      
      fetchTransactionsByMonth: async (userId, monthYear) => {
        const { toast } = useToast();
        try {
          const response = await fetch(`/api/transactions?userId=${encodeURIComponent(userId)}&monthYear=${encodeURIComponent(monthYear)}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Không thể tải giao dịch từ server.');
          }
          const fetchedTransactions: Transaction[] = await response.json();
          
          // Replace transactions for the given monthYear for that user, or merge carefully
          // For simplicity, let's assume fetchedTransactions are the complete set for that month/user
          set((state) => ({
            transactions: [
              ...state.transactions.filter(t => !(t.userId === userId && t.monthYear === monthYear)),
              ...fetchedTransactions
            ]
          }));
        } catch (error: any) {
          console.error("Failed to fetch transactions via API:", error);
          toast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
           set((state) => ({ // Clear potentially inconsistent data for that month on error
            transactions: state.transactions.filter(t => !(t.userId === userId && t.monthYear === monthYear))
          }));
        }
      },

      getTransactionsByUserAndMonth: (userId, monthYear) => {
        // This now filters from the local 'transactions' cache which is populated by fetchTransactionsByMonth
        return get().transactions.filter(t => t.userId === userId && t.monthYear === monthYear);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Consider partializing if you don't want to persist everything or handle migrations
      // partialize: (state) => ({ user: state.user }), 
    }
  )
);

// Helper to initialize fetching when user/month changes in components
export function useInitializeTransactions(monthYear: string) {
  const { user, fetchTransactionsByMonth, transactions } = useAuthStore();

  React.useEffect(() => {
    if (user && monthYear) {
      // Check if transactions for this monthYear and user are already loaded
      // to avoid redundant fetches. This simple check might need refinement
      // depending on how fresh you need the data.
      const existing = transactions.some(t => t.userId === user && t.monthYear === monthYear);
      if (!existing) {
         fetchTransactionsByMonth(user, monthYear);
      }
    }
  }, [user, monthYear, fetchTransactionsByMonth, transactions]);
}

// TransactionForm's 'addTransaction' needs to be adapted as 'addTransaction' in store is now async.
// The original TransactionForm took Omit<Transaction, 'id' | 'userId' | 'monthYear'> which aligns with the new store.
// The `TransactionForm` itself in `components/transactions/TransactionForm.tsx` will need to handle the async nature of `addTransaction`
// e.g. by disabling submit button while processing.
// The `addTransaction` in the hook now is:
// addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'monthYear'>) => Promise<void>;

// The `Transaction` type is fine.
// The `TransactionForm` from `components/transactions/TransactionForm.tsx` passes `data` to `addTransaction`.
// The `data` type in `TransactionForm` is `TransactionFormValues` which is:
// { description: string; amount: number; date: Date; type: "income" | "expense"; categoryId: string; }
// We need to format `data.date` to string "yyyy-MM-dd" before passing to `addTransaction`.

// Corrected `addTransaction` call in `TransactionForm.tsx` (conceptual change, actual file edit not here):
/*
  const onSubmit = async (data: TransactionFormValues) => { // Make onSubmit async
    // ...
    const formattedDate = format(data.date, "yyyy-MM-dd");
    // ...
    // The newTransaction object structure used for API and optimistic update
    const transactionPayload: Omit<Transaction, 'id' | 'userId' | 'monthYear'> = {
      description: data.description,
      amount: data.amount,
      date: formattedDate, // Use formatted date string
      type: data.type,
      categoryId: data.categoryId,
    };

    try {
      form.formState.isSubmitting = true; // Manually set submitting state
      await addTransaction(transactionPayload); // Call the async store action
      toast({ title: "Thành công!", description: "Đã thêm giao dịch mới." }); // Toast logic can be moved here from store or duplicated
      form.reset();
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error handling will be in the store, or can be enhanced here
      // toast({ title: "Lỗi", description: "Không thể thêm giao dịch.", variant: "destructive" });
    } finally {
      form.formState.isSubmitting = false; // Reset submitting state
    }
  };
*/
// The `useEffect` in pages like `TransactionsPage.tsx` listening to `allTransactions` (which is now `transactions`)
// will still work for re-rendering when `transactions` cache changes.
// `getTransactionsByUserAndMonth` is still synchronous, reading from the cache. `fetchTransactionsByMonth` is the async part.
// Pages should call `fetchTransactionsByMonth` in their `useEffect` to load data.
// I've added a `useInitializeTransactions` hook for convenience.

