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

const TransactionCalendar = dynamic(
  () => import('@/components/dashboard/TransactionCalendar').then(mod => ({ default: mod.TransactionCalendar })),
  { loading: () => <div className="h-96 bg-muted animate-pulse rounded-xl" />, ssr: false }
);

import {
  BarChart, TrendingUp, TrendingDown, Banknote, AlertTriangle, Loader2,
  Camera, PlusCircle, Landmark, Wallet, ArrowRightLeft, RefreshCw,
  Sparkles, Calendar, Eye, EyeOff,
} from 'lucide-react';
import { DemoIndicator } from '@/components/ui/demo-indicator';
import { DEMO_USER } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { Transaction } from '@/types';
import { MONTH_NAMES, RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID, DIEU_CHINH_SO_DU_CATEGORY_ID } from '@/lib/constants';
import { format, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BackupService } from '@/lib/backup';
import { useToast } from '@/hooks/use-toast';
import { useMobileFirst } from '@/hooks/use-mobile-detection';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';
import { MobileQuickActions, MobilePullToRefresh } from '@/components/mobile/MobileQuickActions';
import { useWorkSchedules } from '@/hooks/useWorkSchedules';

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  balanceBank: number;
  balanceCash: number;
  totalBalance: number;
}

const initialSummary: DashboardSummary = {
  totalIncome: 0, totalExpense: 0, balanceBank: 0, balanceCash: 0, totalBalance: 0,
};

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

