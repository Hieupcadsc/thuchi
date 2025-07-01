"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/hooks/useAuth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  isForced?: boolean; // True if this is a forced password change due to weak password
  onPasswordChanged?: () => void; // Callback when password successfully changed
}

export function ChangePasswordModal({ isOpen, onClose, isForced = false, onPasswordChanged }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const { currentUser } = useAuthStore();

  if (!isOpen) return null;

  const validatePassword = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, isWeak: password === '123456' || password === 'password' || password === '12345678' };
  };

  const passwordValidation = validatePassword(newPassword);
  const isPasswordValid = passwordValidation.score >= 4 && !passwordValidation.isWeak;
  const isFormValid = currentPassword && newPassword && confirmPassword && 
                     newPassword === confirmPassword && isPasswordValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Call API to change password
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      // Show success message
      alert('✅ Đổi mật khẩu thành công!');
      
      // Update localStorage for immediate UI feedback
      localStorage.setItem(`password_strength_${currentUser}`, 'strong');
      localStorage.setItem(`password_changed_${currentUser}`, Date.now().toString());
      
      // Call callback to update parent state
      if (onPasswordChanged) {
        onPasswordChanged();
      }
      
      // Reset form and close modal
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return 'text-red-700 bg-red-100 border-red-200';
    if (score === 3) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-green-700 bg-green-100 border-green-200';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return 'Yếu';
    if (score === 3) return 'Trung bình';
    return 'Mạnh';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 min-h-screen">
      <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden my-auto">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white relative">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Lock className="h-6 w-6" />
              </div>
              {isForced ? 'Bảo mật tài khoản' : 'Đổi mật khẩu'}
            </CardTitle>
            {!isForced && (
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
          {isForced && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-300/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-100" />
                <div>
                  <p className="font-semibold text-red-100">Mật khẩu không an toàn!</p>
                  <p className="text-red-200 text-sm">Mật khẩu hiện tại quá yếu. Vui lòng tạo mật khẩu mạnh hơn để bảo vệ tài khoản.</p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <div className="space-y-3">
              <Label htmlFor="currentPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Mật khẩu hiện tại
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu hiện tại"
                  className="pr-10 h-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-gray-100"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-3">
              <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-500" />
                Mật khẩu mới
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                  className="pr-10 h-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-gray-100"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2 p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Độ mạnh mật khẩu</span>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${getPasswordStrengthColor(passwordValidation.score)}`}>
                      {passwordValidation.isWeak ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      {passwordValidation.isWeak ? 'Không an toàn' : getPasswordStrengthText(passwordValidation.score)}
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordValidation.score <= 2 ? 'bg-red-500' : 
                        passwordValidation.score === 3 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordValidation.score / 5) * 100}%` }}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.length ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordValidation.checks.length ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                      8+ ký tự
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordValidation.checks.uppercase ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                      Chữ hoa
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordValidation.checks.lowercase ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                      Chữ thường
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.checks.number ? 'text-green-600' : 'text-gray-400'}`}>
                      {passwordValidation.checks.number ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                      Số (0-9)
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${passwordValidation.checks.special ? 'text-green-600' : 'text-gray-400'}`}>
                    {passwordValidation.checks.special ? <CheckCircle className="h-3 w-3" /> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                    Ký tự đặc biệt (!@#$%...)
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-gray-500" />
                Xác nhận mật khẩu mới
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  className={`pr-10 h-10 ${
                    confirmPassword && newPassword !== confirmPassword ? 'border-red-500' : ''
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-gray-100"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                </Button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Mật khẩu xác nhận không khớp</span>
                </div>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Mật khẩu khớp</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium text-red-800">Có lỗi xảy ra</p>
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              {!isForced && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose} 
                  className="flex-1"
                >
                  Hủy
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={!isFormValid || isSubmitting}
                className={`${isForced ? 'w-full' : 'flex-1'}`}
              >
                {isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 