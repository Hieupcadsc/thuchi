"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Transaction, UserType, FamilyMember, HighValueExpenseAlert, PaymentSource } from '@/types';
import { toast as showAppToast } from './use-toast';
import { FAMILY_MEMBERS, APP_NAME, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID, FAMILY_ACCOUNT_ID, DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants';
import { format } from 'date-fns';
import { firestoreService } from '@/lib/firestore-service';

const HIGH_EXPENSE_THRESHOLD = 1000000;
const SHARED_PASSWORD = "123456";

// Helper function để sort transactions theo thời gian tạo chính xác
const sortTransactionsByCreationTime = (a: Transaction, b: Transaction): number => {
  // Ưu tiên createdAt nếu có, fallback về date nếu không có createdAt
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
  return bTime - aTime; // Mới nhất trước
};

interface AuthState {
  currentUser: FamilyMember | null;
  familyId: UserType | null;
  transactions: Transaction[];
  highValueExpenseAlerts: HighValueExpenseAlert[];
  login: (user: FamilyMember, pass: string) => Promise<boolean>;
  logout: () => void;
  addTransaction: (transactionData: Omit<Transaction, 'id' | 'familyId' | 'monthYear' > & { date: string }) => Promise<Transaction | null>;
  updateTransaction: (updatedTransaction: Transaction) => Promise<void>;
  deleteTransaction: (transactionId: string, monthYear: string) => Promise<void>;
  bulkDeleteTransactions: (transactionsToDelete: Array<{ id: string, monthYear: string }>) => Promise<void>;
  fetchTransactionsByMonth: (familyId: UserType, monthYear: string) => Promise<void>;
  getTransactionsForFamilyByMonth: (familyId: UserType, monthYear: string) => Transaction[];
  markAlertAsViewedBySpouse: (alertId: string) => void;
  processCashWithdrawal: (amount: number, note?: string) => Promise<boolean>;
  forceRefreshTransactions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      familyId: null,
      transactions: [],
      highValueExpenseAlerts: [],
      login: async (user, pass) => {
        if (!FAMILY_MEMBERS.includes(user as FamilyMember) && user !== DEMO_USER) {
          showAppToast({
            title: "Đăng nhập thất bại",
            description: "Tài khoản không tồn tại.",
            variant: "destructive",
          });
          return false;
        }

        try {
          // Call API to authenticate
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: user,
              password: pass,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            // Update localStorage for immediate UI feedback
            if (data.user.passwordStrength) {
              localStorage.setItem(`password_strength_${user}`, data.user.passwordStrength);
            }

            // Set appropriate family ID based on user type
            const familyId = user === DEMO_USER ? DEMO_ACCOUNT_ID : FAMILY_ACCOUNT_ID;
            
            set({
              currentUser: user,
              familyId: familyId,
            });
            return true;
          } else {
            showAppToast({
              title: "Đăng nhập thất bại",
              description: data.error || "Mật khẩu không đúng. Vui lòng thử lại.",
              variant: "destructive",
            });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          showAppToast({
            title: "Đăng nhập thất bại",
            description: "Có lỗi xảy ra. Vui lòng thử lại.",
            variant: "destructive",
          });
          return false;
        }
      },
      logout: () => {
        set({
          currentUser: null,
          familyId: null,
          transactions: [],
          highValueExpenseAlerts: [],
        });
      },

      addTransaction: async (transactionData) => {
        const currentFamilyId = get().familyId;
        const loggedInUser = get().currentUser;

        if (!currentFamilyId || !loggedInUser) {
          showAppToast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
          return null;
        }
        
        const monthYear = transactionData.date.substring(0, 7);

        let transactionId: string;
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          transactionId = crypto.randomUUID();
        } else {
          // Fallback for insecure contexts or older environments
          console.warn('[useAuthStore] crypto.randomUUID not available, using fallback ID generator.');
          transactionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        }

        const newTransaction: Transaction = {
          id: transactionId,
          familyId: currentFamilyId, 
          description: transactionData.description,
          amount: transactionData.amount,
          date: transactionData.date,
          type: transactionData.type,
          categoryId: transactionData.categoryId,
          monthYear: monthYear,
          note: transactionData.note || undefined,
          performedBy: loggedInUser, 
          paymentSource: transactionData.paymentSource,
          createdAt: new Date().toISOString(), // Timestamp để sắp xếp chính xác theo thời gian tạo
        };

        const originalTransactions = get().transactions;
        
        console.log("🔧 [useAuth] Adding transaction to state:", newTransaction);
        console.log("🔧 [useAuth] Current transactions in state:", get().transactions.length);
        set((state) => ({ 
          transactions: [...state.transactions, newTransaction].sort(sortTransactionsByCreationTime) 
        }));
        console.log("🔧 [useAuth] After adding, transactions in state:", get().transactions.length);

        // Handle Demo user differently - save to localStorage only
        if (loggedInUser === DEMO_USER) {
          try {
            // Save to localStorage for Demo user
            const currentState = get();
            localStorage.setItem(`transactions_${currentFamilyId}`, JSON.stringify(currentState.transactions));
            
            showAppToast({ title: "Thành công!", description: "Đã thêm giao dịch Demo." });

            // Handle high value expense alerts for Demo too
            if (newTransaction.type === 'expense' &&
                newTransaction.categoryId !== RUT_TIEN_MAT_CATEGORY_ID && 
                newTransaction.categoryId !== NAP_TIEN_MAT_CATEGORY_ID && 
                newTransaction.amount > HIGH_EXPENSE_THRESHOLD
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
              
              showAppToast({
                title: "Lưu ý chi tiêu Demo",
                description: `Bạn vừa ghi nhận một khoản chi lớn: ${newTransaction.amount.toLocaleString('vi-VN')} VND cho "${newTransaction.description}".`,
                variant: "default",
                duration: 7000,
              });
            }
            return newTransaction;
          } catch (error: any) {
            console.error("Failed to save Demo transaction to localStorage:", error);
            showAppToast({ title: "Lỗi Demo", description: "Không thể lưu giao dịch Demo.", variant: "destructive" });
            set({ transactions: originalTransactions }); 
            return null;
          }
        }

        // Regular users - save to Firestore
        try {
          // Remove id field for Firestore service
          const { id, ...transactionWithoutId } = newTransaction;
          const savedTransaction = await firestoreService.addTransaction(transactionWithoutId);
          
          set((state) => ({
            transactions: state.transactions.map(t => t.id === newTransaction.id ? savedTransaction : t)
                                       .sort(sortTransactionsByCreationTime)
          }));
          showAppToast({ title: "Thành công!", description: "Đã thêm giao dịch mới." });

          if (newTransaction.type === 'expense' &&
              newTransaction.categoryId !== RUT_TIEN_MAT_CATEGORY_ID && 
              newTransaction.categoryId !== NAP_TIEN_MAT_CATEGORY_ID && // Also exclude deposit to cash
              newTransaction.amount > HIGH_EXPENSE_THRESHOLD
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
            
            if (get().currentUser === newTransaction.performedBy) {
                 showAppToast({
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
          showAppToast({ title: "Lỗi Server", description: error.message, variant: "destructive" });
          set({ transactions: originalTransactions }); 
          return null;
        }
      },

      updateTransaction: async (updatedTransaction) => {
        const originalTransactions = get().transactions;
        const loggedInUser = get().currentUser;

        if (!loggedInUser) {
          showAppToast({ title: "Lỗi", description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.", variant: "destructive" });
          return;
        }
        
        
        updatedTransaction.monthYear = updatedTransaction.date.substring(0,7);

        
        set(state => ({
            transactions: state.transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
                                            .sort(sortTransactionsByCreationTime)
        }));

        // Handle Demo user differently
        if (loggedInUser === DEMO_USER) {
          try {
            const currentState = get();
            localStorage.setItem(`transactions_${currentState.familyId}`, JSON.stringify(currentState.transactions));
            showAppToast({ title: "Thành công!", description: "Đã cập nhật giao dịch Demo." });
          } catch (error: any) {
            console.error("Failed to update Demo transaction:", error);
            showAppToast({ title: "Lỗi Demo", description: "Không thể cập nhật giao dịch Demo.", variant: "destructive" });
            set({ transactions: originalTransactions }); 
          }
        } else {
          // Regular users - save to Firestore  
          try {
              await firestoreService.updateTransaction(updatedTransaction.id, updatedTransaction);
              showAppToast({ title: "Thành công!", description: "Đã cập nhật giao dịch." });
          } catch (error: any) {
              console.error("Failed to update transaction:", error);
              showAppToast({ title: "Lỗi cập nhật", description: error.message, variant: "destructive" });
              set({ transactions: originalTransactions }); 
          }
        }
      },

      deleteTransaction: async (transactionId, monthYear) => {
        const originalTransactions = get().transactions;
        const loggedInUser = get().currentUser;
        
        set(state => ({
            transactions: state.transactions.filter(t => t.id !== transactionId)
        }));

        // Handle Demo user differently
        if (loggedInUser === DEMO_USER) {
          try {
            const currentState = get();
            localStorage.setItem(`transactions_${currentState.familyId}`, JSON.stringify(currentState.transactions));
            showAppToast({ title: "Thành công!", description: "Đã xóa giao dịch Demo." });
          } catch (error: any) {
            console.error("Failed to delete Demo transaction:", error);
            showAppToast({ title: "Lỗi Demo", description: "Không thể xóa giao dịch Demo.", variant: "destructive" });
            set({ transactions: originalTransactions }); 
          }
        } else {
          // Regular users - delete from Firestore
          try {
              await firestoreService.deleteTransaction(transactionId);
              showAppToast({ title: "Thành công!", description: "Đã xóa giao dịch." });
          } catch (error: any) {
              console.error("Failed to delete transaction:", error);
              showAppToast({ title: "Lỗi xóa", description: error.message, variant: "destructive" });
              set({ transactions: originalTransactions }); 
          }
        }
      },

      bulkDeleteTransactions: async (transactionsToDelete) => {
        if (transactionsToDelete.length === 0) return;
        const originalTransactions = get().transactions;
        const transactionIds = transactionsToDelete.map(t => t.id);
        const loggedInUser = get().currentUser;

        console.log('🗑️ Starting bulk delete for transaction IDs:', transactionIds);

        // Update UI optimistically
        set(state => ({
            transactions: state.transactions.filter(t => !transactionIds.includes(t.id))
        }));

        // Handle Demo user differently
        if (loggedInUser === DEMO_USER) {
          try {
            const currentState = get();
            localStorage.setItem(`transactions_${currentState.familyId}`, JSON.stringify(currentState.transactions));
            console.log('💾 Saved updated Demo transactions to localStorage');
            showAppToast({ title: "Thành công!", description: `Đã xóa ${transactionsToDelete.length} giao dịch Demo.` });
          } catch (error: any) {
            console.error("❌ Failed to bulk delete Demo transactions:", error);
            showAppToast({ 
              title: "Lỗi Xóa Demo", 
              description: "Không thể xóa giao dịch Demo.", 
              variant: "destructive" 
            });
            set({ transactions: originalTransactions }); 
          }
        } else {
          // Regular users - delete from Firestore
          try {
              console.log('🔄 Calling firestoreService.bulkDeleteTransactions...');
              await firestoreService.bulkDeleteTransactions(transactionIds);
              console.log('✅ Firestore bulk delete completed successfully');
              
              // Also save to localStorage for persistence (temporary fix)
              const currentState = get();
              localStorage.setItem(`transactions_${currentState.familyId}`, JSON.stringify(currentState.transactions));
              console.log('💾 Saved updated transactions to localStorage');
              
              showAppToast({ title: "Thành công!", description: `Đã xóa ${transactionsToDelete.length} giao dịch.` });
          } catch (error: any) {
              console.error("❌ Failed to bulk delete transactions:", error);
              console.error("Error name:", error.name);
              console.error("Error message:", error.message);
              console.error("Error code:", error.code);
              console.error("Full error object:", error);
              
              showAppToast({ 
                title: "Lỗi Xóa Hàng Loạt", 
                description: `Chi tiết lỗi: ${error.message}`, 
                variant: "destructive" 
              });
              
              // Rollback UI changes
              set({ transactions: originalTransactions }); 
          }
        }
      },

      fetchTransactionsByMonth: async (familyIdToFetch, monthYear) => {
        // Normalize family ID - but keep Demo separate
        if (familyIdToFetch !== FAMILY_ACCOUNT_ID && familyIdToFetch !== DEMO_ACCOUNT_ID) {
            familyIdToFetch = FAMILY_ACCOUNT_ID;
        }
        
        console.log(`[useAuthStore fetchTransactionsByMonth] Fetching transactions for familyId: ${familyIdToFetch}, monthYear: ${monthYear}`); 

        // Handle Demo user - only use localStorage
        if (familyIdToFetch === DEMO_ACCOUNT_ID) {
          try {
            console.log('🔄 Demo user - loading from localStorage only...');
            const localStorageKey = `transactions_${DEMO_ACCOUNT_ID}`;
            const localData = localStorage.getItem(localStorageKey);
            
            if (localData) {
              const localTransactions = JSON.parse(localData);
              set({ transactions: localTransactions });
              console.log(`✅ Demo: Loaded ${localTransactions.length} transactions from localStorage`);
            } else {
              console.log('📄 Demo: No transactions in localStorage');
            }
          } catch (error) {
            console.error('❌ Demo: Failed to load from localStorage:', error);
          }
          return;
        }

        // Regular users - use Firestore
        try {
          // Try Firestore first
          console.log('🔄 Trying Firestore...');
          const fetchedTransactions = await firestoreService.getTransactionsByMonth(familyIdToFetch, monthYear);
          console.log(`[useAuthStore fetchTransactionsByMonth] Successfully fetched ${fetchedTransactions.length} transactions from Firestore`);
          
          // *** SỬA LỖI: ƯU TIÊN FIRESTORE HƠN LOCALSTORAGE ***
          // localStorage chỉ dùng làm backup khi Firestore lỗi, không ưu tiên hơn server data
          const localStorageKey = `transactions_${familyIdToFetch}`;
          console.log(`💾 Always prioritizing Firestore data over localStorage for consistency`);
          
          // Use Firestore data and update local storage
          set((state) => {
            const existingTransactionsMap = new Map(state.transactions.map(t => [t.id, t]));
            fetchedTransactions.forEach(ft => {
                existingTransactionsMap.set(ft.id, ft);
            });
            const currentMonthTransactionsFromServerIds = new Set(fetchedTransactions.map(ft => ft.id));
            const transactionsToKeepForCurrentMonth = state.transactions.filter(t => 
                !(t.monthYear === monthYear && t.familyId === familyIdToFetch && !currentMonthTransactionsFromServerIds.has(t.id))
            );
            
            const otherTransactions = transactionsToKeepForCurrentMonth.filter(t => 
                !(t.monthYear === monthYear && t.familyId === familyIdToFetch)
            );
            
            const updatedTransactions = [...otherTransactions, ...fetchedTransactions]
                                      .sort(sortTransactionsByCreationTime);
            
            console.log(`[useAuthStore fetchTransactionsByMonth] Updated local state with ${updatedTransactions.length} total transactions after fetching for ${monthYear}.`);
            
            // Save to localStorage backup
            localStorage.setItem(localStorageKey, JSON.stringify(updatedTransactions));
            
            return { transactions: updatedTransactions };
          });
        } catch (error: any) {
          console.error('[useAuthStore fetchTransactionsByMonth] Error fetching transactions directly from Firestore:', error);
          
          // Try localStorage fallback
          const localStorageKey = `transactions_${familyIdToFetch}`;
          const localBackup = localStorage.getItem(localStorageKey);
          
          if (localBackup) {
            try {
              console.log('🔄 Using localStorage fallback...');
              const localTransactions = JSON.parse(localBackup);
              set({ transactions: localTransactions });
              
              showAppToast({ 
                title: "⚠️ Dùng backup local", 
                description: "Firestore lỗi, đang dùng dữ liệu backup", 
                variant: "default" 
              });
              return;
            } catch (parseError) {
              console.error('Failed to parse localStorage fallback:', parseError);
            }
          }
          
          showAppToast({ 
            title: "Lỗi tải giao dịch", 
            description: error.message || "Không thể tải danh sách giao dịch", 
            variant: "destructive" 
          });
        }
      },

      getTransactionsForFamilyByMonth: (familyIdToFilter, monthYear) => {
        // Normalize family ID - but keep Demo separate
        if (familyIdToFilter !== FAMILY_ACCOUNT_ID && familyIdToFilter !== DEMO_ACCOUNT_ID) {
            familyIdToFilter = FAMILY_ACCOUNT_ID;
        }
        const allTransactions = get().transactions;
        const filtered = allTransactions.filter(t => t.familyId === familyIdToFilter && t.monthYear === monthYear);
        console.log(`[useAuthStore] getTransactionsForFamilyByMonth for ${monthYear} (familyId: ${familyIdToFilter}): Found ${filtered.length} of ${allTransactions.length} total transactions in state.`);
        console.log(`🔧 [useAuth] All transactions:`, allTransactions.map(t => ({id: t.id, desc: t.description, monthYear: t.monthYear, familyId: t.familyId})));
        console.log(`🔧 [useAuth] Filtered transactions:`, filtered.map(t => ({id: t.id, desc: t.description, monthYear: t.monthYear})));
        return filtered.sort(sortTransactionsByCreationTime);
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
        const currentFamilyId = get().familyId;
        
        if (!loggedInUser || !currentFamilyId) {
          showAppToast({ title: "Lỗi", description: "Vui lòng đăng nhập để thực hiện.", variant: "destructive" });
          return false;
        }
        if (amount <= 0) {
          showAppToast({ title: "Số tiền không hợp lệ", description: "Số tiền rút phải lớn hơn 0.", variant: "destructive" });
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
          showAppToast({ title: "Lỗi Rút Tiền", description: "Không thể tạo giao dịch chi từ ngân hàng.", variant: "destructive" });
          return false;
        }
        const incomeResult = await get().addTransaction(incomeTransactionData);
        if (!incomeResult) {
          showAppToast({ title: "Lỗi Rút Tiền", description: "Đã tạo giao dịch chi, nhưng không thể tạo giao dịch thu tiền mặt. Vui lòng kiểm tra lại.", variant: "destructive" });
          // Consider if we need to rollback the expense transaction here in a real app
          return false; 
        }
        
        showAppToast({ title: "Thành Công", description: `Đã rút ${amount.toLocaleString('vi-VN')} VND tiền mặt.` });
        return true;
      },

      // Force refresh all transactions from Firestore (clear cache)
      forceRefreshTransactions: async () => {
        const state = get();
        const familyId = state.familyId || FAMILY_ACCOUNT_ID;
        
        console.log('🔄 Force refreshing ALL transactions...');
        
        // Handle Demo user differently
        if (familyId === DEMO_ACCOUNT_ID) {
          console.log('🔄 Demo user - refreshing from localStorage...');
          // Clear state and reload from localStorage
          set({ transactions: [] });
          
          try {
            const localStorageKey = `transactions_${DEMO_ACCOUNT_ID}`;
            const localData = localStorage.getItem(localStorageKey);
            
            if (localData) {
              const localTransactions = JSON.parse(localData);
              set({ transactions: localTransactions });
              console.log(`✅ Demo: Refreshed ${localTransactions.length} transactions from localStorage`);
            } else {
              console.log('📄 Demo: No transactions in localStorage to refresh');
            }
          } catch (error) {
            console.error('❌ Demo: Failed to refresh from localStorage:', error);
            set({ transactions: [] });
            throw error;
          }
          return;
        }

        // Regular users - refresh from Firestore
        console.log('🔄 Regular user - refreshing from Firestore...');
        
        // Clear ALL caches
        localStorage.removeItem(`transactions_${familyId}`);
        set({ transactions: [] });
        
        // *** SỬA LỖI: Lấy TẤT CẢ transactions, không chỉ tháng hiện tại ***
        try {
          const freshTransactions = await firestoreService.getAllTransactions(familyId);
          console.log(`🔄 Force refresh: Got ${freshTransactions.length} fresh transactions from Firestore (ALL months)`);
          
          // Debug: Log the actual IDs we're getting
          freshTransactions.slice(0, 5).forEach((t, index) => {
            console.log(`🔍 Fresh transaction ${index + 1}: ID=${t.id}, desc="${t.description}", amount=${t.amount}, date=${t.date}`);
          });
          
          // Set directly without merging
          set({ transactions: freshTransactions });
          
          // Verify what's actually in store after setting
          const storeAfterSet = get().transactions;
          console.log(`🔍 Store after set: ${storeAfterSet.length} transactions`);
          
          // Group by month for verification
          const monthGroups = storeAfterSet.reduce((acc, t) => {
            const monthYear = t.date.substring(0, 7);
            acc[monthYear] = (acc[monthYear] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          console.log('🔍 Transactions by month:', monthGroups);
          
          console.log('✅ Force refresh completed with ALL fresh Firestore data');
        } catch (error) {
          console.error('❌ Force refresh failed:', error);
          set({ transactions: [] });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage-v2', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        familyId: state.familyId,
        highValueExpenseAlerts: state.highValueExpenseAlerts,
        // transactions: state.transactions, // Consider if transactions should be persisted if they grow very large
      }),
    }
  )
);
