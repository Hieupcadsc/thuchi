
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link'; // Added Link
import { useAuthStore, FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { SpendingChatbot } from '@/components/dashboard/SpendingChatbot'; 
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2, Camera, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Added Button
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { MonthlySummary } from '@/types';
import { MONTH_NAMES } from '@/lib/constants';
import { format, subMonths } from 'date-fns';

const initialSummary: MonthlySummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
};

export default function DashboardPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
  const [summary, setSummary] = useState<MonthlySummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

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
    if (currentUser && familyId && transactions.length > 0) { 
      const currentMonthTransactions = getTransactionsForFamilyByMonth(familyId, currentMonthYear);
      let totalIncome = 0;
      let totalExpense = 0;
      currentMonthTransactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
      });
      setSummary({ totalIncome, totalExpense, balance: totalIncome - totalExpense });

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SummaryCard title={`Tổng Thu (${MONTH_NAMES[new Date(currentMonthYear + '-01').getMonth()]})`} value={summary.totalIncome} icon={TrendingUp} colorClass="text-green-500" />
            <SummaryCard title={`Tổng Chi (${MONTH_NAMES[new Date(currentMonthYear + '-01').getMonth()]})`} value={summary.totalExpense} icon={TrendingDown} colorClass="text-red-500" />
            <SummaryCard title={`Số Dư (${MONTH_NAMES[new Date(currentMonthYear + '-01').getMonth()]})`} value={summary.balance} icon={Banknote} colorClass={summary.balance >= 0 ? "text-blue-500" : "text-orange-500"} />
          </div>
          
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
                <Link href="/transactions?mode=bill"> {/* Later we can use this query param */}
                  <Camera className="mr-2 h-5 w-5" />
                  Thêm từ Bill (Sắp ra mắt)
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

