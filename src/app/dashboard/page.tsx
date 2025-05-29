"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import type { Transaction, MonthlySummary } from '@/types';
import { MONTH_NAMES } from '@/lib/constants';

const initialSummary: MonthlySummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
};

export default function DashboardPage() {
  const { user, getTransactionsByUserAndMonth } = useAuthStore();
  const [summary, setSummary] = useState<MonthlySummary>(initialSummary);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed
    setCurrentMonthYear(`${year}-${String(month).padStart(2, '0')}`);
  }, []);
  
  useEffect(() => {
    if (user && currentMonthYear) {
      const transactions = getTransactionsByUserAndMonth(user, currentMonthYear);
      
      let totalIncome = 0;
      let totalExpense = 0;
      transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
      });
      setSummary({ totalIncome, totalExpense, balance: totalIncome - totalExpense });

      // For chart: Aggregate data for the last 6 months (mock/simplified)
      const chartData = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthTransactions = getTransactionsByUserAndMonth(user, monthYear);
        
        const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        
        chartData.push({
          month: MONTH_NAMES[date.getMonth()],
          thu: income,
          chi: expense,
        });
      }
      setMonthlyData(chartData);
    }
  }, [user, getTransactionsByUserAndMonth, currentMonthYear]);

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
          {monthlyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <RechartsBarChart accessibilityLayer data={monthlyData}>
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
      
      {/* Placeholder for more charts or data visualizations */}
      {/* <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Phân Bố Chi Tiêu Theo Danh Mục</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Biểu đồ tròn hiển thị tỷ lệ chi tiêu cho từng danh mục (sắp có).</p>
        </CardContent>
      </Card> */}
    </div>
  );
}
