
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import type { Transaction, MonthlySummary } from '@/types';
import { MONTH_NAMES } from '@/lib/constants';
import { format, subMonths } from 'date-fns';


const initialSummary: MonthlySummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
};

export default function DashboardPage() {
  const { user, transactions, getTransactionsByUserAndMonth, fetchTransactionsByMonth } = useAuthStore();
  const [summary, setSummary] = useState<MonthlySummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    setCurrentMonthYear(format(now, 'yyyy-MM'));
  }, []);
  
  // Fetch transactions for all relevant months for the chart and current month summary
  useEffect(() => {
    if (user && currentMonthYear) {
      const loadDashboardData = async () => {
        setIsLoading(true);
        const monthsToFetch = new Set<string>();
        monthsToFetch.add(currentMonthYear); // Current month for summary
        
        const currentDate = new Date();
        for (let i = 5; i >= 0; i--) { // Last 6 months for chart
          const date = subMonths(currentDate, i);
          monthsToFetch.add(format(date, 'yyyy-MM'));
        }

        await Promise.all(
          Array.from(monthsToFetch).map(m => fetchTransactionsByMonth(user, m))
        );
        setIsLoading(false);
      };
      loadDashboardData();
    }
  }, [user, currentMonthYear, fetchTransactionsByMonth]);

  // Calculate summary and chart data once transactions (global cache) are updated
  useEffect(() => {
    if (user && transactions.length > 0) { // Rely on the global transactions cache
      // Current month summary
      const currentMonthTransactions = getTransactionsByUserAndMonth(user, currentMonthYear);
      let totalIncome = 0;
      let totalExpense = 0;
      currentMonthTransactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
      });
      setSummary({ totalIncome, totalExpense, balance: totalIncome - totalExpense });

      // Chart data for the last 6 months
      const chartData = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYearKey = format(date, 'yyyy-MM');
        const monthTransactions = getTransactionsByUserAndMonth(user, monthYearKey);
        
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        chartData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyChartData(chartData);
    } else if (user && !isLoading) { // If user exists, not loading, but no transactions
      setSummary(initialSummary);
      setMonthlyChartData([]);
    }
  }, [user, transactions, currentMonthYear, getTransactionsByUserAndMonth, isLoading]);


  if (!user) {
    return <div className="text-center p-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-lg">Vui lòng đăng nhập để xem dashboard.</p></div>;
  }

  const chartConfig = {
    thu: { label: "Thu", color: "hsl(var(--chart-2))" },
    chi: { label: "Chi", color: "hsl(var(--chart-1))" },
  } satisfies Parameters<typeof ChartContainer>[0]["config"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Chào mừng, {user}!</h1>
      
      {isLoading && transactions.length === 0 ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Đang tải dữ liệu dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SummaryCard title="Tổng Thu" value={summary.totalIncome} icon={TrendingUp} colorClass="text-green-500" />
            <SummaryCard title="Tổng Chi" value={summary.totalExpense} icon={TrendingDown} colorClass="text-red-500" />
            <SummaryCard title="Số Dư" value={summary.balance} icon={Banknote} colorClass={summary.balance >= 0 ? "text-blue-500" : "text-orange-500"} />
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Tổng Quan Thu Chi 6 Tháng Gần Nhất</CardTitle>
              <CardDescription>Biểu đồ cột so sánh tổng thu và tổng chi qua các tháng.</CardDescription>
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
        </>
      )}
    </div>
  );
}
