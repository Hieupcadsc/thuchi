
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { MonthlyComparisonChart } from '@/components/reports/MonthlyComparisonChart';
import { CategoryBreakdownChart } from '@/components/reports/CategoryBreakdownChart';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { useAuthStore, FAMILY_MEMBERS, FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';
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

export default function ReportsPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
  const [monthlyComparisonData, setMonthlyComparisonData] = useState<MonthlyChartData[]>([]);
  const [categoryBreakdownDataFamily, setCategoryBreakdownDataFamily] = useState<CategoryChartData[]>([]);
  
  const [memberSummary, setMemberSummary] = useState<Record<FamilyMember, MonthlySummary>>({
    'Vợ': initialMemberSummary,
    'Chồng': initialMemberSummary,
  });
  const [memberCategoryBreakdown, setMemberCategoryBreakdown] = useState<Record<FamilyMember, CategoryChartData[]>>({
    'Vợ': [],
    'Chồng': [],
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('');
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
     if (monthOptions.length > 0 && !selectedMonth) {
        setSelectedMonth(monthOptions[0].value);
    }
  }, [monthOptions, selectedMonth]);

  useEffect(() => {
    if (currentUser && familyId) {
      const loadReportData = async () => {
        setIsLoading(true);
        const monthsToFetch = new Set<string>();
        
        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) { // For 6-month comparison chart
          const date = subMonths(currentDate, i);
          monthsToFetch.add(format(date, 'yyyy-MM'));
        }
        if (selectedMonth) { // For selected month's breakdown
          monthsToFetch.add(selectedMonth);
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
  }, [currentUser, familyId, selectedMonth, fetchTransactionsByMonth]);

  useEffect(() => {
    if (currentUser && familyId && transactions.length > 0) {
      // --- Monthly Comparison Data (Family) ---
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

      // --- Data for Selected Month (Family & Individual Members) ---
      if (selectedMonth) {
        const transactionsForSelectedMonth = getTransactionsForFamilyByMonth(familyId, selectedMonth);

        // Family Breakdown
        const familyExpenseTransactions = transactionsForSelectedMonth.filter(t => t.type === 'expense');
        const familyBreakdown: { [key: string]: number } = {};
        familyExpenseTransactions.forEach(t => {
          const categoryName = CATEGORIES.find(c => c.id === t.categoryId)?.name || 'Khác';
          familyBreakdown[categoryName] = (familyBreakdown[categoryName] || 0) + t.amount;
        });
        const familyCategoryData = Object.entries(familyBreakdown).map(([name, value], index) => ({
          name, value, fill: chartColors[index % chartColors.length],
        })).sort((a,b) => b.value - a.value); 
        setCategoryBreakdownDataFamily(familyCategoryData);

        // Member specific summaries and breakdowns
        const newMemberSummary: Record<FamilyMember, MonthlySummary> = {'Vợ': {...initialMemberSummary}, 'Chồng': {...initialMemberSummary}};
        const newMemberCategoryBreakdown: Record<FamilyMember, CategoryChartData[]> = {'Vợ': [], 'Chồng': []};

        FAMILY_MEMBERS.forEach(member => {
          const memberTransactions = transactionsForSelectedMonth.filter(t => t.performedBy === member);
          let totalIncome = 0;
          let totalExpense = 0;
          const memberExpenseBreakdown: { [key: string]: number } = {};

          memberTransactions.forEach(t => {
            if (t.type === 'income') totalIncome += t.amount;
            else {
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
        setMonthlyComparisonData([]);
        setCategoryBreakdownDataFamily([]);
        setMemberSummary({'Vợ': initialMemberSummary, 'Chồng': initialMemberSummary});
        setMemberCategoryBreakdown({'Vợ': [], 'Chồng': []});
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Báo Cáo Thu Chi Gia Đình</h1>
        <p className="text-muted-foreground">Phân tích trực quan tình hình tài chính của gia đình và từng thành viên.</p>
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
                    <CardDescription>Chọn tháng để xem phân bổ chi tiêu của gia đình và từng thành viên.</CardDescription>
                </div>
                <div className="w-full sm:w-auto min-w-[200px]">
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
                <h3 className="text-xl font-semibold mb-2">Tổng Quan Gia Đình - {monthOptions.find(m=>m.value === selectedMonth)?.label}</h3>
                <CategoryBreakdownChart data={categoryBreakdownDataFamily} />
            </div>
            <hr className="my-6 border-border"/>
            <div className="grid md:grid-cols-2 gap-6">
            {FAMILY_MEMBERS.map(member => (
                <div key={member} className="space-y-4">
                    <h3 className="text-xl font-semibold">Thống Kê Của {member} - {monthOptions.find(m=>m.value === selectedMonth)?.label}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <SummaryCard title={`Tổng Thu (${member})`} value={memberSummary[member].totalIncome} icon={TrendingUp} colorClass="text-green-500" />
                        <SummaryCard title={`Tổng Chi (${member})`} value={memberSummary[member].totalExpense} icon={TrendingDown} colorClass="text-red-500" />
                        <SummaryCard title={`Số Dư (${member})`} value={memberSummary[member].balance} icon={Banknote} colorClass={memberSummary[member].balance >= 0 ? "text-blue-500" : "text-orange-500"} />
                    </div>
                    <CategoryBreakdownChart data={memberCategoryBreakdown[member]} />
                </div>
            ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
