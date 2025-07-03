"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

import { WithdrawCashModal } from '@/components/dashboard/WithdrawCashModal';
import { SharedNotes } from '@/components/dashboard/SharedNotes';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { ScheduleUploader } from '@/components/dashboard/ScheduleUploader';
import { ChangelogModal } from '@/components/dashboard/ChangelogModal';

import dynamic from 'next/dynamic';

// OPTIMIZED: Lazy load calendar component to improve initial page load
const TransactionCalendar = dynamic(
  () => import('@/components/dashboard/TransactionCalendar').then(mod => ({ default: mod.TransactionCalendar })),
  {
    loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg"></div>,
    ssr: false
  }
);
import { BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2, Camera, PlusCircle, Landmark, Wallet, ArrowRightLeft, ChevronDown, RefreshCw, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { useMobileFirst } from '@/hooks/use-mobile-detection';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import { MobileQuickActions, MobilePullToRefresh } from '@/components/mobile/MobileQuickActions';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

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
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, forceRefreshTransactions } = useAuthStore();
  const { toast } = useToast();
  const { showMobileUI, isMobile } = useMobileFirst();
  const { workSchedules } = useWorkSchedules();
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotifications, setUploadNotifications] = useState<any[]>([]);

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

  // Mobile view
  if (showMobileUI) {
    return (
      <div className="relative">
        <MobilePullToRefresh 
          onRefresh={handleRefreshDashboard} 
          isRefreshing={isRefreshing}
        />
        
        <MobileDashboard
          summary={summary}
          onRefresh={handleRefreshDashboard}
          isRefreshing={isRefreshing}
          currentUser={currentUser}
        />

        <MobileQuickActions
          onAddTransaction={() => window.location.href = '/transactions'}
          onAddFromBill={() => window.location.href = '/transactions?mode=bill'}
          onSearch={() => window.location.href = '/transactions'}
          onFilter={() => window.location.href = '/transactions'}
        />
      </div>
    );
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
        try {
          // Force refresh all transactions from Firestore to ensure balance is updated
          await forceRefreshTransactions();
          // Then load all months data
          await loadAllDashboardData();
        } catch (error) {
          console.error('Error refreshing after withdrawal:', error);
          toast({
            title: "Lỗi refresh",
            description: "Có lỗi khi cập nhật số dư. Vui lòng thử refresh trang.",
            variant: "destructive",
          });
        }
        setIsLoading(false);
    }
  };

  const addUploadNotification = (result: any) => {
    const notification = {
      id: `upload-${Date.now()}`,
      type: 'success',
      title: '🤖 AI Lịch Upload Thành Công',
      message: `Đã thêm ${result.summary?.totalShifts || 0} ca làm việc cho ${result.summary?.employee || 'Minh Hiếu'} - Tháng ${result.summary?.month}/${result.summary?.year}`,
      timestamp: new Date(),
      isRead: false,
      priority: 'high',
      details: result.notifications || []
    };
    
    setUploadNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    
    // Show toast notification
    toast({
      title: "🎉 Upload lịch thành công!",
      description: `Đã thêm ${result.summary?.totalShifts || 0} ca làm việc tháng ${result.summary?.month}/${result.summary?.year}`,
    });
  };

  return (
    <div className="space-y-6 section-spacing-fhd container-fhd">
      {/* Main Content - Now takes full width */}
      <div className="space-y-6 element-spacing-fhd">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight">Chào {currentUser}!</h1>
          <p className="text-muted-foreground text-base xl:text-lg 2xl:text-xl">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}</p>
        </div>
        <div className="flex gap-3">
          {/* Calendar Button with Modal */}
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                size="lg"
                className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700 hover:from-emerald-100 hover:to-teal-100 btn-fhd text-base xl:text-lg shadow-fhd"
              >
                <Calendar className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
                Lịch gia đình
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto p-0">
              <DialogHeader className="px-4 py-2 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
                <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  Lịch Gia Đình Thông Minh
                </DialogTitle>
              </DialogHeader>
              <div className="p-2">
                <TransactionCalendar onUploadSuccess={addUploadNotification} />
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            onClick={() => setIsChangelogModalOpen(true)} 
            variant="outline"
            size="lg"
            className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100 btn-fhd text-base xl:text-lg shadow-fhd"
          >
            <Sparkles className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
            Có gì mới
          </Button>
          
          <Button 
            onClick={handleRefreshDashboard} 
            disabled={isLoading || isRefreshing} 
            variant="outline"
            size="lg"
            className="btn-fhd text-base xl:text-lg shadow-fhd"
          >
            {isRefreshing ? (
              <Loader2 className="h-5 w-5 xl:h-6 xl:w-6 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
            )}
            Làm mới
          </Button>
          
          <Button 
            onClick={async () => {
              setIsLoading(true);
              try {
                await forceRefreshTransactions();
                await loadAllDashboardData();
                toast({
                  title: "✅ Force Refresh hoàn thành",
                  description: "Đã làm mới toàn bộ dữ liệu từ server",
                });
              } catch (error) {
                toast({
                  title: "❌ Lỗi Force Refresh",
                  description: "Không thể làm mới dữ liệu",
                  variant: "destructive",
                });
              }
              setIsLoading(false);
            }}
            disabled={isLoading || isRefreshing} 
            variant="outline"
            size="lg"
            title="Làm mới hoàn toàn từ server (dùng khi số dư không đúng)"
            className="btn-fhd text-base xl:text-lg shadow-fhd"
          >
            🔄 Fix số dư
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/transactions'}
            size="lg"
            className="btn-fhd-large text-base xl:text-lg shadow-fhd"
          >
            <PlusCircle className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 xl:gap-8 animate-slide-up dashboard-grid-fhd">
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
                title="Ngân hàng"
                value={formatCurrency(summary.balanceBank)} 
                variant="bank"
              />
              <SummaryCard 
                title="Tổng số dư"
                value={formatCurrency(summary.totalBalance)} 
                variant="balance"
              />
            </div>

            {/* Tiền mặt card và quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
              <Card className="bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 border-2 border-purple-200/50 card-fhd shadow-fhd hover:shadow-xl transition-all duration-300 hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 card-header-fhd">
                  <CardTitle className="text-lg xl:text-xl font-bold text-purple-800 summary-card-title-fhd">
                    💵 Tiền mặt
                  </CardTitle>
                  <div className="p-3 xl:p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg">
                    <Wallet className="h-6 w-6 xl:h-8 xl:w-8 text-white icon-md-fhd" />
                  </div>
                </CardHeader>
                <CardContent className="card-content-fhd">
                  <div className="text-2xl xl:text-4xl 2xl:text-5xl font-bold bg-gradient-to-r from-purple-700 to-violet-600 bg-clip-text text-transparent mb-3 summary-card-value-fhd">
                    {formatCurrency(summary.balanceCash)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 border-2 border-blue-200/50 card-fhd shadow-fhd hover:shadow-xl transition-all duration-300 hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 card-header-fhd">
                  <CardTitle className="text-lg xl:text-xl font-bold text-blue-800 summary-card-title-fhd">
                    🏦 Rút tiền nhanh
                  </CardTitle>
                  <div className="p-3 xl:p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                    <ArrowRightLeft className="h-6 w-6 xl:h-8 xl:w-8 text-white icon-md-fhd" />
                  </div>
                </CardHeader>
                <CardContent className="card-content-fhd">
                  <Button 
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 border-0 btn-fhd text-base xl:text-lg shadow-fhd transition-all duration-300 hover:shadow-lg"
                    variant="outline"
                  >
                    <ArrowRightLeft className="h-4 w-4 xl:h-6 xl:w-6 mr-2" />
                    Rút tiền từ ngân hàng
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 border-2 border-emerald-200/50 card-fhd shadow-fhd hover:shadow-xl transition-all duration-300 hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 card-header-fhd">
                  <CardTitle className="text-lg xl:text-xl font-bold text-emerald-800 summary-card-title-fhd">
                    ⚡ Thêm nhanh
                  </CardTitle>
                  <div className="p-3 xl:p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                    <PlusCircle className="h-6 w-6 xl:h-8 xl:w-8 text-white icon-md-fhd" />
                  </div>
                </CardHeader>
                <CardContent className="card-content-fhd">
                  <div className="flex gap-3 xl:gap-4">
                    <Button 
                      asChild 
                      size="sm" 
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 border-0 btn-fhd text-sm xl:text-base shadow-fhd transition-all duration-300 hover:shadow-lg"
                      variant="outline"
                    >
                      <Link href="/transactions">
                        Giao dịch
                      </Link>
                    </Button>
                    <Button 
                      asChild 
                      size="sm" 
                      variant="outline"
                      className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 border-0 btn-fhd text-sm xl:text-base shadow-fhd transition-all duration-300 hover:shadow-lg"
                    >
                      <Link href="/transactions?mode=bill">
                        <Camera className="h-4 w-4 xl:h-5 xl:w-5 mr-1" />
                        Bill
                      </Link>
                    </Button>
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

            <ChangelogModal 
              isOpen={isChangelogModalOpen} 
              onClose={() => setIsChangelogModalOpen(false)}
            />

                        <SharedNotes />

            <NotificationCenter 
              workSchedules={workSchedules} 
              uploadNotifications={uploadNotifications}
            />



            <Card className="shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 border-2 border-blue-100/50 hover:shadow-3xl transition-all duration-500 hover-lift">
              <CardHeader className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-t-xl border-b border-blue-100/50">
                <CardTitle className="text-2xl xl:text-3xl 2xl:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent flex items-center gap-4">
                  <div className="p-3 xl:p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                    <BarChart className="h-7 w-7 xl:h-9 xl:w-9 text-white" />
                  </div>
                  📊 Tổng Quan Thu Chi 6 Tháng
                </CardTitle>
                <CardDescription className="text-base xl:text-lg text-blue-700/80 font-medium">
                  Biểu đồ so sánh thu nhập và chi tiêu của gia đình qua các tháng (không tính giao dịch nội bộ)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8 xl:p-12">
                {(isLoading || isRefreshing) && monthlyChartData.length === 0 ? (
                   <div className="flex justify-center items-center h-[300px] xl:h-[400px]">
                      <Loader2 className="h-10 w-10 xl:h-12 xl:w-12 animate-spin text-blue-600" />
                      <p className="ml-3 text-lg xl:text-xl text-blue-700 font-medium">Đang tải dữ liệu biểu đồ...</p>
                   </div>
                ) : monthlyChartData.length > 0 ? (
                  <ChartContainer config={chartConfig} className="h-[450px] xl:h-[500px] 2xl:h-[600px] w-full chart-container-fhd">
                    <RechartsBarChart accessibilityLayer data={monthlyChartData}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        tickMargin={15}
                        axisLine={false}
                        tick={{ fontSize: 14, fontWeight: 600, fill: '#475569' }}
                      />
                      <YAxis
                        tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="thu" fill="var(--color-thu)" radius={6} />
                      <Bar dataKey="chi" fill="var(--color-chi)" radius={6} />
                    </RechartsBarChart>
                  </ChartContainer>
                ) : (
                   <div className="flex flex-col items-center justify-center h-[300px] xl:h-[400px] text-blue-600/70">
                      <div className="p-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full mb-6">
                        <BarChart className="h-16 w-16 xl:h-20 xl:w-20 text-blue-600" />
                      </div>
                      <p className="text-lg xl:text-xl font-semibold text-blue-700 mb-2">Chưa có dữ liệu biểu đồ</p>
                      <p className="text-base xl:text-lg text-blue-600/80">Hãy thêm giao dịch mới để bắt đầu theo dõi tài chính gia đình</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New section for additional features */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 mt-8">
              <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover-lift">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent flex items-center gap-4">
                    <div className="p-3 xl:p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                      <TrendingUp className="h-6 w-6 xl:h-8 xl:w-8 text-white" />
                    </div>
                    📈 Phân Tích Tài Chính
                  </CardTitle>
                  <CardDescription className="text-base xl:text-lg text-indigo-700/80 font-medium">
                    Thống kê chi tiêu theo danh mục và xu hướng tiết kiệm
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 xl:space-y-6">
                  <div className="flex justify-between items-center p-4 xl:p-5 bg-gradient-to-r from-white/80 to-indigo-50/80 rounded-xl border border-indigo-100">
                    <span className="text-base xl:text-lg font-semibold text-indigo-800">💰 Tỷ lệ tiết kiệm</span>
                    <span className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {summary.totalIncome > 0 ? 
                        `${((summary.totalIncome - summary.totalExpense) / summary.totalIncome * 100).toFixed(1)}%` 
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 xl:p-5 bg-gradient-to-r from-white/80 to-indigo-50/80 rounded-xl border border-indigo-100">
                    <span className="text-base xl:text-lg font-semibold text-indigo-800">📅 Chi tiêu/ngày</span>
                    <span className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {formatCurrency(Math.round(summary.totalExpense / 30))}
                    </span>
                  </div>
                  <Button 
                    asChild 
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white btn-fhd text-base xl:text-lg shadow-fhd transition-all duration-300 hover:shadow-lg"
                  >
                    <Link href="/reports">
                      <BarChart className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
                      Xem báo cáo chi tiết
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border-2 border-rose-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 hover-lift">
                <CardHeader className="pb-6">
                  <CardTitle className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-rose-700 to-orange-600 bg-clip-text text-transparent flex items-center gap-4">
                    <div className="p-3 xl:p-4 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl shadow-lg">
                      <Banknote className="h-6 w-6 xl:h-8 xl:w-8 text-white" />
                    </div>
                    🏦 Quản Lý Khoản Vay
                  </CardTitle>
                  <CardDescription className="text-base xl:text-lg text-rose-700/80 font-medium">
                    Theo dõi các khoản vay và kế hoạch trả nợ
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 xl:space-y-6">
                  <div className="flex justify-between items-center p-4 xl:p-5 bg-gradient-to-r from-white/80 to-rose-50/80 rounded-xl border border-rose-100">
                    <span className="text-base xl:text-lg font-semibold text-rose-800">💳 Tổng khoản vay</span>
                    <span className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">0₫</span>
                  </div>
                  <div className="flex justify-between items-center p-4 xl:p-5 bg-gradient-to-r from-white/80 to-rose-50/80 rounded-xl border border-rose-100">
                    <span className="text-base xl:text-lg font-semibold text-rose-800">📆 Cần trả tháng này</span>
                    <span className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-rose-600 to-orange-600 bg-clip-text text-transparent">0₫</span>
                  </div>
                  <Button 
                    asChild 
                    className="w-full bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-600 hover:to-orange-700 text-white btn-fhd text-base xl:text-lg shadow-fhd transition-all duration-300 hover:shadow-lg"
                  >
                    <Link href="/loans">
                      <Banknote className="h-5 w-5 xl:h-6 xl:w-6 mr-2" />
                      Quản lý khoản vay
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
