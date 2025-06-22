
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyComparisonChart } from '@/components/reports/MonthlyComparisonChart';
import { CategoryBreakdownChart } from '@/components/reports/CategoryBreakdownChart';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { useAuthStore } from '@/hooks/useAuth';
import { FAMILY_MEMBERS, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID } from '@/lib/constants'; // Import FAMILY_MEMBERS from constants
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CATEGORIES, MONTH_NAMES } from '@/lib/constants';
import type { Transaction, FamilyMember, MonthlySummary } from '@/types';
import { format, subMonths } from 'date-fns';
import { AlertTriangle, Loader2, User, TrendingUp, TrendingDown, Banknote } from 'lucide-react';

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
  "hsl(var(--primary))", "hsl(var(--secondary))",
];

const initialMemberSummary: MonthlySummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0, 
};

// Helper to create initial state for member summaries and breakdowns
const createInitialMemberData = <T,>(initialValue: T): Record<FamilyMember, T> => {
  return FAMILY_MEMBERS.reduce((acc, member) => {
    acc[member] = JSON.parse(JSON.stringify(initialValue)); // Deep copy for objects/arrays
    return acc;
  }, {} as Record<FamilyMember, T>);
};


export default function ReportsPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<MonthlyChartData[]>([]);
  const [categoryBreakdownDataFamily, setCategoryBreakdownDataFamily] = useState<CategoryChartData[]>([]);
  
  const [memberSummary, setMemberSummary] = useState<Record<FamilyMember, MonthlySummary>>(
    createInitialMemberData(initialMemberSummary)
  );
  const [memberCategoryBreakdown, setMemberCategoryBreakdown] = useState<Record<FamilyMember, CategoryChartData[]>>(
     createInitialMemberData<CategoryChartData[]>([])
  );

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Family-wide summary for the selected month (excluding internal transfers)
  const [familyMonthlySummary, setFamilyMonthlySummary] = useState<MonthlySummary>(initialMemberSummary);


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
     if (monthOptions.length > 0 && !selectedMonth) {
        setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    if (currentUser && familyId) {
      const loadReportData = async () => {
        setIsLoading(true);
        const monthsToFetchSet = new Set<string>();
        
        // For MonthlyComparisonChart (last 6 months)
        const currentDateObj = new Date();
        for (let i = 5; i >= 0; i--) { 
          const date = subMonths(currentDateObj, i);
          monthsToFetchSet.add(format(date, 'yyyy-MM'));
        }
        // For detailed breakdown (selectedMonth)
        if (selectedMonth) { 
          monthsToFetchSet.add(selectedMonth);
        }

        if (monthsToFetchSet.size > 0 && familyId) { 
            // Fetch months sequentially to avoid quota issues
            for (const monthStr of Array.from(monthsToFetchSet)) {
                 await fetchTransactionsByMonth(familyId, monthStr);
            }
        }
        setIsLoading(false);
      };
      loadReportData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, selectedMonth]); // fetchTransactionsByMonth is stable

  useEffect(() => {
    if (currentUser && familyId && transactions.length > 0) {
      // Monthly Comparison Chart Data (excluding internal transfers)
      const comparisonData: MonthlyChartData[] = [];
      const currentDate = new Date(); // Use actual current date for chart range
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(currentDate, i);
        const monthYearKey = format(date, 'yyyy-MM');
        const monthTransactions = getTransactionsForFamilyByMonth(familyId, monthYearKey); 
        
        const income = monthTransactions
          .filter(t => t.type === 'income' && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID)
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions
          .filter(t => t.type === 'expense' && t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID)
          .reduce((sum, t) => sum + t.amount, 0);
        
        comparisonData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyComparisonData(comparisonData);

      if (selectedMonth) {
        const transactionsForSelectedMonth = getTransactionsForFamilyByMonth(familyId, selectedMonth);

        // Family-wide breakdown and summary (excluding internal transfers)
        const familyExpenseTransactions = transactionsForSelectedMonth.filter(t => t.type === 'expense' && t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID);
        const familyBreakdown: { [key: string]: number } = {};
        familyExpenseTransactions.forEach(t => {
          const categoryName = CATEGORIES.find(c => c.id === t.categoryId)?.name || 'Khác';
          familyBreakdown[categoryName] = (familyBreakdown[categoryName] || 0) + t.amount;
        });
        const familyCategoryData = Object.entries(familyBreakdown).map(([name, value], index) => ({
          name, value, fill: chartColors[index % chartColors.length],
        })).sort((a,b) => b.value - a.value); 
        setCategoryBreakdownDataFamily(familyCategoryData);

        const familyTotalIncome = transactionsForSelectedMonth
            .filter(t => t.type === 'income' && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID)
            .reduce((sum, t) => sum + t.amount, 0);
        const familyTotalExpense = familyExpenseTransactions.reduce((sum, t) => sum + t.amount, 0); // Already filtered
        setFamilyMonthlySummary({
            totalIncome: familyTotalIncome,
            totalExpense: familyTotalExpense,
            balance: familyTotalIncome - familyTotalExpense
        });


        // Per-member breakdown and summary (excluding internal transfers)
        const newMemberSummary = createInitialMemberData(initialMemberSummary);
        const newMemberCategoryBreakdown = createInitialMemberData<CategoryChartData[]>([]);

        FAMILY_MEMBERS.forEach(member => {
          const memberTransactions = transactionsForSelectedMonth.filter(t => t.performedBy === member);
          let totalIncome = 0;
          let totalExpense = 0;
          const memberExpenseBreakdown: { [key: string]: number } = {};

          memberTransactions.forEach(t => {
            if (t.type === 'income' && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID) totalIncome += t.amount;
            else if (t.type === 'expense' && t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID) {
              totalExpense += t.amount;
              const categoryName = CATEGORIES.find(c => c.id === t.categoryId)?.name || 'Khác';
              memberExpenseBreakdown[categoryName] = (memberExpenseBreakdown[categoryName] || 0) + t.amount;
            }
          });
          newMemberSummary[member] = { totalIncome, totalExpense, balance: totalIncome - totalExpense };
          newMemberCategoryBreakdown[member] = Object.entries(memberExpenseBreakdown).map(([name, value], index) => ({
            name, value, fill: chartColors[index % chartColors.length],
          })).sort((a,b) => b.value - a.value);
        });
        setMemberSummary(newMemberSummary);
        setMemberCategoryBreakdown(newMemberCategoryBreakdown);
      }
    } else if (currentUser && familyId && !isLoading) {
        // If no transactions, set empty or default states
        setMonthlyComparisonData([]); // Or initialize with 6 months of 0s if preferred for chart structure
        setCategoryBreakdownDataFamily([]);
        setFamilyMonthlySummary(initialMemberSummary);
        setMemberSummary(createInitialMemberData(initialMemberSummary));
        setMemberCategoryBreakdown(createInitialMemberData<CategoryChartData[]>([]));
    }
  }, [currentUser, familyId, transactions, selectedMonth, getTransactionsForFamilyByMonth, isLoading]);

  if (!currentUser) {
    return (
      <div className="text-center p-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg">Vui lòng đăng nhập để xem báo cáo.</p>
      </div>
    );
  }
  
  if (isLoading && monthlyComparisonData.length === 0 && categoryBreakdownDataFamily.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Đang tải dữ liệu báo cáo...</p>
      </div>
    );
  }
  
  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Thu Chi Gia Đình (Thực tế)</h1>
        <p className="text-muted-foreground">Phân tích trực quan tình hình tài chính (không bao gồm giao dịch rút/nạp tiền mặt nội bộ).</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle>Tổng Quan Thu Chi Gia Đình 6 Tháng Gần Nhất</CardTitle>
        </CardHeader>
        <CardContent>
            <MonthlyComparisonChart data={monthlyComparisonData} />
        </CardContent>
      </Card>
      
      
      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle>Phân Tích Chi Tiết Theo Tháng</CardTitle>
                    <CardDescription>Chọn tháng để xem phân bổ chi tiêu của gia đình và từng thành viên (không bao gồm giao dịch nội bộ).</CardDescription>
                </div>
                <div className="w-full sm:w-auto min-w-[180px] sm:min-w-[200px]">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isLoading}>
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
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold mb-2">Tổng Quan Gia Đình - {selectedMonthLabel}</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <SummaryCard 
                      title={`Tổng Thu (${selectedMonthLabel})`} 
                      value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(familyMonthlySummary.totalIncome)} 
                      variant="income"
                    />
                    <SummaryCard 
                      title={`Tổng Chi (${selectedMonthLabel})`} 
                      value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(familyMonthlySummary.totalExpense)} 
                      variant="expense"
                    />
                    <SummaryCard 
                      title={`Số Dư (${selectedMonthLabel})`} 
                      value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(familyMonthlySummary.balance)} 
                      variant="balance"
                    />
                </div>
                <CategoryBreakdownChart data={categoryBreakdownDataFamily} />
            </div>
            <hr className="my-6 border-border"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FAMILY_MEMBERS.map(member => (
                <div key={member} className="space-y-4">
                    <h3 className="text-xl font-semibold">Thống Kê Của {member} - {selectedMonthLabel}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <SummaryCard 
                          title={`Tổng Thu (${member})`} 
                          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(memberSummary[member]?.totalIncome || 0)} 
                          variant="income"
                        />
                        <SummaryCard 
                          title={`Tổng Chi (${member})`} 
                          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(memberSummary[member]?.totalExpense || 0)} 
                          variant="expense"
                        />
                        <SummaryCard 
                          title={`Số Dư (${member})`} 
                          value={new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(memberSummary[member]?.balance || 0)} 
                          variant="balance"
                        />
                    </div>
                    <CategoryBreakdownChart data={memberCategoryBreakdown[member] || []} />
                </div>
            ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    