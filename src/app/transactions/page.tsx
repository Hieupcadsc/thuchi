"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/hooks/useAuth';
import type { Transaction, FamilyMember } from '@/types';
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS, FAMILY_ACCOUNT_ID, ALL_CATEGORIES_VALUE, ALL_MEMBERS_VALUE, ALL_TRANSACTIONS_VALUE } from '@/lib/constants';
import { PlusCircle, AlertTriangle, Loader2, Search, Filter, CalendarIcon, XCircle, Camera, Trash2, RefreshCw, Tag, User } from 'lucide-react';
import { format, subMonths, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useMobileFirst } from '@/hooks/use-mobile-detection';
import { MobileTransactionList } from '@/components/mobile/MobileTransactionList';
import { MobileQuickActions } from '@/components/mobile/MobileQuickActions';
import { MobileSearchBar } from '@/components/mobile/MobileSearchBar';
import { MobileFilterSheet } from '@/components/mobile/MobileFilterSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added AlertDialogTrigger
} from "@/components/ui/alert-dialog";

// Helper function để sort transactions theo thời gian tạo chính xác  
const sortTransactionsByCreationTime = (a: Transaction, b: Transaction): number => {
  // Ưu tiên createdAt nếu có, fallback về date nếu không có createdAt
  const aTime = a.createdAt ? new Date(a.createdAt).getTime() : parseISO(a.date).getTime();
  const bTime = b.createdAt ? new Date(b.createdAt).getTime() : parseISO(b.date).getTime();
  return bTime - aTime; // Mới nhất trước
};



