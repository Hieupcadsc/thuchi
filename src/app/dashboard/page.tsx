
"use client";

import React, { useEffect, useState } from 'react'; // Added React
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SpendingChatbot } from '@/components/dashboard/SpendingChatbot';
import { WithdrawCashModal } from '@/components/dashboard/WithdrawCashModal'; // Added
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2, Camera, PlusCircle, Landmark, Wallet, ArrowRightLeft } from 'lucide-react'; // Added Landmark, Wallet, ArrowRightLeft
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Transaction } from '@/types'; // MonthlySummary removed, will calculate directly
import { MONTH_NAMES } from '@/lib/constants';
import { format, subMonths } from 'date-fns';

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balanceBank: number;
  balanceCash: number;
  totalBalance: number;
}

const initialSummary: DashboardSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balanceBank: 0,
  balanceCash: 0,
  totalBalance: 0,
};

export default function DashboardPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, processCashWithdrawal } = useAuthStore();
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  useEffect(() => {
    const now = new Date();
    setCurrentMonthYear(format(now, 'yyyy-MM'));
  }, []);

  useEffect(() => {
    if (currentUser && familyId && currentMonthYear) {
      const loadDashboardData = async () => {
        setIsLoading(true);
        const monthsToFetch = new Set<string>();
        monthsToFetch.add(currentMonthYear);

        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) {
          const date = subMonths(currentDate, i);
          monthsToFetch.add(format(date, 'yyyy-MM'));
        }

        await Promise.all(
          Array.from(monthsToFetch).map(m => fetchTransactionsByMonth(familyId, m))
        );
        setIsLoading(false);
      };
      loadDashboardData();
    }
  }, [currentUser, familyId, currentMonthYear, fetchTransactionsByMonth]);

  useEffect(() => {
    if (currentUser && familyId && transactions.length > 0 && currentMonthYear) {
      const currentMonthTransactions = getTransactionsForFamilyByMonth(familyId, currentMonthYear);
      let totalIncome = 0;
      let totalExpense = 0;
      let incomeBank = 0;
      let expenseBank = 0;
      let incomeCash = 0;
      let expenseCash = 0;

      currentMonthTransactions.forEach(t => {
        if (t.type === 'income') {
          totalIncome += t.amount;
          if (t.paymentSource === 'bank') incomeBank += t.amount;
          else if (t.paymentSource === 'cash') incomeCash += t.amount;
        } else {
          totalExpense += t.amount;
          if (t.paymentSource === 'bank') expenseBank += t.amount;
          else if (t.paymentSource === 'cash') expenseCash += t.amount;
        }
      });
      const balanceBank = incomeBank - expenseBank;
      const balanceCash = incomeCash - expenseCash;
      setSummary({
        totalIncome,
        totalExpense,
        balanceBank,
        balanceCash,
        totalBalance: balanceBank + balanceCash
      });

      const chartData = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYearKey = format(date, 'yyyy-MM');
        const monthTransactions = getTransactionsForFamilyByMonth(familyId, monthYearKey);

        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        chartData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyChartData(chartData);
    } else if (currentUser && familyId && !isLoading) {
      setSummary(initialSummary);
      setMonthlyChartData([]);
    }
  }, [currentUser, familyId, transactions, currentMonthYear, getTransactionsForFamilyByMonth, isLoading]);

  if (!currentUser) {
    return <div className="text-center p-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-lg">Vui lòng đăng nhập để xem dashboard.</p></div>;
  }

  const chartConfig = {
    thu: { label: "Thu", color: "hsl(var(--chart-2))" },
    chi: { label: "Chi", color: "hsl(var(--chart-1))" },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];

  const currentMonthName = currentMonthYear ? MONTH_NAMES[new Date(currentMonthYear + '-01').getMonth()] : '';

  const handleWithdrawSuccess = async () => {
    setIsWithdrawModalOpen(false);
    // Re-fetch or re-calculate summary data
    if (currentUser && familyId && currentMonthYear) {
        setIsLoading(true);
        await fetchTransactionsByMonth(familyId, currentMonthYear);
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Chào mừng {currentUser}!</h1>

      {isLoading && transactions.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Đang tải dữ liệu dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <SummaryCard title={`Tổng Thu (${currentMonthName})`} value={summary.totalIncome} icon={TrendingUp} colorClass="text-green-500" />
            <SummaryCard title={`Tổng Chi (${currentMonthName})`} value={summary.totalExpense} icon={TrendingDown} colorClass="text-red-500" />
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-1 relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Số Dư NH ({currentMonthName})</CardTitle>
                    <Landmark className={`h-6 w-6 text-blue-500`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.balanceBank)}
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="absolute top-2 right-2 h-7 text-xs"
                        onClick={() => setIsWithdrawModalOpen(true)}
                    >
                        <ArrowRightLeft className="mr-1 h-3 w-3"/> Rút tiền
                    </Button>
                </CardContent>
            </Card>
            <SummaryCard title={`Số Dư Tiền Mặt (${currentMonthName})`} value={summary.balanceCash} icon={Wallet} colorClass="text-purple-500" />
            <SummaryCard title={`Tổng Số Dư (${currentMonthName})`} value={summary.totalBalance} icon={Banknote} colorClass={summary.totalBalance >= 0 ? "text-indigo-500" : "text-orange-500"} />
          </div>
          <WithdrawCashModal 
            isOpen={isWithdrawModalOpen} 
            onOpenChange={setIsWithdrawModalOpen}
            onSuccess={handleWithdrawSuccess}
            currentBankBalance={summary.balanceBank}
          />

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Thêm Giao Dịch Nhanh</CardTitle>
              <CardDescription>Thêm giao dịch mới hoặc sử dụng ảnh bill.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/transactions">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Thêm Giao Dịch Mới
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/transactions?mode=bill">
                  <Camera className="mr-2 h-5 w-5" />
                  Thêm từ Bill
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tổng Quan Thu Chi 6 Tháng Gần Nhất</CardTitle>
              <CardDescription>Biểu đồ cột so sánh tổng thu và tổng chi của gia đình qua các tháng.</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <RechartsBarChart accessibilityLayer data={monthlyChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="thu" fill="var(--color-thu)" radius={4} />
                    <Bar dataKey="chi" fill="var(--color-chi)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                 <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <BarChart className="h-16 w-16 mb-4" />
                    <p>Không có dữ liệu giao dịch để hiển thị biểu đồ.</p>
                    <p className="text-sm">Hãy thêm giao dịch mới để bắt đầu theo dõi.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <SpendingChatbot />
        </>
      )}
    </div>
  );
}
