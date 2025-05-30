
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet } from 'lucide-react';

interface WithdrawCashModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentBankBalance: number;
}

const formatVnCurrency = (value: number | string | undefined): string => {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const numString = String(value).replace(/[^\d]/g, '');
  if (numString === '') return '';
  const num = Number(numString);
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN');
};

const parseVnCurrencyToNumber = (value: string): number => {
  if (value === null || value === undefined) return 0;
  return Number(String(value).replace(/[^\d]/g, '')) || 0;
};

export function WithdrawCashModal({ isOpen, onOpenChange, onSuccess, currentBankBalance }: WithdrawCashModalProps) {
  const { processCashWithdrawal } = useAuthStore();
  const { toast } = useToast();
  const [amount, setAmount] = useState(0);
  const [displayAmount, setDisplayAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      setDisplayAmount('');
      setNote('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const numericValue = parseVnCurrencyToNumber(inputValue);
    setAmount(numericValue);
    setDisplayAmount(formatVnCurrency(inputValue));
  };
  
  const handleBlurAmount = () => {
     setDisplayAmount(formatVnCurrency(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast({ title: "Lỗi", description: "Số tiền rút phải lớn hơn 0.", variant: "destructive" });
      return;
    }
    if (amount > currentBankBalance) {
      toast({ title: "Lỗi", description: "Số tiền rút không thể lớn hơn số dư ngân hàng.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const success = await processCashWithdrawal(amount, note);
    setIsSubmitting(false);
    if (success) {
      onOpenChange(false); // Close modal
      if (onSuccess) onSuccess(); // Call success callback if provided
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5 text-primary" />
            Rút Tiền Mặt từ Ngân Hàng
          </DialogTitle>
          <DialogDescription>
            Nhập số tiền bạn muốn rút từ tài khoản ngân hàng sang tiền mặt.
            Hệ thống sẽ tự động tạo giao dịch chi (ngân hàng) và giao dịch thu (tiền mặt).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="withdraw-amount">Số tiền rút</Label>
            <Input
              id="withdraw-amount"
              type="text"
              inputMode="numeric"
              value={displayAmount}
              onChange={handleAmountChange}
              onBlur={handleBlurAmount}
              placeholder="0"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Số dư ngân hàng hiện tại: {formatVnCurrency(currentBankBalance)} VND
            </p>
          </div>
          <div>
            <Label htmlFor="withdraw-note">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id="withdraw-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Rút tiền chi tiêu cá nhân"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Hủy
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || amount <= 0 || amount > currentBankBalance}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác Nhận Rút Tiền
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
