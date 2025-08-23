
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/hooks/useAuth';
import { APP_NAME, FAMILY_MEMBERS, DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants'; // Import FAMILY_MEMBERS from constants
import { initializeDemoMasterData } from '@/lib/demo-helpers';
import type { FamilyMember } from '@/types';
import { Users, User, Home, KeyRound, AlertCircle, TestTube2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { toast } = useToast(); 
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoginAttempt = async () => {
    if (!selectedUser) {
      setError("Vui lòng chọn tài khoản.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    setError(null);
    
    try {
      const loginSuccess = await login(selectedUser, password);
      if (loginSuccess) {
        router.push('/dashboard');
      } else {
        // Error toast is handled by useAuthStore.login
        // setError("Mật khẩu không đúng."); // This can be uncommented if specific local error is needed
      }
    } catch (error) {
      console.error('Login error:', error);
      setError("Có lỗi xảy ra khi đăng nhập.");
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    try {
      const loginSuccess = await login(DEMO_USER, ''); // Demo user doesn't need password
      if (loginSuccess) {
        // Initialize demo data - force refresh to get latest data
        try {
          // Clear old demo data first
          localStorage.removeItem(`transactions_${DEMO_ACCOUNT_ID}`);
          
          const initResponse = await fetch('/api/demo/init', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: DEMO_USER, forceRefresh: true }),
          });
          
          const initData = await initResponse.json();
          console.log('Demo data initialization:', initData);
          
          // Save demo transactions to localStorage and update Zustand state
          if (initData.success && initData.transactions) {
            localStorage.setItem(`transactions_${DEMO_ACCOUNT_ID}`, JSON.stringify(initData.transactions));
            console.log(`💾 Saved ${initData.transactions.length} demo transactions to localStorage`);
            
            // Update Zustand state with demo data
            useAuthStore.setState({ transactions: initData.transactions });
            console.log(`🔄 Updated Zustand state with ${initData.transactions.length} demo transactions`);
          }

          // Initialize demo master data (events, schedules, etc.)
          initializeDemoMasterData();
        } catch (initError) {
          console.error('Failed to initialize demo data:', initError);
          // Don't block login if demo data init fails
        }

        toast({
          title: "Đăng nhập Demo thành công!",
          description: "Bạn đang sử dụng tài khoản Demo với dữ liệu riêng biệt.",
          variant: "default",
        });
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Demo login error:', error);
      setError("Có lỗi xảy ra khi đăng nhập Demo.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-400/20 rounded-full blur-3xl"></div>
      </div>
      
      <Card className="w-full max-w-md shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-slate-900/90 border-0 shadow-blue-200/20 dark:shadow-slate-900/20">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <Home className="w-16 h-16 text-primary drop-shadow-lg" />
              <div className="absolute inset-0 w-16 h-16 bg-primary/20 rounded-full blur-xl"></div>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {APP_NAME}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-sm leading-relaxed">
            Ứng dụng này được phát triển Độc Lập bởi <span className="font-semibold">Ngô Minh Hiếu</span>.
            <br />
            <span className="text-primary font-medium">Quản lý tài chính chung cho cả gia đình.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="user-select" className="mb-2 block text-center">Chọn tài khoản để đăng nhập:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {FAMILY_MEMBERS.map((member) => (
                <Button 
                  key={member} 
                  onClick={() => setSelectedUser(member)} 
                  variant={selectedUser === member ? "default" : "outline"}
                  className={`w-full text-md py-3 transition-all duration-200 ${
                    selectedUser === member 
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 transform scale-105" 
                      : "hover:bg-blue-50 dark:hover:bg-slate-800 hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <User className="mr-2 h-4 w-4" /> {member}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">Mật khẩu</Label>
            <div className="relative mt-2">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 py-3 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                onKeyPress={(e) => { if (e.key === 'Enter') handleLoginAttempt(); }}
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center text-sm text-destructive bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button 
            onClick={handleLoginAttempt} 
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:shadow-none" 
            disabled={!selectedUser || !password}
          >
            <KeyRound className="mr-2 h-5 w-5" />
            Đăng Nhập
          </Button>
          
          {/* Demo Login Section */}
          <div className="w-full border-t pt-4">
            <div className="text-center mb-3">
              <p className="text-sm text-muted-foreground">Hoặc</p>
            </div>
            <Button 
              onClick={handleDemoLogin} 
              variant="outline" 
              className="w-full text-lg py-6 border-2 border-dashed border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 text-amber-700 hover:text-amber-800 transition-all duration-200"
            >
              <TestTube2 className="mr-2 h-5 w-5" />
              Đăng nhập Demo
              <Sparkles className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Trải nghiệm ứng dụng với dữ liệu mẫu (không cần mật khẩu)
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
