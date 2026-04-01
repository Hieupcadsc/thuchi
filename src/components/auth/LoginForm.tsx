"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/hooks/useAuth';
import { APP_NAME, FAMILY_MEMBERS, DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants';
import { initializeDemoMasterData } from '@/lib/demo-helpers';
import type { FamilyMember } from '@/types';
import { Wallet, KeyRound, AlertCircle, TestTube2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginAttempt = async () => {
    if (!selectedUser) { setError('Vui lòng chọn tài khoản.'); return; }
    if (!password)    { setError('Vui lòng nhập mật khẩu.');   return; }
    setError(null);
    setLoading(true);
    try {
      const ok = await login(selectedUser, password);
      if (ok) router.push('/dashboard');
    } catch {
      setError('Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const ok = await login(DEMO_USER, '');
      if (ok) {
        try {
          localStorage.removeItem(`transactions_${DEMO_ACCOUNT_ID}`);
          const res  = await fetch('/api/demo/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: DEMO_USER, forceRefresh: true }),
          });
          const data = await res.json();
          if (data.success && data.transactions) {
            localStorage.setItem(`transactions_${DEMO_ACCOUNT_ID}`, JSON.stringify(data.transactions));
            useAuthStore.setState({ transactions: data.transactions });
          }
          initializeDemoMasterData();
        } catch { /* non-blocking */ }
        toast({ title: 'Đăng nhập Demo thành công!', description: 'Dữ liệu mẫu đã được tải.' });
        router.push('/dashboard');
      }
    } catch {
      setError('Có lỗi xảy ra khi đăng nhập Demo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel (decorative, hidden on mobile) ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-sidebar items-center justify-center overflow-hidden">
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--sidebar-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--sidebar-foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* glow blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl" />

        <div className="relative z-10 text-center px-12 space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mx-auto shadow-lg shadow-primary/30">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-sidebar-foreground">{APP_NAME}</h1>
            <p className="mt-2 text-sidebar-foreground/60 text-sm">Quản lý tài chính gia đình thông minh</p>
          </div>
          <div className="space-y-3 text-left max-w-xs mx-auto">
            {['Theo dõi thu chi hàng ngày', 'Báo cáo trực quan, dễ hiểu', 'Chia sẻ trong gia đình'].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-sidebar-foreground/70">
                <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-primary" />
                </div>
                {f}
              </div>
            ))}
          </div>
          <p className="text-xs text-sidebar-foreground/40 mt-8">
            Developed by Ngô Minh Hiếu · hieungo.uk
          </p>
        </div>
      </div>

      {/* ── Right panel: login form ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 animate-scale-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mx-auto mb-3">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Đăng nhập</h2>
            <p className="mt-1 text-sm text-muted-foreground">Chọn tài khoản và nhập mật khẩu</p>
          </div>

          {/* User selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tài khoản</Label>
            <div className="grid grid-cols-2 gap-2">
              {FAMILY_MEMBERS.map((member) => {
                const isSelected = selectedUser === member;
                return (
                  <button
                    key={member}
                    onClick={() => setSelectedUser(member)}
                    className={cn(
                      'relative flex items-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      isSelected ? 'border-primary bg-primary' : 'border-border'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{member}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginAttempt()}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5 rounded-lg border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login button */}
          <Button
            onClick={handleLoginAttempt}
            disabled={!selectedUser || !password || loading}
            className="w-full h-11 rounded-xl font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Đang đăng nhập...
              </span>
            ) : 'Đăng nhập'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-background px-3">hoặc</span>
            </div>
          </div>

          {/* Demo login */}
          <Button
            onClick={handleDemoLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-11 rounded-xl font-medium border-dashed gap-2"
          >
            <TestTube2 className="w-4 h-4" />
            Dùng tài khoản Demo
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Trải nghiệm không cần mật khẩu · Dữ liệu mẫu
          </p>
        </div>
      </div>
    </div>
  );
}
