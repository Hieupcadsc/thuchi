"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyComparisonChart } from '@/components/reports/MonthlyComparisonChart';
import { CategoryBreakdownChart } from '@/components/reports/CategoryBreakdownChart';
import { useAuthStore } from '@/hooks/useAuth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, MONTH_NAMES } from '@/lib/constants';
import { format, subMonths } from 'date-fns';
import type { Transaction } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface MonthlyChartData {
  month: string;
  thu: number;
  chi: number;
}

interface CategoryChartData {
  name: string;
  value: number;
  fill: string; // Color will be assigned in the component
}

const chartColors = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))",
];

export default function ReportsPage() {
  const { user, getTransactionsByUserAndMonth, transactions: allTransactions } = useAuthStore();
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<MonthlyChartData[]>([]);
  const [categoryBreakdownData, setCategoryBreakdownData] = useState<CategoryChartData[]>([]);
  const [selectedMonthForCategory, setSelectedMonthForCategory] = useState<string>('');

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
     if (monthOptions.length > 0) {
        setSelectedMonthForCategory(monthOptions[0].value);
    }
  }, [monthOptions]);

  useEffect(() => {
    if (user) {
      // Prepare data for MonthlyComparisonChart (last 6 months)
      const comparisonData: MonthlyChartData[] = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = format(date, 'yyyy-MM');
        const transactions = getTransactionsByUserAndMonth(user, monthYear);
        
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        comparisonData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyComparisonData(comparisonData);

      // Prepare data for CategoryBreakdownChart (for selected month)
      if (selectedMonthForCategory) {
        const transactionsForSelectedMonth = getTransactionsByUserAndMonth(user, selectedMonthForCategory);
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
        })).sort((a,b) => b.value - a.value); // Sort by value descending
        setCategoryBreakdownData(categoryData);
      }
    }
  }, [user, getTransactionsByUserAndMonth, selectedMonthForCategory, allTransactions]);


  if (!user) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg">Vui lòng đăng nhập để xem báo cáo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Thu Chi</h1>
        <p className="text-muted-foreground">Phân tích trực quan tình hình tài chính của bạn.</p>
      </div>

      <MonthlyComparisonChart data={monthlyComparisonData} />
      
      <div>
        <div className="mb-4 flex justify-end">
          <div className="w-full sm:w-auto min-w-[200px]">
            <Select value={selectedMonthForCategory} onValueChange={setSelectedMonthForCategory}>
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
