"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

import { WithdrawCashModal } from '@/components/dashboard/WithdrawCashModal';
import { SharedNotes } from '@/components/dashboard/SharedNotes';
import dynamic from 'next/dynamic';

// OPTIMIZED: Lazy load calendar component to improve initial page load
const TransactionCalendar = dynamic(
  () => import('@/components/dashboard/TransactionCalendar').then(mod => ({ default: mod.TransactionCalendar })),
  {
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>,
    ssr: false
  }
);
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2, Camera, PlusCircle, Landmark, Wallet, ArrowRightLeft, ChevronDown, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { Transaction } from '@/types';
import { MONTH_NAMES, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID } from '@/lib/constants';
import { format, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { BackupService } from '@/lib/backup';
import { useToast } from '@/hooks/use-toast';

interface DashboardSummary {
  totalIncome: number; // All-time total income
  totalExpense: number; // All-time total expense
  balanceBank: number; // Overall
  balanceCash: number; // Overall
  totalBalance: number; // Overall
}

const initialSummary: DashboardSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balanceBank: 0,
  balanceCash: 0,
  totalBalance: 0,
};

// Utility function for formatting currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function DashboardPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth } = useAuthStore();
  const { toast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setCurrentMonthYear(format(now, 'yyyy-MM'));
  }, []);

  const loadAllDashboardData = useCallback(async () => {
    if (!currentUser || !familyId || !currentMonthYear) return;
    
    setIsLoading(true);
    
    // Check and perform auto backup if needed (ngày 4 và 22 hàng tháng)
    try {
      const checkAutoBackup = async () => {
        if (currentUser && familyId) {
          const isBackupDay = BackupService.isScheduledBackupDay();
          const hasBackedUp = BackupService.hasAutoBackupToday();
          
          if (isBackupDay && !hasBackedUp) {
            toast({
              title: "🔄 Auto Backup",
              description: "Đang thực hiện backup tự động...",
            });
            
            const success = await BackupService.checkAndPerformAutoBackup(familyId, currentUser);
            
            if (success) {
              toast({
                title: "✅ Auto Backup hoàn thành",
                description: "File backup đã được tải xuống tự động",
              });
            }
          }
        }
      };

      await checkAutoBackup();
    } catch (error) {
      console.warn('Auto backup failed, but continuing with data load:', error);
    }
    
    // Fetch current month data first (priority)
    await fetchTransactionsByMonth(familyId, currentMonthYear);

    // OPTIMIZED: Fetch multiple months in parallel using Promise.all
    // Split into chunks to avoid overwhelming the API
    const currentDateObj = new Date(currentMonthYear + '-01');
    const chunkSize = 12; // Fetch 12 months at a time
    const totalMonths = 36; // Reduced from 60 to 36 months (3 years) for better performance
    
    for (let chunkStart = 1; chunkStart <= totalMonths; chunkStart += chunkSize) {
      const chunkEnd = Math.min(chunkStart + chunkSize - 1, totalMonths);
      const chunkPromises = [];
      
      for (let i = chunkStart; i <= chunkEnd; i++) {
        const dateToFetch = subMonths(currentDateObj, i);
        const monthYearToFetch = format(dateToFetch, 'yyyy-MM');
        chunkPromises.push(fetchTransactionsByMonth(familyId, monthYearToFetch));
      }
      
      // Process chunk in parallel
      await Promise.all(chunkPromises);
    }

    setIsLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, familyId, currentMonthYear]); // fetchTransactionsByMonth is stable

  useEffect(() => {
    loadAllDashboardData();
  }, [loadAllDashboardData]); 

  // OPTIMIZED: Memoize calculations to avoid recalculating on every render
  const calculatedSummary = useMemo(() => {
    if (!currentUser || !familyId || transactions.length === 0) {
      return initialSummary;
    }

    // Calculate all-time totals from ALL transactions in the store
    let allTimeTotalIncome = 0;
    let allTimeTotalExpense = 0;
    let allTimeIncomeBank = 0;
    let allTimeExpenseBank = 0;
    let allTimeIncomeCash = 0;
    let allTimeExpenseCash = 0;

    transactions.forEach(t => {
      // Skip internal transfers for total income/expense calculation
      if (t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID) {
        if (t.type === 'income') {
          allTimeTotalIncome += t.amount;
        } else {
          allTimeTotalExpense += t.amount;
        }
      }

      // Calculate by payment source for balance breakdown
      if (t.type === 'income') {
        if (t.paymentSource === 'bank') allTimeIncomeBank += t.amount;
        else if (t.paymentSource === 'cash') allTimeIncomeCash += t.amount;
      } else { // expense
        if (t.paymentSource === 'bank') allTimeExpenseBank += t.amount;
        else if (t.paymentSource === 'cash') allTimeExpenseCash += t.amount;
      }
    });

    const allTimeBalanceBank = allTimeIncomeBank - allTimeExpenseBank;
    const allTimeBalanceCash = allTimeIncomeCash - allTimeExpenseCash;
    const allTimeTotalBalance = allTimeBalanceBank + allTimeBalanceCash;

    return {
      totalIncome: allTimeTotalIncome,
      totalExpense: allTimeTotalExpense,
      balanceBank: allTimeBalanceBank,
      balanceCash: allTimeBalanceCash,
      totalBalance: allTimeTotalBalance,
    };
  }, [currentUser, familyId, transactions]);

  // OPTIMIZED: Memoize chart data calculation
  const calculatedChartData = useMemo(() => {
    if (!currentUser || !familyId || !currentMonthYear) {
      return [];
    }

    const chartData = [];
    const chartBaseDate = new Date(currentMonthYear + "-01T00:00:00");
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(chartBaseDate, i);
      const monthYearKey = format(date, 'yyyy-MM');
      const monthTransactionsForChart = getTransactionsForFamilyByMonth(familyId, monthYearKey);

      const incomeForChart = monthTransactionsForChart
        .filter(t => t.type === 'income' && t.categoryId !== NAP_TIEN_MAT_CATEGORY_ID)
        .reduce((sum, t) => sum + t.amount, 0);
      const expenseForChart = monthTransactionsForChart
        .filter(t => t.type === 'expense' && t.categoryId !== RUT_TIEN_MAT_CATEGORY_ID)
        .reduce((sum, t) => sum + t.amount, 0);

      chartData.push({
        month: MONTH_NAMES[date.getMonth()],
        thu: incomeForChart,
        chi: expenseForChart,
      });
    }
    
    return chartData;
  }, [currentUser, familyId, currentMonthYear, getTransactionsForFamilyByMonth]);

  // Update state when memoized values change
  useEffect(() => {
    setSummary(calculatedSummary);
  }, [calculatedSummary]);

  useEffect(() => {
    setMonthlyChartData(calculatedChartData);
  }, [calculatedChartData]);

  const handleRefreshDashboard = useCallback(async () => {
    // OPTIMIZED: Debounce refresh to prevent rapid successive calls
    const now = Date.now();
    if (now - lastRefreshTime < 2000) { // Prevent refresh if less than 2 seconds ago
      toast({
        title: "Thông báo",
        description: "Vui lòng đợi 2 giây trước khi làm mới lại",
        variant: "default",
      });
      return;
    }
    
    setIsRefreshing(true);
    setLastRefreshTime(now);
    await loadAllDashboardData();
    setIsRefreshing(false);
  }, [lastRefreshTime, loadAllDashboardData, toast]);

  if (!currentUser) {
    return <div className="text-center p-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4 text-lg">Vui lòng đăng nhập để xem dashboard.</p></div>;
  }

  const chartConfig = {
    thu: { label: "Thu", color: "hsl(var(--chart-2))" },
    chi: { label: "Chi", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;

  const currentMonthName = currentMonthYear ? MONTH_NAMES[new Date(currentMonthYear + '-01T00:00:00').getMonth()] : '';

  const handleWithdrawSuccess = async () => {
    setIsWithdrawModalOpen(false);
    if (currentUser && familyId && currentMonthYear) {
        setIsLoading(true);
        // Re-fetch current month as withdrawal affects current month, 
        // and all-time balance is recalculated from `transactions` state which will include this new data.
        await fetchTransactionsByMonth(familyId, currentMonthYear); 
        setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content - Takes more space */}
      <div className="w-3/5 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chào {currentUser}!</h1>
          <p className="text-muted-foreground">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleRefreshDashboard} 
            disabled={isLoading || isRefreshing} 
            variant="outline"
            size="lg"
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-5 w-5 mr-2" />
            )}
            Làm mới
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/transactions'}
            size="lg"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Thêm giao dịch
          </Button>
        </div>
      </div>

      {isLoading && transactions.length === 0 && !isRefreshing ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Đang tải dữ liệu dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-slide-up">
              <SummaryCard 
                title={`Tổng thu nhập`} 
                value={formatCurrency(summary.totalIncome)} 
                variant="income"
                trend={summary.totalIncome > 0 ? { value: 12.5, isPositive: true } : undefined}
              />
              <SummaryCard 
                title={`Tổng chi tiêu`} 
                value={formatCurrency(summary.totalExpense)} 
                variant="expense"
                trend={summary.totalExpense > 0 ? { value: 8.2, isPositive: false } : undefined}
              />
              <SummaryCard 
                title="Tổng số dư"
                value={formatCurrency(summary.totalBalance)} 
                variant="balance"
              />
            </div>

            {/* Mobile Balance Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Ngân hàng
                  </CardTitle>
                  <Landmark className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold mb-2">
                    {new Intl.NumberFormat('vi-VN', { 
                      style: 'currency', 
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(summary.balanceBank)}
                  </div>
                  <button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="mobile-button bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 w-full"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Rút tiền
                  </button>
                </CardContent>
              </Card>

              <Card className="mobile-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tiền mặt
                  </CardTitle>
                  <Wallet className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-bold">
                    {new Intl.NumberFormat('vi-VN', { 
                      style: 'currency', 
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(summary.balanceCash)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <WithdrawCashModal 
              isOpen={isWithdrawModalOpen} 
              onOpenChange={setIsWithdrawModalOpen}
              onSuccess={handleWithdrawSuccess}
              currentBankBalance={summary.balanceBank}
            />

            <SharedNotes />

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
                {(isLoading || isRefreshing) && monthlyChartData.length === 0 ? (
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


          </>
        )}
      </div>

      {/* Calendar Sidebar - Right side, moderate size */}
      <div className="hidden lg:block w-2/5">
        <div className="sticky top-6">
          <TransactionCalendar />
        </div>
      </div>
      
      {/* Mobile Calendar - shown in a modal or separate section */}
      <div className="lg:hidden">
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Lịch Giao Dịch</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionCalendar />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
