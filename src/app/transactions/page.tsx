"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/hooks/useAuth';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { Transaction } from '@/types';
import { MONTH_NAMES } from '@/lib/constants';


export default function TransactionsPage() {
  const { user, getTransactionsByUserAndMonth, transactions: allTransactions } = useAuthStore(); // Use allTransactions for re-rendering
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>([]);

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) { // Show current month and previous 11 months
      const date = subMonths(today, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
      });
    }
    return options;
  }, []);

  useEffect(() => {
    // Set initial month to current month
    if (monthOptions.length > 0) {
      setCurrentMonthYear(monthOptions[0].value);
    }
  }, [monthOptions]);

  useEffect(() => {
    if (user && currentMonthYear) {
      const fetchedTransactions = getTransactionsByUserAndMonth(user, currentMonthYear);
      setDisplayTransactions(fetchedTransactions);
    } else {
      setDisplayTransactions([]);
    }
  }, [user, currentMonthYear, getTransactionsByUserAndMonth, allTransactions]); // Add allTransactions dependency

  const handleFormSuccess = () => {
    setIsFormVisible(false);
    // Re-fetch or update displayTransactions will happen due to allTransactions dependency change
  };

  if (!user) {
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
          <h1 className="text-3xl font-bold tracking-tight">Quản Lý Giao Dịch</h1>
          <p className="text-muted-foreground">Thêm mới và xem lại các khoản thu chi của bạn.</p>
        </div>
        <Button onClick={() => setIsFormVisible(!isFormVisible)} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          {isFormVisible ? 'Đóng Form' : 'Thêm Giao Dịch Mới'}
        </Button>
      </div>

      {isFormVisible && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Thêm Giao Dịch Mới</CardTitle>
            <CardDescription>Điền thông tin chi tiết cho khoản thu hoặc chi của bạn.</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionForm onSuccess={handleFormSuccess} />
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Lịch Sử Giao Dịch</CardTitle>
              <CardDescription>Danh sách các giao dịch đã được ghi lại.</CardDescription>
            </div>
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select value={currentMonthYear} onValueChange={setCurrentMonthYear}>
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
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={displayTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}
