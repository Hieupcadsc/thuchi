"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SummaryCard } from '@/components/dashboard/SummaryCard';
import { 
  PlusCircle, 
  Camera, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  ArrowRightLeft,
  Eye,
  EyeOff,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react';
// formatCurrency is defined locally as formatMobileCurrency
import { WithdrawCashModal } from '@/components/dashboard/WithdrawCashModal';
import { NotificationCenter } from '@/components/dashboard/NotificationCenter';
import { SharedNotes } from '@/components/dashboard/SharedNotes';

interface MobileDashboardProps {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balanceBank: number;
    balanceCash: number;
    totalBalance: number;
  };
  onRefresh: () => void;
  isRefreshing: boolean;
  currentUser: string;
}

export function MobileDashboard({ 
  summary, 
  onRefresh, 
  isRefreshing, 
  currentUser 
}: MobileDashboardProps) {
  const [showBalances, setShowBalances] = useState(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const formatMobileCurrency = (amount: number): string => {
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6 p-4 pb-6">
      {/* Mobile Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 heading-clear text-enhanced">
            Chào {currentUser}! 👋
          </h1>
          <p className="text-base text-muted-foreground mt-1">
            {new Date().toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              day: 'numeric',
              month: 'long'
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
            className="p-3 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            {showBalances ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-3 rounded-xl border-2 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Balance Overview Card */}
      <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white border-0 shadow-2xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-base opacity-90 font-medium">Tổng số dư</span>
            <Wallet className="h-6 w-6 opacity-90" />
          </div>
          <div className="text-4xl font-bold mb-4 text-currency">
            {showBalances ? formatMobileCurrency(summary.totalBalance) : '••••••'}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <CreditCard className="h-4 w-4" />
              <div>
                <div className="text-xs opacity-80">Ngân hàng</div>
                <div className="font-semibold text-currency">
                  {showBalances ? formatMobileCurrency(summary.balanceBank) : '••••'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-3">
              <Wallet className="h-4 w-4" />
              <div>
                <div className="text-xs opacity-80">Tiền mặt</div>
                <div className="font-semibold text-currency">
                  {showBalances ? formatMobileCurrency(summary.balanceCash) : '••••'}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          className="h-16 flex-col gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
          onClick={() => window.location.href = '/transactions'}
        >
          <PlusCircle className="h-6 w-6" />
          <span className="text-sm font-medium">Thêm giao dịch</span>
        </Button>
        <Button 
          variant="outline"
          className="h-16 flex-col gap-2 border-2 border-blue-200 hover:border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
          onClick={() => window.location.href = '/transactions?mode=bill'}
        >
          <Camera className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Scan bill</span>
        </Button>
      </div>

      {/* Income/Expense Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500 rounded-xl shadow-md">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-green-700 dark:text-green-300 font-semibold">Thu nhập</span>
            </div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200 text-currency">
              {showBalances ? formatMobileCurrency(summary.totalIncome) : '••••••'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500 rounded-xl shadow-md">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm text-red-700 dark:text-red-300 font-semibold">Chi tiêu</span>
            </div>
            <div className="text-2xl font-bold text-red-800 dark:text-red-200 text-currency">
              {showBalances ? formatMobileCurrency(summary.totalExpense) : '••••••'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Banking Actions */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            Thao tác nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setIsWithdrawModalOpen(true)}
            className="w-full h-14 justify-start gap-3 border-2 border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50 shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-medium text-slate-700">Rút tiền mặt từ ngân hàng</span>
          </Button>
        </CardContent>
      </Card>

      {/* Family Shared Notes */}
      <SharedNotes />

      {/* Notification Center */}
      <NotificationCenter />

      <WithdrawCashModal 
        isOpen={isWithdrawModalOpen} 
        onOpenChange={setIsWithdrawModalOpen}
        onSuccess={() => {
          setIsWithdrawModalOpen(false);
          onRefresh();
        }}
        currentBankBalance={summary.balanceBank}
      />
    </div>
  );
} 