export default function TransactionsPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions } = useAuthStore();
  const { toast } = useToast();
  const { showMobileUI } = useMobileFirst();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isBillModeActive, setIsBillModeActive] = useState(false);
  
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES_VALUE);
  const [filterPerformedBy, setFilterPerformedBy] = useState<string>(ALL_MEMBERS_VALUE);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);



  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(today, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
      });
    }
    return options;
  }, []);

  useEffect(() => {
    if (monthOptions.length > 0 && !currentMonthYear && !isDateFilterActive) {
      setCurrentMonthYear(monthOptions[0].value);
    }
  }, [monthOptions, currentMonthYear, isDateFilterActive]);

  const loadDataForCurrentFilters = useCallback(async () => {
    if (!currentUser || !familyId) return;
    setIsLoading(true);
    const monthsToFetch = new Set<string>();

    if (isDateFilterActive && filterStartDate && filterEndDate) {
      let currentFetchMonth = startOfMonth(new Date(filterStartDate));
      const endMonthTarget = startOfMonth(new Date(filterEndDate));
      while (currentFetchMonth <= endMonthTarget) {
          monthsToFetch.add(format(currentFetchMonth, 'yyyy-MM'));
          const nextMonth = new Date(currentFetchMonth);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          currentFetchMonth = nextMonth;
      }
    } else if (currentMonthYear === ALL_TRANSACTIONS_VALUE) {
      // Load last 12 months for "all transactions" view
      for (let i = 0; i < 12; i++) {
        const date = subMonths(new Date(), i);
        monthsToFetch.add(format(date, 'yyyy-MM'));
      }
    } else if (currentMonthYear && !isDateFilterActive) {
      monthsToFetch.add(currentMonthYear);
    } else if (monthOptions.length > 0 && !isDateFilterActive && monthOptions[0]?.value) {
      const defaultMonth = monthOptions[0].value;
      if (currentMonthYear !== defaultMonth) setCurrentMonthYear(defaultMonth);
      monthsToFetch.add(defaultMonth);
    }
    
    if (monthsToFetch.size > 0) {
      for (const monthStr of Array.from(monthsToFetch)) {
          await fetchTransactionsByMonth(familyId, monthStr);
      }
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, currentMonthYear, isDateFilterActive, filterStartDate, filterEndDate, monthOptions]); // Removed fetchTransactionsByMonth from deps as it's stable
  
  useEffect(() => {
    loadDataForCurrentFilters();
  }, [loadDataForCurrentFilters]);

  const handleRefreshTransactions = async () => {
    setIsRefreshing(true);
    setSelectedTransactionIds([]); // Clear selection on refresh
    await loadDataForCurrentFilters();
    setIsRefreshing(false);
  };

  const handleDebugState = () => {
    console.log("🔧 [DEBUG] Current state:");
    console.log("🔧 [DEBUG] familyId:", familyId);
    console.log("🔧 [DEBUG] currentMonthYear:", currentMonthYear);
    console.log("🔧 [DEBUG] All transactions in store:", transactions);
    console.log("🔧 [DEBUG] Displayed transactions:", displayTransactions);
    console.log("🔧 [DEBUG] Filter states:", { searchTerm, filterCategory, filterPerformedBy, isDateFilterActive, filterStartDate, filterEndDate });
  };

  const handleFormSuccess = async () => {
    setIsFormVisible(false);
    setEditingTransaction(null);
    setIsBillModeActive(false); 
    await loadDataForCurrentFilters();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsBillModeActive(false); 
    setIsFormVisible(true);
  };

  const handleAddNewTransaction = () => {
    setEditingTransaction(null);
    setIsBillModeActive(false);
    setIsFormVisible(true);
  };

  const handleAddFromBill = () => {
    setEditingTransaction(null);
    setIsBillModeActive(true);
    setIsFormVisible(true);
  };
  
  const handleCancelForm = () => {
    setIsFormVisible(false);
    setEditingTransaction(null);
    setIsBillModeActive(false);
  };

  const displayTransactions = useMemo(() => {
    if (!currentUser || !familyId) return [];
    
    let sourceTransactions: Transaction[]; 

    if (isDateFilterActive && filterStartDate && filterEndDate) {
        sourceTransactions = transactions.filter(t => {
            try {
                const transactionDate = parseISO(t.date);
                return isValid(transactionDate) && 
                       transactionDate >= startOfMonth(filterStartDate) && 
                       transactionDate <= endOfMonth(filterEndDate);
            } catch (e) { return false; }
        });
    } else if (currentMonthYear === ALL_TRANSACTIONS_VALUE) {
        // Show all transactions from all loaded months
        sourceTransactions = transactions;
    } else if (currentMonthYear && !isDateFilterActive) {
        sourceTransactions = getTransactionsForFamilyByMonth(familyId, currentMonthYear);
    } else {
        sourceTransactions = [];
    }

    let filtered = [...sourceTransactions]; 

    if (searchTerm) {
      filtered = filtered.filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterCategory && filterCategory !== ALL_CATEGORIES_VALUE) {
      filtered = filtered.filter(t => t.categoryId === filterCategory);
    }
    if (filterPerformedBy && filterPerformedBy !== ALL_MEMBERS_VALUE) {
      filtered = filtered.filter(t => t.performedBy === filterPerformedBy);
    }
    
    return filtered.sort(sortTransactionsByCreationTime);

  }, [currentUser, familyId, transactions, currentMonthYear, getTransactionsForFamilyByMonth, searchTerm, filterCategory, filterPerformedBy, filterStartDate, filterEndDate, isDateFilterActive]);

  const resetFilters = async () => {
    setSearchTerm('');
    setFilterCategory(ALL_CATEGORIES_VALUE);
    setFilterPerformedBy(ALL_MEMBERS_VALUE);
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setIsDateFilterActive(false);
    setSelectedTransactionIds([]);
    if (monthOptions.length > 0 && currentMonthYear !== monthOptions[0].value) {
        setCurrentMonthYear(monthOptions[0].value); 
        // loadDataForCurrentFilters will be called by useEffect on currentMonthYear change
    } else {
        await loadDataForCurrentFilters(); // Explicitly call if month isn't changing
    }
  };
  
  const handleApplyDateFilter = async () => {
    if (filterStartDate && filterEndDate) {
        if (filterEndDate < filterStartDate) {
             toast({ title: "Lỗi", description: "Ngày kết thúc không thể trước ngày bắt đầu.", variant: "destructive"});
             return;
        }
        setIsDateFilterActive(true);
        setCurrentMonthYear(''); // Clear month selection when date range is active
        setSelectedTransactionIds([]);
        await loadDataForCurrentFilters();
    } else {
        toast({ title: "Thiếu thông tin", description: "Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.", variant: "default"});
    }
  };

  const handleToggleSelectTransaction = (transactionId: string) => {
    setSelectedTransactionIds(prevSelected => 
      prevSelected.includes(transactionId) 
        ? prevSelected.filter(id => id !== transactionId)
        : [...prevSelected, transactionId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTransactionIds.length === displayTransactions.length && displayTransactions.length > 0) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(displayTransactions.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactionIds.length === 0) {
      toast({ title: "Chưa chọn mục", description: "Vui lòng chọn ít nhất một giao dịch để xóa.", variant: "default"});
      return;
    }
    setIsBulkDeleting(true);
    const transactionsToDelete = selectedTransactionIds.map(id => {
      const transaction = transactions.find(t => t.id === id); // Search in global transactions state
      return transaction ? { id: transaction.id, monthYear: transaction.monthYear } : null;
    }).filter(t => t !== null) as Array<{ id: string, monthYear: string }>;

    if (transactionsToDelete.length > 0) {
      await bulkDeleteTransactions(transactionsToDelete);
      setSelectedTransactionIds([]);
    } else {
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin giao dịch để xóa.", variant: "destructive"});
    }
    setIsBulkDeleting(false);
    await loadDataForCurrentFilters(); // Reload data after bulk delete
  };

  const hasActiveFilters = searchTerm || 
    filterCategory !== ALL_CATEGORIES_VALUE || 
    filterPerformedBy !== ALL_MEMBERS_VALUE || 
    isDateFilterActive;

  if (!currentUser) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg">Vui lòng đăng nhập để quản lý giao dịch.</p>
      </div>
    );
  }

  // Mobile view
  if (showMobileUI) {
    return (
      <div className="space-y-4 animate-fade-in mobile-safe-area p-4">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl -mx-4 mb-2">
          <div>
            <h1 className="text-lg font-bold">Giao Dịch</h1>
            <p className="text-sm opacity-90">{currentUser}</p>
          </div>
          <Button
            onClick={handleRefreshTransactions}
            disabled={isLoading || isRefreshing}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Mobile Search & Filter */}
        <MobileSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onFilterOpen={() => setIsFilterSheetOpen(true)}
          hasActiveFilters={hasActiveFilters}
          resultCount={displayTransactions.length}
        />

        {/* Mobile Filter Sheet */}
        <MobileFilterSheet
          searchTerm={searchTerm}
          filterCategory={filterCategory}
          filterPerformedBy={filterPerformedBy}
          filterStartDate={filterStartDate}
          filterEndDate={filterEndDate}
          isDateFilterActive={isDateFilterActive}
          onSearchChange={setSearchTerm}
          onCategoryChange={setFilterCategory}
          onPerformedByChange={(value: string) => setFilterPerformedBy(value)}
          onDateRangeChange={(startDate, endDate) => {
            setFilterStartDate(startDate);
            setFilterEndDate(endDate);
          }}
          onDateFilterActiveChange={(active: boolean) => setIsDateFilterActive(active)}
          onApplyFilters={async () => {
            await loadDataForCurrentFilters();
          }}
          onResetFilters={resetFilters}
          isOpen={isFilterSheetOpen}
          onOpenChange={setIsFilterSheetOpen}
          resultCount={displayTransactions.length}
        />

        {/* Mobile Form */}
        {(isFormVisible || editingTransaction) && (
          <Card className="mobile-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {editingTransaction ? 'Chỉnh sửa' : (isBillModeActive ? 'Scan Bill' : 'Thêm mới')}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCancelForm}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TransactionForm 
                onSuccess={handleFormSuccess} 
                transactionToEdit={editingTransaction}
                onCancel={handleCancelForm}
                isBillMode={isBillModeActive && !editingTransaction} 
              />
            </CardContent>
          </Card>
        )}

        {/* Mobile Transaction List */}
        <Card className="mobile-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Giao dịch ({displayTransactions.length})
              </CardTitle>
              <div className="flex gap-2">
                {selectedTransactionIds.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={isBulkDeleting}
                    className="mobile-button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Đang tải...</p>
              </div>
            ) : (
              <MobileTransactionList
                transactions={displayTransactions}
                onEdit={handleEdit}
                onDelete={async (transactionId) => {
                  const transaction = transactions.find(t => t.id === transactionId);
                  if (transaction) {
                    await deleteTransaction(transactionId, transaction.monthYear);
                    await loadDataForCurrentFilters();
                  }
                }}
                onSelect={handleToggleSelectTransaction}
                selectedIds={selectedTransactionIds}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>

        <MobileQuickActions
          onAddTransaction={handleAddNewTransaction}
          onAddFromBill={handleAddFromBill}
          onSearch={() => setIsFilterSheetOpen(true)}
          onFilter={() => setIsFilterSheetOpen(true)}
          onCalendar={() => { window.location.href = '/dashboard'; }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section with Action Buttons */}
      <div className="glass rounded-2xl p-6 border animate-slide-down">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Quản Lý Giao Dịch ({currentUser})
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Thêm mới, sửa, xoá và xem lại các khoản thu chi của gia đình.
            </p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              onClick={handleAddNewTransaction}
              className="flex-1 sm:flex-none btn-enhanced gradient-bg-success text-white hover:shadow-lg transition-all duration-300"
              size="lg"
            >
              <PlusCircle className="mr-2 h-5 w-5" />
              {(isFormVisible && !editingTransaction && !isBillModeActive) ? 'Đóng Form' : 'Thêm Mới'}
            </Button>
            <Button
              onClick={handleAddFromBill}
              variant="outline"
              className="flex-1 sm:flex-none btn-enhanced border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-300"
              size="lg"
            >
              <Camera className="mr-2 h-5 w-5" />
              {(isFormVisible && isBillModeActive) ? 'Đóng Form Bill' : 'Thêm từ Bill'}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Form Modal */}
      {(isFormVisible || editingTransaction) && (
        <Card className="shadow-2xl border-2 border-primary/20 card-hover animate-scale-in">
          <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white animate-pulse-soft">
                    {editingTransaction ? 
                      <PlusCircle className="h-5 w-5" /> : 
                      (isBillModeActive ? <Camera className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />)
                    }
                  </div>
                  {editingTransaction ? 'Chỉnh Sửa Giao Dịch' : (isBillModeActive ? 'Thêm Giao Dịch từ Bill' : 'Thêm Giao Dịch Mới')}
                </CardTitle>
                <CardDescription className="text-base">
                  {editingTransaction ? 'Chỉnh sửa thông tin chi tiết cho khoản thu hoặc chi.' : 
                   (isBillModeActive ? 'Tải ảnh bill để AI trích xuất thông tin tự động.' : 'Điền thông tin chi tiết cho khoản thu hoặc chi của gia đình.')}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelForm}
                className="rounded-full hover:bg-red-100 dark:hover:bg-red-950/20 hover:text-red-600 transition-all duration-200"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950 rounded-b-lg">
            <TransactionForm 
                onSuccess={handleFormSuccess} 
                transactionToEdit={editingTransaction}
                onCancel={handleCancelForm}
                isBillMode={isBillModeActive && !editingTransaction} 
            />
          </CardContent>
        </Card>
      )}

      {/* Enhanced Filter Section */}
      <Card className="shadow-xl card-hover border-2 border-gradient animate-slide-up overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-purple-950/50 border-b border-border/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl animate-pulse opacity-75"></div>
                <div className="relative p-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg">
                  <Filter className="h-5 w-5"/>
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Bộ Lọc Thông Minh
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Tìm kiếm và lọc giao dịch nhanh chóng</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={handleRefreshTransactions} 
                disabled={isLoading || isRefreshing} 
                variant="outline" 
                size="sm" 
                className="btn-enhanced hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-400"
              >
                {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Làm mới
              </Button>
              <Button
                onClick={handleDebugState}
                variant="outline"
                size="sm"
                className="btn-enhanced bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900 transition-all duration-300"
              >
                🔧 Debug
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-blue-950/20">
          {/* Quick Filters Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium">Lọc nhanh:</span>
            </div>
            <Button
              variant={currentMonthYear === ALL_TRANSACTIONS_VALUE ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsDateFilterActive(false);
                setCurrentMonthYear(ALL_TRANSACTIONS_VALUE);
                setFilterStartDate(undefined);
                setFilterEndDate(undefined);
                setSelectedTransactionIds([]);
              }}
              className="rounded-full h-8 px-4 transition-all duration-300 hover:scale-105"
            >
              📊 Toàn bộ giao dịch
            </Button>
            <Button
              variant={currentMonthYear === monthOptions[0]?.value && !isDateFilterActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setIsDateFilterActive(false);
                setCurrentMonthYear(monthOptions[0]?.value || '');
                setFilterStartDate(undefined);
                setFilterEndDate(undefined);
                setSelectedTransactionIds([]);
              }}
              className="rounded-full h-8 px-4 transition-all duration-300 hover:scale-105"
            >
              📅 Tháng hiện tại
            </Button>
            <Button
              variant={isDateFilterActive ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!filterStartDate || !filterEndDate) {
                  const today = new Date();
                  setFilterStartDate(startOfMonth(today));
                  setFilterEndDate(endOfMonth(today));
                }
                setIsDateFilterActive(true);
                setSelectedTransactionIds([]);
              }}
              className="rounded-full h-8 px-4 transition-all duration-300 hover:scale-105"
            >
              🎯 Khoảng ngày tùy chỉnh
            </Button>
          </div>

          <div className="space-y-6">
            {/* Main Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Tìm kiếm
                </label>
                <Input 
                  placeholder="Nhập mô tả giao dịch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 bg-white/80 dark:bg-gray-800/80 border-2 focus:border-blue-400 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Danh mục
                </label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-2 focus:border-blue-400">
                    <SelectValue placeholder="Chọn danh mục..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_VALUE}>🏷️ Tất cả danh mục</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Người thực hiện
                </label>
                <Select value={filterPerformedBy} onValueChange={(value) => setFilterPerformedBy(value as string)}>
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-2 focus:border-blue-400">
                    <SelectValue placeholder="Chọn thành viên..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_MEMBERS_VALUE}>👥 Tất cả thành viên</SelectItem>
                    {FAMILY_MEMBERS.map(member => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Thời gian
                </label>
                <Select 
                  value={
                    isDateFilterActive ? "custom" : 
                    currentMonthYear === ALL_TRANSACTIONS_VALUE ? ALL_TRANSACTIONS_VALUE :
                    (currentMonthYear || (monthOptions[0]?.value ?? ''))
                  } 
                  onValueChange={(value) => {
                    if (value === "custom") {
                      if (!filterStartDate || !filterEndDate) {
                        const today = new Date();
                        setFilterStartDate(startOfMonth(today));
                        setFilterEndDate(endOfMonth(today));
                      }
                      setIsDateFilterActive(true);
                      setSelectedTransactionIds([]);
                    } else {
                      setIsDateFilterActive(false);
                      setCurrentMonthYear(value);
                      setFilterStartDate(undefined);
                      setFilterEndDate(undefined);
                      setSelectedTransactionIds([]);
                    }
                  }}
                >
                  <SelectTrigger className="h-12 bg-white/80 dark:bg-gray-800/80 border-2 focus:border-blue-400">
                    <SelectValue placeholder="Chọn thời gian..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TRANSACTIONS_VALUE}>📊 Toàn bộ giao dịch</SelectItem>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        📅 {option.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">🎯 Khoảng ngày tùy chỉnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Date Range */}
            {isDateFilterActive && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Từ ngày</label>
                    <Input
                      type="date"
                      value={filterStartDate ? format(filterStartDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFilterStartDate(new Date(e.target.value));
                        }
                      }}
                      className="h-12 bg-white dark:bg-gray-800 border-2 focus:border-blue-400"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-blue-700 dark:text-blue-300">Đến ngày</label>
                    <Input
                      type="date"
                      value={filterEndDate ? format(filterEndDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          setFilterEndDate(new Date(e.target.value));
                        }
                      }}
                      className="h-12 bg-white dark:bg-gray-800 border-2 focus:border-blue-400"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleApplyDateFilter} 
                    className="h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all duration-300 hover:shadow-lg" 
                    disabled={!filterStartDate || !filterEndDate || isLoading || isRefreshing}
                  >
                    {(isLoading || isRefreshing) && isDateFilterActive ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Áp dụng bộ lọc
                  </Button>
                </div>
              </div>
            )}

            {/* Reset Filters */}
            {(searchTerm || (filterCategory !== ALL_CATEGORIES_VALUE) || (filterPerformedBy !== ALL_MEMBERS_VALUE) || isDateFilterActive || currentMonthYear === ALL_TRANSACTIONS_VALUE) && (
              <div className="flex justify-center pt-4">
                <Button 
                  variant="ghost" 
                  onClick={resetFilters} 
                  className="text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-300 rounded-full px-6 py-2"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Xóa tất cả bộ lọc
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Lịch Sử Giao Dịch Gia Đình</CardTitle>
              <CardDescription>
                {isDateFilterActive && filterStartDate && filterEndDate ? 
                `Giao dịch từ ${format(filterStartDate, "dd/MM/yyyy", {locale: vi})} đến ${format(filterEndDate, "dd/MM/yyyy", {locale: vi})}` :
                currentMonthYear === ALL_TRANSACTIONS_VALUE ? 'Toàn bộ giao dịch (12 tháng gần nhất)' :
                (currentMonthYear ? (monthOptions.find(m => m.value === currentMonthYear)?.label || `tháng ${currentMonthYear}`) : 'Vui lòng chọn tháng hoặc khoảng ngày')
                }
              </CardDescription>
            </div>
            {!isDateFilterActive && (
                <div className="w-full sm:w-auto min-w-[180px] sm:min-w-[200px]">
                <Select 
                    value={currentMonthYear || (monthOptions[0]?.value ?? '')} 
                    onValueChange={(value) => {
                        setCurrentMonthYear(value);
                        setIsDateFilterActive(false); 
                        setFilterStartDate(undefined);
                        setFilterEndDate(undefined);
                        setSelectedTransactionIds([]);
                    }} 
                    disabled={isLoading || isRefreshing}
                >
                    <SelectTrigger>
                    <SelectValue placeholder="Chọn tháng" />
                    </SelectTrigger>
                    <SelectContent>
                    {monthOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                        {option.label}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                </div>
            )}
          </div>
          {displayTransactions.length > 0 && (
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-4 border-t pt-4">
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="select-all-transactions"
                        checked={selectedTransactionIds.length === displayTransactions.length && displayTransactions.length > 0}
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Chọn tất cả giao dịch đang hiển thị"
                    />
                    <label htmlFor="select-all-transactions" className="text-sm font-medium whitespace-nowrap">
                        Chọn tất cả ({selectedTransactionIds.length}/{displayTransactions.length})
                    </label>
                </div>
                {selectedTransactionIds.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full mt-2 sm:mt-0 sm:w-auto sm:ml-auto" disabled={isBulkDeleting}>
                            {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Xóa mục đã chọn ({selectedTransactionIds.length})
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa {selectedTransactionIds.length} giao dịch?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Các giao dịch đã chọn sẽ bị xóa vĩnh viễn.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Hủy</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90" disabled={isBulkDeleting}>
                            {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Xóa"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {(isLoading || isRefreshing) && displayTransactions.length === 0 && !isDateFilterActive && !currentMonthYear ? (
             <div className="flex justify-center items-center h-[200px]">
                <p className="text-muted-foreground">Vui lòng chọn tháng để xem giao dịch.</p>
             </div>
          ) : (isLoading || isRefreshing) ? ( 
            <div className="flex justify-center items-center h-[200px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Đang tải giao dịch...</p>
            </div>
          ) : (
            <TransactionList 
                transactions={displayTransactions}
                onEdit={handleEdit}
                onDelete={async (transactionId, monthYearToDelete) => { 
                    if (!currentUser || !familyId) return;
                    
                    setEditingTransaction(null); 
                    setIsFormVisible(false);
                    setIsBillModeActive(false);
                    setSelectedTransactionIds(prev => prev.filter(id => id !== transactionId));
                    
                    await deleteTransaction(transactionId, monthYearToDelete); 
                    await loadDataForCurrentFilters();
                }}
                selectedIds={selectedTransactionIds}
                onToggleSelect={handleToggleSelectTransaction}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