export default function DashboardPage() {
  const { currentUser, familyId, transactions, getTransactionsForFamilyByMonth, fetchTransactionsByMonth, forceRefreshTransactions } = useAuthStore();
  const { toast } = useToast();
  const { showMobileUI } = useMobileFirst();
  const { workSchedules } = useWorkSchedules();
  const [summary, setSummary] = useState<DashboardSummary>(initialSummary);
  const [monthlyChartData, setMonthlyChartData] = useState<any[]>([]);
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [uploadNotifications, setUploadNotifications] = useState<any[]>([]);

  useEffect(() => { setCurrentMonthYear(format(new Date(), 'yyyy-MM')); }, []);

  const loadAllDashboardData = useCallback(async () => {
    if (!currentUser || !familyId || !currentMonthYear) return;
    setIsLoading(true);
    try {
      const isBackupDay = BackupService.isScheduledBackupDay();
      const hasBackedUp = BackupService.hasAutoBackupToday();
      if (isBackupDay && !hasBackedUp) {
        await BackupService.checkAndPerformAutoBackup(familyId, currentUser);
      }
    } catch {}
    await fetchTransactionsByMonth(familyId, currentMonthYear);
    const base = new Date(currentMonthYear + '-01');
    for (let start = 1; start <= 36; start += 12) {
      await Promise.all(
        Array.from({ length: Math.min(12, 36 - start + 1) }, (_, i) =>
          fetchTransactionsByMonth(familyId, format(subMonths(base, start + i), 'yyyy-MM'))
        )
      );
    }
    setIsLoading(false);
  }, [currentUser, familyId, currentMonthYear]);

  useEffect(() => { loadAllDashboardData(); }, [loadAllDashboardData]);

  const calculatedSummary = useMemo(() => {
    if (!currentUser || transactions.length === 0) return initialSummary;
    const stats = transactions.filter(t => ![RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID, DIEU_CHINH_SO_DU_CATEGORY_ID].includes(t.categoryId));
    const sum = (txs: any[], type: 'income' | 'expense', src?: 'bank' | 'cash') =>
      txs.filter(t => t.type === type && (src ? t.paymentSource === src : true)).reduce((s, t) => s + t.amount, 0);
    return {
      totalIncome: sum(stats, 'income'),
      totalExpense: sum(stats, 'expense'),
      balanceBank: sum(transactions, 'income', 'bank') - sum(transactions, 'expense', 'bank'),
      balanceCash: sum(transactions, 'income', 'cash') - sum(transactions, 'expense', 'cash'),
      totalBalance: sum(transactions, 'income', 'bank') - sum(transactions, 'expense', 'bank') +
                    sum(transactions, 'income', 'cash') - sum(transactions, 'expense', 'cash'),
    };
  }, [currentUser, transactions]);

  const calculatedChartData = useMemo(() => {
    if (!currentUser || !familyId || !currentMonthYear) return [];
    const base = new Date(currentMonthYear + '-01T00:00:00');
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(base, 5 - i);
      const key = format(d, 'yyyy-MM');
      const txs = getTransactionsForFamilyByMonth(familyId, key);
      return {
        month: MONTH_NAMES[d.getMonth()],
        thu: txs.filter(t => t.type === 'income' && ![NAP_TIEN_MAT_CATEGORY_ID, DIEU_CHINH_SO_DU_CATEGORY_ID].includes(t.categoryId)).reduce((s, t) => s + t.amount, 0),
        chi: txs.filter(t => t.type === 'expense' && ![RUT_TIEN_MAT_CATEGORY_ID, DIEU_CHINH_SO_DU_CATEGORY_ID].includes(t.categoryId)).reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [currentUser, familyId, currentMonthYear, getTransactionsForFamilyByMonth]);

  const monthlyTotals = useMemo(() => {
    if (!currentUser || transactions.length === 0) return { income: 0, expense: 0 };
    const key = format(new Date(), 'yyyy-MM');
    const txs = transactions.filter(t => t.date.startsWith(key) && ![RUT_TIEN_MAT_CATEGORY_ID, NAP_TIEN_MAT_CATEGORY_ID, DIEU_CHINH_SO_DU_CATEGORY_ID].includes(t.categoryId));
    return {
      income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    };
  }, [currentUser, transactions]);

  useEffect(() => { setSummary(calculatedSummary); }, [calculatedSummary]);
  useEffect(() => { setMonthlyChartData(calculatedChartData); }, [calculatedChartData]);

  const handleRefreshDashboard = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 2000) {
      toast({ title: "Thông báo", description: "Vui lòng đợi 2 giây trước khi làm mới lại" });
      return;
    }
    setIsRefreshing(true);
    setLastRefreshTime(now);
    await loadAllDashboardData();
    setIsRefreshing(false);
  }, [lastRefreshTime, loadAllDashboardData, toast]);

  const handleWithdrawSuccess = async () => {
    setIsWithdrawModalOpen(false);
    setIsLoading(true);
    try {
      await forceRefreshTransactions();
      await loadAllDashboardData();
    } catch {
      toast({ title: "Lỗi refresh", description: "Có lỗi khi cập nhật số dư.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  function addUploadNotification(result: any) {
    setUploadNotifications(prev => [{
      id: `upload-${Date.now()}`,
      type: 'success',
      title: '🤖 AI Lịch Upload Thành Công',
      message: `Đã thêm ${result.summary?.totalShifts || 0} ca làm việc cho ${result.summary?.employee || 'Minh Hiếu'} - Tháng ${result.summary?.month}/${result.summary?.year}`,
      timestamp: new Date(),
      isRead: false,
      priority: 'high',
      details: result.notifications || [],
    }, ...prev.slice(0, 4)]);
    toast({ title: '🎉 Upload lịch thành công!', description: `Đã thêm ${result.summary?.totalShifts || 0} ca tháng ${result.summary?.month}/${result.summary?.year}` });
  }

  if (!currentUser) {
    return <div className="text-center p-8"><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /><p className="mt-4">Vui lòng đăng nhập.</p></div>;
  }

  if (showMobileUI) {
    return (
      <div className="relative">
        <MobilePullToRefresh onRefresh={handleRefreshDashboard} isRefreshing={isRefreshing} />
        <MobileDashboard summary={summary} onRefresh={handleRefreshDashboard} isRefreshing={isRefreshing} currentUser={currentUser} />
        <MobileQuickActions
          onAddTransaction={() => window.location.href = '/transactions'}
          onAddFromBill={() => window.location.href = '/transactions?mode=bill'}
          onSearch={() => window.location.href = '/transactions'}
          onFilter={() => window.location.href = '/transactions'}
          onCalendar={() => setIsCalendarModalOpen(true)}
        />
        <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto p-0">
            <DialogHeader className="px-4 py-2 border-b">
              <DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Lịch Gia Đình</DialogTitle>
            </DialogHeader>
            <div className="p-2"><TransactionCalendar onUploadSuccess={addUploadNotification} /></div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const chartConfig = {
    thu: { label: "Thu nhập", color: "hsl(142 71% 45%)" },
    chi: { label: "Chi tiêu", color: "hsl(0 84% 60%)" },
  } satisfies ChartConfig;

  const savingsRate = summary.totalIncome > 0
    ? ((summary.totalIncome - summary.totalExpense) / summary.totalIncome * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-5">
      {currentUser === DEMO_USER && <DemoIndicator />}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chào, {currentUser}!</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowBalances(!showBalances)} className="gap-1.5">
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showBalances ? 'Ẩn' : 'Hiện'}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Calendar className="h-4 w-4" />Lịch gia đình
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto p-0">
              <DialogHeader className="px-4 py-3 border-b">
                <DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" />Lịch Gia Đình</DialogTitle>
              </DialogHeader>
              <div className="p-3"><TransactionCalendar onUploadSuccess={addUploadNotification} /></div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={() => setIsChangelogModalOpen(true)} className="gap-1.5">
            <Sparkles className="h-4 w-4" />Có gì mới
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshDashboard} disabled={isLoading || isRefreshing} className="gap-1.5">
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Làm mới
          </Button>
          <Button variant="outline" size="sm" disabled={isLoading || isRefreshing}
            onClick={async () => {
              setIsLoading(true);
              try { await forceRefreshTransactions(); await loadAllDashboardData(); toast({ title: "✅ Force Refresh xong" }); }
              catch { toast({ title: "❌ Lỗi", variant: "destructive" }); }
              setIsLoading(false);
            }}
            className="gap-1.5"
          >
            🔄 Fix số dư
          </Button>
          <Button size="sm" onClick={() => window.location.href = '/transactions'} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />Thêm giao dịch
          </Button>
        </div>
      </div>

      {isLoading && transactions.length === 0 && !isRefreshing ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">Đang tải dữ liệu...</span>
        </div>
      ) : (
        <>
          {/* ── Summary cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard title="Tổng thu nhập (tháng này)" value={showBalances ? formatCurrency(monthlyTotals.income) : '••••••'} variant="income" />
            <SummaryCard title="Tổng chi tiêu (tháng này)" value={showBalances ? formatCurrency(monthlyTotals.expense) : '••••••'} variant="expense" />
            <SummaryCard title="Ngân hàng" value={showBalances ? formatCurrency(summary.balanceBank) : '••••••'} variant="bank" />
            <SummaryCard title="Tổng số dư" value={showBalances ? formatCurrency(summary.totalBalance) : '••••••'} variant="balance" />
          </div>

          {/* ── Quick action cards ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tiền mặt */}
            <Card className="card-base card-hover">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Tiền mặt</p>
                  <p className="text-2xl font-bold text-foreground">
                    {showBalances ? formatCurrency(summary.balanceCash) : '••••••'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-violet-600" />
                </div>
              </CardContent>
            </Card>

            {/* Rút tiền */}
            <Card className="card-base card-hover">
              <CardContent className="p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Rút tiền nhanh</p>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <Button onClick={() => setIsWithdrawModalOpen(true)} size="sm" className="w-full gap-1.5">
                  <ArrowRightLeft className="h-4 w-4" />Rút tiền từ ngân hàng
                </Button>
              </CardContent>
            </Card>

            {/* Thêm nhanh */}
            <Card className="card-base card-hover">
              <CardContent className="p-5 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Thêm nhanh</p>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm" className="flex-1 gap-1">
                    <Link href="/transactions">Giao dịch</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1 gap-1">
                    <Link href="/transactions?mode=bill"><Camera className="h-3.5 w-3.5" />Bill</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <WithdrawCashModal isOpen={isWithdrawModalOpen} onOpenChange={setIsWithdrawModalOpen} onSuccess={handleWithdrawSuccess} currentBankBalance={summary.balanceBank} />
          <ChangelogModal isOpen={isChangelogModalOpen} onClose={() => setIsChangelogModalOpen(false)} />

          {/* ── Notes + Notifications ─────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SharedNotes />
            <NotificationCenter workSchedules={workSchedules} uploadNotifications={uploadNotifications} />
          </div>

          {/* ── Chart ────────────────────────────────────────────── */}
          <Card className="card-base">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Tổng Quan Thu Chi 6 Tháng</CardTitle>
                  <CardDescription className="text-xs">So sánh thu nhập và chi tiêu qua các tháng</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {(isLoading || isRefreshing) && monthlyChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Đang tải biểu đồ...</span>
                </div>
              ) : monthlyChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <RechartsBarChart accessibilityLayer data={monthlyChartData}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickFormatter={(v) => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(v)} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" formatter={(v, n) => [
                      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(v as number),
                      n === 'thu' ? 'Thu nhập' : 'Chi tiêu'
                    ]} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="thu" fill="var(--color-thu)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="chi" fill="var(--color-chi)" radius={[4, 4, 0, 0]} />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <BarChart className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">Chưa có dữ liệu biểu đồ</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Financial analysis + Loans ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="card-base">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Phân Tích Tài Chính</CardTitle>
                    <CardDescription className="text-xs">Thống kê tổng hợp</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Tỷ lệ tiết kiệm</span>
                  <span className="text-sm font-bold text-foreground">{showBalances ? `${savingsRate}%` : '••••'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Chi tiêu / ngày (TB)</span>
                  <span className="text-sm font-bold text-foreground">{showBalances ? formatCurrency(Math.round(summary.totalExpense / 30)) : '••••••'}</span>
                </div>
                <Button asChild size="sm" className="w-full mt-1 gap-1.5">
                  <Link href="/reports"><BarChart className="h-4 w-4" />Xem báo cáo chi tiết</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="card-base">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Quản Lý Khoản Vay</CardTitle>
                    <CardDescription className="text-xs">Theo dõi khoản vay và kế hoạch trả nợ</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Tổng khoản vay</span>
                  <span className="text-sm font-bold text-foreground">0₫</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Cần trả tháng này</span>
                  <span className="text-sm font-bold text-foreground">0₫</span>
                </div>
                <Button asChild size="sm" variant="outline" className="w-full mt-1 gap-1.5">
                  <Link href="/loans"><Banknote className="h-4 w-4" />Quản lý khoản vay</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
