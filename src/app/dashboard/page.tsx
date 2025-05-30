
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SpendingChatbot } from '@/components/dashboard/SpendingChatbot';
import { WithdrawCashModal } from '@/components/dashboard/WithdrawCashModal';
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2, Camera, PlusCircle, Landmark, Wallet, ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Transaction } from '@/types';
import { MONTH_NAMES, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID } from '@/lib/constants';
import { format, subMonths } from 'date-fns';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

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
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
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
        
        // Fetch current month data first
        await fetchTransactionsByMonth(familyId, currentMonthYear);

        // Fetch data for the last 5 previous months for the chart, sequentially
        const currentDateObj = new Date(currentMonthYear + '-01'); // Ensure we parse currentMonthYear correctly
        for (let i = 1; i <= 5; i++) { // Fetch 5 previous months
          const dateToFetch = subMonths(currentDateObj, i);
          const monthYearToFetch = format(dateToFetch, 'yyyy-MM');
          // Check if data for this month is already in transactions to avoid redundant fetches,
          // though fetchTransactionsByMonth itself might handle this in its logic
          // For simplicity, we just call it. The store logic should prevent re-fetching if data already exists.
          await fetchTransactionsByMonth(familyId, monthYearToFetch);
        }
        
        // Fetch data for the previous month for chatbot context if needed, sequentially
        const prevMonthForChatbot = format(subMonths(new Date(currentMonthYear + '-01'), 1), 'yyyy-MM');
        await fetchTransactionsByMonth(familyId, prevMonthForChatbot);

        setIsLoading(false);
      };
      loadDashboardData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, currentMonthYear]); // fetchTransactionsByMonth is a stable function from Zustand

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
        // For Bank/Cash balances, include all transactions affecting them
        if (t.type === 'income') {
          if (t.paymentSource === 'bank') incomeBank += t.amount;
          else if (t.paymentSource === 'cash') incomeCash += t.amount;
        } else {
          if (t.paymentSource === 'bank') expenseBank += t.amount;
          else if (t.paymentSource === 'cash') expenseCash += t.amount;
        }

        // For Total Income/Expense, exclude internal transfers
        if (t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID) {
          if (t.type === 'income') {
            totalIncome += t.amount;
          } else {
            totalExpense += t.amount;
          }
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

      // Chart data should also exclude internal transfers for a clearer picture of external income/expense
      const chartData = [];
      const currentDate = new Date(currentMonthYear + "-01T00:00:00"); // Use currentMonthYear as the base for chart
      for (let i = 5; i >= 0; i--) { // Last 6 months including current
        const date = subMonths(currentDate, i);
        const monthYearKey = format(date, 'yyyy-MM');
        const monthTransactions = getTransactionsForFamilyByMonth(familyId, monthYearKey);

        const income = monthTransactions
          .filter(t => t.type === 'income' && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID)
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions
          .filter(t => t.type === 'expense' && t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID)
          .reduce((sum, t) => sum + t.amount, 0);

        chartData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyChartData(chartData);
    } else if (currentUser && familyId && !isLoading) {
      setSummary(initialSummary);
      // If no transactions at all, initialize chart data for 6 months with 0 values
        const chartData = [];
        const currentDate = new Date(currentMonthYear + "-01T00:00:00");
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(currentDate, i);
            chartData.push({
                month: MONTH_NAMES[date.getMonth()],
                thu: 0,
                chi: 0,
            });
        }
        setMonthlyChartData(chartData);
    }
  }, [currentUser, familyId, transactions, currentMonthYear, getTransactionsForFamilyByMonth, isLoading]);

  if (!currentUser) {
    return <div className="text-center p-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-lg">Vui lòng đăng nhập để xem dashboard.</p></div>;
  }

  const chartConfig = {
    thu: { label: "Thu", color: "hsl(var(--chart-2))" },
    chi: { label: "Chi", color: "hsl(var(--chart-1))" },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];

  const currentMonthName = currentMonthYear ? MONTH_NAMES[new Date(currentMonthYear + '-01T00:00:00').getMonth()] : '';

  const handleWithdrawSuccess = async () => {
    setIsWithdrawModalOpen(false);
    // Re-fetch or re-calculate summary data
    if (currentUser && familyId && currentMonthYear) {
        setIsLoading(true);
        await fetchTransactionsByMonth(familyId, currentMonthYear); // Only fetch current month for summary update
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard title={`Tổng Thu Thực (${currentMonthName})`} value={summary.totalIncome} icon={TrendingUp} colorClass="text-green-500" />
            <SummaryCard title={`Tổng Chi Thực (${currentMonthName})`} value={summary.totalExpense} icon={TrendingDown} colorClass="text-red-500" />
            
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 col-span-1 sm:col-span-2 lg:col-span-1">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="balances" className="border-b-0"> {/* Remove border from item if Card handles it */}
                  <AccordionTrigger className="hover:no-underline focus:outline-none w-full text-left p-6 data-[state=open]:pb-2 data-[state=closed]:pb-6 rounded-lg">
                    {/* This div ensures content within trigger is structured before the chevron */}
                    <div className="w-full">
                      <div className="flex flex-row items-center justify-between space-y-0 mb-2"> {/* Simulates CardHeader */}
                        <p className="text-sm font-medium text-muted-foreground">Tổng Số Dư ({currentMonthName})</p>
                        <Banknote className={`h-6 w-6 ${summary.totalBalance >= 0 ? "text-indigo-500" : "text-orange-500"}`} />
                      </div>
                      <div> {/* Simulates CardContent */}
                        <div className="text-2xl font-bold">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.totalBalance)}
                        </div>
                      </div>
                    </div>
                    {/* Default ChevronDown from AccordionTrigger will be placed by its internal flex justify-between */}
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-4 pt-0"> {/* pt-0 because trigger has pb-2 when open */}
                    <div className="space-y-3 border-t pt-4 mt-2"> {/* Added mt-2 for slight separation and border-t */}
                      <Card className="shadow-md bg-background/70">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                          <CardTitle className="text-xs font-medium text-muted-foreground">Số Dư Ngân Hàng</CardTitle>
                          <Landmark className={`h-5 w-5 text-blue-500`} />
                        </CardHeader>
                        <CardContent className="pb-3 pt-0">
                          <div className="text-lg font-semibold">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.balanceBank)}
                          </div>
                           <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-1 h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); setIsWithdrawModalOpen(true);}}
                          >
                              <ArrowRightLeft className="mr-1 h-3 w-3"/> Rút tiền
                          </Button>
                        </CardContent>
                      </Card>
                       <Card className="shadow-md bg-background/70">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
                          <CardTitle className="text-xs font-medium text-muted-foreground">Số Dư Tiền Mặt</CardTitle>
                          <Wallet className={`h-5 w-5 text-purple-500`} />
                        </CardHeader>
                        <CardContent className="pb-3 pt-0">
                           <div className="text-lg font-semibold">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.balanceCash)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
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
              <CardTitle>Tổng Quan Thu Chi 6 Tháng Gần Nhất (Thực tế)</CardTitle>
              <CardDescription>Biểu đồ cột so sánh tổng thu và tổng chi (không tính giao dịch rút/nạp tiền mặt nội bộ) của gia đình qua các tháng.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && monthlyChartData.length === 0 ? (
                 <div className="flex justify-center items-center h-[300px]">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="ml-3">Đang tải dữ liệu biểu đồ...</p>
                 </div>
              ) : monthlyChartData.length > 0 ? (
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

    