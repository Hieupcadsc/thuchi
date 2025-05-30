
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
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS, FAMILY_ACCOUNT_ID } from '@/lib/constants';
import { PlusCircle, AlertTriangle, Loader2, Search, Filter, CalendarIcon, XCircle, Camera, Trash2, RefreshCw } from 'lucide-react';
import { format, subMonths, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL_CATEGORIES_VALUE = "all_categories";
const ALL_MEMBERS_VALUE = "all_members";

export default function TransactionsPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions } = useAuthStore();
  const { toast } = useToast();
  
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
    if (isDateFilterActive && filterStartDate && filterEndDate) {
      const monthsToFetch = new Set<string>();
      let currentFetchMonth = startOfMonth(new Date(filterStartDate));
      const endMonthTarget = startOfMonth(new Date(filterEndDate));
      while (currentFetchMonth <= endMonthTarget) {
          monthsToFetch.add(format(currentFetchMonth, 'yyyy-MM'));
          const nextMonth = new Date(currentFetchMonth);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          currentFetchMonth = nextMonth;
      }
      if (monthsToFetch.size > 0) {
        for (const monthStr of Array.from(monthsToFetch)) {
            await fetchTransactionsByMonth(familyId, monthStr);
        }
      }
    } else if (currentMonthYear && !isDateFilterActive) {
      await fetchTransactionsByMonth(familyId, currentMonthYear);
    } else if (monthOptions.length > 0 && !isDateFilterActive) {
      const defaultMonth = monthOptions[0].value;
      if (currentMonthYear !== defaultMonth) setCurrentMonthYear(defaultMonth);
      await fetchTransactionsByMonth(familyId, defaultMonth);
    }
    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, currentMonthYear, isDateFilterActive, filterStartDate, filterEndDate, fetchTransactionsByMonth, monthOptions]);
  
  useEffect(() => {
    loadDataForCurrentFilters();
  }, [loadDataForCurrentFilters]);

  const handleRefreshTransactions = async () => {
    setIsRefreshing(true);
    await loadDataForCurrentFilters();
    setIsRefreshing(false);
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
                return isValid(transactionDate) && transactionDate >= filterStartDate && transactionDate <= filterEndDate;
            } catch (e) { return false; }
        });
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
    
    return filtered.sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

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
    } else {
        await loadDataForCurrentFilters();
    }
  };
  
  const handleApplyDateFilter = async () => {
    if (filterStartDate && filterEndDate) {
        if (filterEndDate < filterStartDate) {
             toast({ title: "Lỗi", description: "Ngày kết thúc không thể trước ngày bắt đầu.", variant: "destructive"});
             return;
        }
        setIsDateFilterActive(true);
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
    if (selectedTransactionIds.length === displayTransactions.length) {
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
      const transaction = transactions.find(t => t.id === id);
      return transaction ? { id: transaction.id, monthYear: transaction.monthYear } : null;
    }).filter(t => t !== null) as Array<{ id: string, monthYear: string }>;

    if (transactionsToDelete.length > 0) {
      await bulkDeleteTransactions(transactionsToDelete);
      setSelectedTransactionIds([]);
    } else {
      toast({ title: "Lỗi", description: "Không tìm thấy thông tin giao dịch để xóa.", variant: "destructive"});
    }
    setIsBulkDeleting(false);
    await loadDataForCurrentFilters();
  };

  if (!currentUser) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg">Vui lòng đăng nhập để quản lý giao dịch.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Giao Dịch ({currentUser})</h1>
          <p className="text-muted-foreground">Thêm mới, sửa, xóa và xem lại các khoản thu chi của gia đình.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleAddNewTransaction} size="lg" variant="outline" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            {isFormVisible && !editingTransaction && !isBillModeActive ? 'Đóng Form' : 'Thêm Mới'}
            </Button>
            <Button onClick={handleAddFromBill} size="lg" className="w-full sm:w-auto">
            <Camera className="mr-2 h-5 w-5" />
            {isFormVisible && isBillModeActive ? 'Đóng Form Bill' : 'Thêm từ Bill'}
            </Button>
        </div>
      </div>

      {(isFormVisible || editingTransaction) && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{editingTransaction ? 'Chỉnh Sửa Giao Dịch' : (isBillModeActive ? 'Thêm Giao Dịch từ Bill' : 'Thêm Giao Dịch Mới')}</CardTitle>
            <CardDescription>
              {editingTransaction ? 'Chỉnh sửa thông tin chi tiết cho khoản thu hoặc chi.' : 
               (isBillModeActive ? 'Tải ảnh bill để AI trích xuất thông tin tự động.' : 'Điền thông tin chi tiết cho khoản thu hoặc chi của gia đình.')}
            </CardDescription>
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

      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Bộ Lọc Giao Dịch</CardTitle>
            <Button onClick={handleRefreshTransactions} disabled={isLoading || isRefreshing} variant="outline" size="sm" className="mt-2 sm:mt-0">
              {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input 
                    placeholder="Tìm theo mô tả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10"
                />
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Lọc theo danh mục..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_CATEGORIES_VALUE}>Tất cả danh mục</SelectItem>
                        {CATEGORIES.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select value={filterPerformedBy} onValueChange={(value) => setFilterPerformedBy(value as string)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Lọc theo người thực hiện..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_MEMBERS_VALUE}>Tất cả thành viên</SelectItem>
                        {FAMILY_MEMBERS.map(member => <SelectItem key={member} value={member}>{member}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select 
                    value={isDateFilterActive ? "custom" : (currentMonthYear || (monthOptions[0]?.value ?? ''))} 
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
                    <SelectTrigger className="h-10"><SelectValue placeholder="Lọc theo tháng/khoảng tùy chỉnh" /></SelectTrigger>
                    <SelectContent>
                        {monthOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                            {option.label}
                            </SelectItem>
                        ))}
                        <SelectItem value="custom">Khoảng ngày tùy chỉnh</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isDateFilterActive && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
                    <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium">Từ ngày</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("h-10 justify-start text-left font-normal w-full", !filterStartDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterStartDate ? format(filterStartDate, "dd/MM/yyyy", {locale: vi}) : <span>Chọn ngày bắt đầu</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterStartDate} onSelect={setFilterStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium">Đến ngày</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("h-10 justify-start text-left font-normal w-full", !filterEndDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterEndDate ? format(filterEndDate, "dd/MM/yyyy", {locale: vi}) : <span>Chọn ngày kết thúc</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} disabled={(date) => filterStartDate ? date < filterStartDate : false} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleApplyDateFilter} className="h-10 w-full md:w-auto" disabled={!filterStartDate || !filterEndDate || isLoading || isRefreshing}>
                        {(isLoading || isRefreshing) && isDateFilterActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Áp dụng khoảng ngày
                    </Button>
                </div>
            )}
            {(searchTerm || (filterCategory !== ALL_CATEGORIES_VALUE) || (filterPerformedBy !== ALL_MEMBERS_VALUE) || isDateFilterActive) && (
                <Button variant="ghost" onClick={resetFilters} className="text-sm text-muted-foreground hover:text-destructive mt-4">
                    <XCircle className="mr-2 h-4 w-4"/> Xóa tất cả bộ lọc
                </Button>
            )}
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
                `Danh sách giao dịch ${monthOptions.find(m => m.value === currentMonthYear)?.label || (currentMonthYear ? `tháng ${currentMonthYear}` : 'chưa chọn')}`
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
          {(isLoading || isRefreshing) && displayTransactions.length === 0 ? ( 
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
