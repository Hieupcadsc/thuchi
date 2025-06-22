"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, PiggyBank, Wallet, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FAMILY_MEMBERS, PAYMENT_SOURCE_OPTIONS } from '@/lib/constants';
import type { FamilyMember, PaymentSource, Loan } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoanPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loan: Loan;
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function LoanPaymentForm({ isOpen, onClose, onSuccess, loan }: LoanPaymentFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [note, setNote] = useState('');
  const [createdBy, setCreatedBy] = useState<FamilyMember | ''>('');

  const resetForm = () => {
    setPaymentAmount('');
    setPaymentDate(new Date());
    setPaymentMethod('cash');
    setNote('');
    setCreatedBy('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Lỗi",
        description: "Số tiền không hợp lệ",
        variant: "destructive"
      });
      return;
    }

    if (amount > loan.remainingAmount) {
      toast({
        title: "Lỗi", 
        description: "Số tiền trả không thể lớn hơn số tiền còn lại",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(`/api/loans/${loan.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentAmount: amount,
          paymentDate: format(paymentDate, 'yyyy-MM-dd'),
          paymentMethod,
          note: note.trim() || undefined,
          createdBy,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Thành công",
          description: "Đã ghi nhận khoản trả nợ",
        });
        resetForm();
        onSuccess();
        onClose();
      } else {
        toast({
          title: "Lỗi",
          description: data.error || "Không thể ghi nhận khoản trả",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Lỗi",
        description: "Không thể kết nối đến server",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // Quick amount suggestions based on remaining amount
  const getSuggestedAmounts = () => {
    const remaining = loan.remainingAmount;
    const suggestions = [];
    
    // Full amount
    suggestions.push({ label: 'Trả hết', amount: remaining });
    
    // Half amount
    if (remaining > 2000000) {
      suggestions.push({ label: 'Trả một nửa', amount: Math.round(remaining / 2) });
    }
    
    // Quarter amount  
    if (remaining > 4000000) {
      suggestions.push({ label: 'Trả 1/4', amount: Math.round(remaining / 4) });
    }
    
    // Round numbers
    if (remaining > 10000000) {
      suggestions.push({ label: '10 triệu', amount: 10000000 });
    }
    if (remaining > 5000000) {
      suggestions.push({ label: '5 triệu', amount: 5000000 });
    }
    if (remaining > 1000000) {
      suggestions.push({ label: '1 triệu', amount: 1000000 });
    }
    
    return suggestions.filter(s => s.amount <= remaining).slice(0, 4);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5" />
            Ghi nhận trả nợ
          </DialogTitle>
        </DialogHeader>

        {/* Loan Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thông tin khoản vay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Người mượn:</span>
              <span className="font-medium">{loan.borrowerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Số tiền gốc:</span>
              <span className="font-medium">{formatCurrency(loan.principalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Đã trả:</span>
              <span className="font-medium text-green-600">{formatCurrency(loan.totalPaidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Còn lại:</span>
              <span className="font-bold text-red-600">{formatCurrency(loan.remainingAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Trạng thái:</span>
              <Badge variant={loan.status === 'active' ? 'default' : loan.status === 'completed' ? 'secondary' : 'destructive'}>
                {loan.status === 'active' ? 'Đang vay' : 
                 loan.status === 'completed' ? 'Đã trả hết' : 
                 loan.status === 'overdue' ? 'Quá hạn' : 'Trả một phần'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Amount Suggestions */}
          <div>
            <Label className="text-sm">Chọn nhanh số tiền</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getSuggestedAmounts().map((suggestion, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentAmount(suggestion.amount.toString())}
                  className="text-xs"
                >
                  {suggestion.label}
                  <br />
                  <span className="text-muted-foreground">
                    {formatCurrency(suggestion.amount)}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <Label htmlFor="paymentAmount">Số tiền trả *</Label>
            <Input
              id="paymentAmount"
              type="number"
              step="1000"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Nhập số tiền"
              max={loan.remainingAmount}
              required
            />
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Ngày thanh toán *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, 'dd/MM/yyyy', { locale: vi }) : 'Chọn ngày'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method */}
          <div>
            <Label>Phương thức thanh toán *</Label>
            <Select value={paymentMethod} onValueChange={(value: 'cash' | 'bank') => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Tiền mặt
                  </div>
                </SelectItem>
                <SelectItem value="bank">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Chuyển khoản
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Who recorded */}
          <div className="space-y-2">
            <Label>Người ghi nhận *</Label>
            <Select value={createdBy} onValueChange={(value: FamilyMember) => setCreatedBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn người ghi nhận" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_MEMBERS.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú về khoản thanh toán này..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ghi nhận thanh toán
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 