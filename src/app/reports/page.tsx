
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyComparisonChart } from '@/components/reports/MonthlyComparisonChart';
import { CategoryBreakdownChart } from '@/components/reports/CategoryBreakdownChart';
import { useAuthStore, FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, MONTH_NAMES } from '@/lib/constants';
import { format, subMonths } from 'date-fns';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface MonthlyChartData {
  month: string;
  thu: number;
  chi: number;
}

interface CategoryChartData {
  name: string;
  value: number;
  fill: string; 
}

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

export default function ReportsPage() {
  const { familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<MonthlyChartData[]>([]);
  const [categoryBreakdownData, setCategoryBreakdownData] = useState<CategoryChartData[]>([]);
  const [selectedMonthForCategory, setSelectedMonthForCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
     if (monthOptions.length > 0 && !selectedMonthForCategory) {
        setSelectedMonthForCategory(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonthForCategory]);

  useEffect(() => {
    if (familyId) {
      const loadReportData = async () => {
        setIsLoading(true);
        const monthsToFetch = new Set<string>();
        
        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(currentDate, i);
          monthsToFetch.add(format(date, 'yyyy-MM'));
        }
        if (selectedMonthForCategory) {
          monthsToFetch.add(selectedMonthForCategory);
        }

        if (monthsToFetch.size > 0) {
            await Promise.all(
              Array.from(monthsToFetch).map(m => fetchTransactionsByMonth(familyId, m))
            );
        }
        setIsLoading(false);
      };
      loadReportData();
    }
  }, [familyId, selectedMonthForCategory, fetchTransactionsByMonth]);

  useEffect(() => {
    if (familyId && transactions.length > 0) {
      const comparisonData: MonthlyChartData[] = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYearKey = format(date, 'yyyy-MM');
        const monthTransactions = getTransactionsForFamilyByMonth(familyId, monthYearKey);
        
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        comparisonData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyComparisonData(comparisonData);

      if (selectedMonthForCategory) {
        const transactionsForSelectedMonth = getTransactionsForFamilyByMonth(familyId, selectedMonthForCategory);
        const expenseTransactions = transactionsForSelectedMonth.filter(t => t.type === 'expense');
        
        const breakdown: { [key: string]: number } = {};
        expenseTransactions.forEach(t => {
          const categoryName = CATEGORIES.find(c => c.id === t.categoryId)?.name || 'Khác';
          breakdown[categoryName] = (breakdown[categoryName] || 0) + t.amount;
        });

        const categoryData = Object.entries(breakdown).map(([name, value], index) => ({
          name,
          value,
          fill: chartColors[index % chartColors.length],
        })).sort((a,b) => b.value - a.value); 
        setCategoryBreakdownData(categoryData);
      }
    } else if (familyId && !isLoading) {
        setMonthlyComparisonData([]);
        setCategoryBreakdownData([]);
    }
  }, [familyId, transactions, selectedMonthForCategory, getTransactionsForFamilyByMonth, isLoading]);

  if (!familyId) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg">Vui lòng đăng nhập để xem báo cáo.</p>
      </div>
    );
  }
  
  if (isLoading && monthlyComparisonData.length === 0 && categoryBreakdownData.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Thu Chi</h1>
        <p className="text-muted-foreground">Phân tích trực quan tình hình tài chính của gia đình.</p>
      </div>

      <MonthlyComparisonChart data={monthlyComparisonData} />
      
      <div>
        <div className="mb-4 flex justify-end">
          <div className="w-full sm:w-auto min-w-[200px]">
            <Select value={selectedMonthForCategory} onValueChange={setSelectedMonthForCategory} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tháng xem chi tiết" />
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
        <CategoryBreakdownChart data={categoryBreakdownData} />
      </div>
    </div>
  );
}
