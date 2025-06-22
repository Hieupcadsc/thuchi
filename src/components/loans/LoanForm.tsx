"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HandCoins, DollarSign, User, Wallet, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}



const familyMembers = ['Bố', 'Mẹ', 'Anh', 'Em', 'Chị'];

export function LoanForm({ isOpen, onClose, onSuccess }: LoanFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Basic form data
  const [lenderName, setLenderName] = useState('');
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentSource, setPaymentSource] = useState('cash');

  // Simple date inputs
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };



  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!lenderName.trim()) {
      newErrors.lenderName = 'Vui lòng chọn người cho vay';
    }

    if (!borrowerName.trim()) {
      newErrors.borrowerName = 'Vui lòng nhập tên người mượn';
    }

    if (!principalAmount || parseFloat(principalAmount) <= 0) {
      newErrors.principalAmount = 'Vui lòng nhập số tiền hợp lệ';
    }

    if (!loanDate) {
      newErrors.loanDate = 'Vui lòng chọn ngày cho vay';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const loanData = {
        lenderName,
        borrowerName,
        borrowerPhone: borrowerPhone || undefined,
        principalAmount: parseFloat(principalAmount),
        loanDate,
        dueDate: dueDate || undefined,
        description: description || undefined,
        paymentSource,
      };

      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loanData),
      });

      if (!response.ok) {
        throw new Error('Failed to create loan');
      }

      toast({
        title: 'Thành công',
        description: 'Đã tạo khoản cho vay mới',
      });

      // Reset form
      setLenderName('');
      setBorrowerName('');
      setBorrowerPhone('');
      setPrincipalAmount('');
      setDescription('');
      setPaymentSource('cash');
      setLoanDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      setErrors({});

      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo khoản cho vay',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-xl">
              <HandCoins className="h-6 w-6 text-green-600" />
              Tạo Khoản Cho Vay Mới
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Lender Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông Tin Người Cho Vay
                </h3>
                
                <div>
                  <Label htmlFor="lenderName">Người cho vay *</Label>
                  <Select value={lenderName} onValueChange={setLenderName}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Chọn người cho vay" />
                    </SelectTrigger>
                    <SelectContent>
                      {familyMembers.map((member) => (
                        <SelectItem key={member} value={member}>
                          {member}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.lenderName && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-red-600">{errors.lenderName}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Borrower Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Thông Tin Người Mượn
                </h3>
                
                <div>
                  <Label htmlFor="borrowerName">Tên người mượn *</Label>
                  <Input
                    id="borrowerName"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Nhập tên người mượn tiền"
                    className="h-12"
                  />
                  {errors.borrowerName && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-red-600">{errors.borrowerName}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="borrowerPhone">Số điện thoại</Label>
                  <Input
                    id="borrowerPhone"
                    type="tel"
                    value={borrowerPhone}
                    onChange={(e) => setBorrowerPhone(e.target.value)}
                    placeholder="Nhập số điện thoại"
                    className="h-12"
                  />
                </div>
              </div>

              {/* Loan Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Chi Tiết Khoản Vay
                </h3>
                
                <div>
                  <Label htmlFor="principalAmount">Số tiền cho vay *</Label>
                  <Input
                    id="principalAmount"
                    type="number"
                    step="1000"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    placeholder="Nhập số tiền"
                    className="h-12"
                  />
                  {errors.principalAmount && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-red-600">{errors.principalAmount}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div>
                  <Label>Ngày cho vay *</Label>
                  <Input
                    type="date"
                    value={loanDate}
                    onChange={(e) => setLoanDate(e.target.value)}
                    className="h-12"
                  />
                  {errors.loanDate && (
                    <Alert className="mt-2">
                      <AlertDescription className="text-red-600">{errors.loanDate}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <div>
                  <Label>Ngày đáo hạn (không bắt buộc)</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-12 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDueDate('')}
                      className="h-8 px-2 text-xs"
                      title="Xóa ngày đáo hạn"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="paymentSource">Nguồn tiền</Label>
                  <Select value={paymentSource} onValueChange={setPaymentSource}>
                    <SelectTrigger className="h-12">
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
                          <DollarSign className="h-4 w-4" />
                          Ngân hàng
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description">Ghi chú</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Thêm ghi chú về khoản vay..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-12"
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo khoản vay'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 