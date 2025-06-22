"use client";

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, HandCoins, PiggyBank, AlertTriangle, TrendingUp, Phone, MapPin, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import type { Loan, LoanSummary, LoanStatus } from '@/types';
import { LoanForm } from './LoanForm';
import { LoanPaymentForm } from './LoanPaymentForm';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<LoanStatus, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  overdue: 'bg-red-100 text-red-800',
  partially_paid: 'bg-yellow-100 text-yellow-800'
};

const statusLabels: Record<LoanStatus, string> = {
  active: 'Đang hoạt động',
  completed: 'Hoàn thành',
  overdue: 'Quá hạn',
  partially_paid: 'Trả một phần'
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function LoanManagement() {
  const { familyId } = useAuthStore();
  const { toast } = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [includeCompleted, setIncludeCompleted] = useState(false);

  const fetchLoans = async () => {
    if (!familyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/loans?familyId=${familyId}&includeCompleted=${includeCompleted}`);
      const data = await response.json();

      if (response.ok) {
        setLoans(data.loans);
        setSummary(data.summary);
      } else {
        toast({
          title: "Lỗi",
          description: data.error || "Không thể tải danh sách cho vay",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến server",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [familyId, includeCompleted]);

  const handleLoanCreated = () => {
    setShowLoanForm(false);
    fetchLoans();
    toast({
      title: "Thành công",
      description: "Đã tạo khoản cho vay mới",
    });
  };

  const handlePaymentRecorded = () => {
    setShowPaymentForm(false);
    setSelectedLoan(null);
    fetchLoans();
    toast({
      title: "Thành công", 
      description: "Đã ghi nhận thanh toán",
    });
  };

  const openPaymentForm = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowPaymentForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Đang tải danh sách cho vay...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Khoản vay đang hoạt động</CardTitle>
              <HandCoins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalLoansActive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng cho vay</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalLoanAmount)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chưa thu về</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalOutstanding)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã thu về</CardTitle>
              <PiggyBank className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCollected)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Quản lý cho vay</h2>
          <Button
            variant="outline"
            onClick={() => setIncludeCompleted(!includeCompleted)}
          >
            {includeCompleted ? 'Ẩn hoàn thành' : 'Hiện hoàn thành'}
          </Button>
        </div>
        <Button onClick={() => setShowLoanForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Cho vay mới
        </Button>
      </div>

      {/* Loans List */}
      <div className="grid gap-4">
        {loans.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <HandCoins className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có khoản cho vay nào</h3>
              <p className="text-muted-foreground text-center">
                Bắt đầu bằng cách tạo khoản cho vay đầu tiên
              </p>
              <Button onClick={() => setShowLoanForm(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Cho vay mới
              </Button>
            </CardContent>
          </Card>
        ) : (
          loans.map((loan) => (
            <Card key={loan.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{loan.borrowerName}</h3>
                      <Badge className={statusColors[loan.status]}>
                        {statusLabels[loan.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        Cho vay bởi: {loan.lenderName}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(loan.loanDate), 'dd/MM/yyyy', { locale: vi })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatCurrency(loan.principalAmount)}</div>
                    <div className="text-sm text-muted-foreground">Số tiền gốc</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Đã thu về</div>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(loan.totalPaidAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Còn lại</div>
                    <div className="text-lg font-semibold text-red-600">
                      {formatCurrency(loan.remainingAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Tiến độ</div>
                    <div className="text-lg font-semibold">
                      {((loan.totalPaidAmount / loan.principalAmount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loan.totalPaidAmount / loan.principalAmount) * 100}%` }}
                  ></div>
                </div>

                {/* Contact info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  {loan.borrowerPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {loan.borrowerPhone}
                    </div>
                  )}
                  {loan.borrowerAddress && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {loan.borrowerAddress}
                    </div>
                  )}
                </div>

                {/* Description */}
                {loan.description && (
                  <p className="text-sm text-muted-foreground mb-4">{loan.description}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {loan.status !== 'completed' && (
                    <Button 
                      size="sm" 
                      onClick={() => openPaymentForm(loan)}
                    >
                      <PiggyBank className="h-4 w-4 mr-2" />
                      Ghi nhận thanh toán
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    Xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Forms */}
      {showLoanForm && (
        <LoanForm
          isOpen={showLoanForm}
          onClose={() => setShowLoanForm(false)}
          onSuccess={handleLoanCreated}
        />
      )}

      {showPaymentForm && selectedLoan && (
        <LoanPaymentForm
          isOpen={showPaymentForm}
          onClose={() => setShowPaymentForm(false)}
          onSuccess={handlePaymentRecorded}
          loan={selectedLoan}
        />
      )}
    </div>
  );
} 