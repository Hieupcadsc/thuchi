
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useAuthStore, FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';
import type { Transaction, FamilyMember } from '@/types';
import { CATEGORIES, MONTH_NAMES, FAMILY_MEMBERS } from '@/lib/constants';
import { PlusCircle, AlertTriangle, Loader2, Search, Filter, CalendarIcon, XCircle, Camera } from 'lucide-react';
import { format, subMonths, isValid, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ALL_CATEGORIES_VALUE = "all_categories";
const ALL_MEMBERS_VALUE = "all_members";

export default function TransactionsPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, addTransaction, updateTransaction, deleteTransaction } = useAuthStore();
  const { toast } = useToast();
  
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isBillModeActive, setIsBillModeActive] = useState(false);
  
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES_VALUE);
  const [filterPerformedBy, setFilterPerformedBy] = useState<string>(ALL_MEMBERS_VALUE);
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);


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

  useEffect(() => {
    if (currentUser && familyId && currentMonthYear && !isDateFilterActive) { 
      const loadTransactions = async () => {
        setIsLoading(true);
        await fetchTransactionsByMonth(familyId, currentMonthYear);
        setIsLoading(false);
      };
      loadTransactions();
    }
  }, [currentUser, familyId, currentMonthYear, fetchTransactionsByMonth, isDateFilterActive]);

  const fetchTransactionsForDateRange = async (start: Date, end: Date) => {
    if (!currentUser || !familyId) return;
    setIsLoading(true);
    const monthsToFetch = new Set<string>();
    let currentMonth = startOfMonth(new Date(start));
    const endMonthTarget = startOfMonth(new Date(end));
    while (currentMonth <= endMonthTarget) {
        monthsToFetch.add(format(currentMonth, 'yyyy-MM'));
        const nextMonth = new Date(currentMonth);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        currentMonth = nextMonth;
    }
    if (monthsToFetch.size > 0) {
      await Promise.all(Array.from(monthsToFetch).map(m => fetchTransactionsByMonth(familyId, m)));
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (currentUser && familyId && isDateFilterActive && filterStartDate && filterEndDate) {
      fetchTransactionsForDateRange(filterStartDate, filterEndDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, isDateFilterActive, filterStartDate, filterEndDate, fetchTransactionsByMonth]);


  const handleFormSuccess = async () => {
    setIsFormVisible(false);
    setEditingTransaction(null);
    setIsBillModeActive(false); 
    if (currentUser && familyId) {
      if (isDateFilterActive && filterStartDate && filterEndDate) {
        await fetchTransactionsForDateRange(filterStartDate, filterEndDate);
      } else if (currentMonthYear && !isDateFilterActive) {
        setIsLoading(true);
        await fetchTransactionsByMonth(familyId, currentMonthYear);
        setIsLoading(false);
      } else if (monthOptions.length > 0 && !isDateFilterActive) {
        // Fallback to default month if no specific range/month is active
        setIsLoading(true);
        await fetchTransactionsByMonth(familyId, monthOptions[0].value);
        setIsLoading(false);
      }
    }
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
    
    let sourceTransactions = transactions; 

    if (isDateFilterActive && filterStartDate && filterEndDate) {
        sourceTransactions = sourceTransactions.filter(t => {
            const transactionDate = parseISO(t.date);
            // Normalize start date to beginning of day, end date to end of day
            const startDateNormalized = startOfMonth(new Date(filterStartDate)); // More precisely, startOfDay(filterStartDate)
            startDateNormalized.setHours(0,0,0,0);

            const endDateNormalized = endOfMonth(new Date(filterEndDate)); // More precisely, endOfDay(filterEndDate)
            endDateNormalized.setHours(23,59,59,999);

            return isValid(transactionDate) && transactionDate >= filterStartDate && transactionDate <= filterEndDate;
        });
    } else if (currentMonthYear && !isDateFilterActive) {
        sourceTransactions = getTransactionsForFamilyByMonth(familyId, currentMonthYear);
    } else {
        // If no month filter and no date range, show nothing or all (depending on desired default)
        // For now, let's assume it defaults to currentMonthYear or shows nothing if currentMonthYear isn't set
        sourceTransactions = currentMonthYear ? getTransactionsForFamilyByMonth(familyId, currentMonthYear) : [];
    }


    let filtered = [...sourceTransactions]; // Create a mutable copy

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

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCategory(ALL_CATEGORIES_VALUE);
    setFilterPerformedBy(ALL_MEMBERS_VALUE);
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
    setIsDateFilterActive(false);
    if (monthOptions.length > 0) {
        setCurrentMonthYear(monthOptions[0].value); // Reset to the default month
    }
  };
  
  const handleApplyDateFilter = () => {
    if (filterStartDate && filterEndDate) {
        if (filterEndDate < filterStartDate) {
             toast({ title: "Lỗi", description: "Ngày kết thúc không thể trước ngày bắt đầu.", variant: "destructive"});
             return;
        }
        setIsDateFilterActive(true);
        // Data fetching is handled by the useEffect hook dependent on isDateFilterActive, filterStartDate, filterEndDate
    } else {
        toast({ title: "Thiếu thông tin", description: "Vui lòng chọn cả ngày bắt đầu và ngày kết thúc.", variant: "default"});
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Giao Dịch ({currentUser})</h1>
          <p className="text-muted-foreground">Thêm mới, sửa, xóa và xem lại các khoản thu chi của gia đình.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleAddNewTransaction} size="lg" variant="outline">
            <PlusCircle className="mr-2 h-5 w-5" />
            {isFormVisible && !editingTransaction && !isBillModeActive ? 'Đóng Form' : 'Thêm Mới'}
            </Button>
            <Button onClick={handleAddFromBill} size="lg">
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

      {/* Filter Section */}
      <Card className="shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/> Bộ Lọc Giao Dịch</CardTitle>
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
                        } else {
                            setIsDateFilterActive(false);
                            setCurrentMonthYear(value);
                            setFilterStartDate(undefined);
                            setFilterEndDate(undefined);
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
                                <Button variant="outline" className={cn("h-10 justify-start text-left font-normal", !filterStartDate && "text-muted-foreground")}>
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
                                <Button variant="outline" className={cn("h-10 justify-start text-left font-normal", !filterEndDate && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {filterEndDate ? format(filterEndDate, "dd/MM/yyyy", {locale: vi}) : <span>Chọn ngày kết thúc</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={filterEndDate} onSelect={setFilterEndDate} disabled={(date) => filterStartDate ? date < filterStartDate : false} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleApplyDateFilter} className="h-10" disabled={!filterStartDate || !filterEndDate || isLoading}>
                        {isLoading && isDateFilterActive ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                <div className="w-full sm:w-auto min-w-[200px]">
                <Select 
                    value={currentMonthYear || (monthOptions[0]?.value ?? '')} 
                    onValueChange={(value) => {
                        setCurrentMonthYear(value);
                        setIsDateFilterActive(false); 
                        setFilterStartDate(undefined);
                        setFilterEndDate(undefined);
                    }} 
                    disabled={isLoading}
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
        </CardHeader>
        <CardContent>
          {isLoading && displayTransactions.length === 0 ? ( 
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
                    
                    await deleteTransaction(transactionId, monthYearToDelete); 
                    // After delete, re-fetch based on current filter state
                     if (isDateFilterActive && filterStartDate && filterEndDate) {
                        await fetchTransactionsForDateRange(filterStartDate, filterEndDate);
                    } else if (currentMonthYear && !isDateFilterActive) {
                        await fetchTransactionsByMonth(familyId, currentMonthYear);
                    } else if (monthOptions.length > 0 && !isDateFilterActive) {
                         await fetchTransactionsByMonth(familyId, monthOptions[0].value);
                    }
                }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
