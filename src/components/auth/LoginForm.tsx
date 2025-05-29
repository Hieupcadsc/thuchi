
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/hooks/useAuth';
import { APP_NAME, FAMILY_MEMBERS } from '@/lib/constants'; // Import FAMILY_MEMBERS from constants
import type { FamilyMember } from '@/types';
import { Users, User, Home, KeyRound, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();
  const { toast } = useToast(); 
  const [password, setPassword] = useState('');
  const [selectedUser, setSelectedUser] = useState<FamilyMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLoginAttempt = () => {
    if (!selectedUser) {
      setError("Vui lòng chọn tài khoản.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }
    setError(null);
    const loginSuccess = login(selectedUser, password);
    if (loginSuccess) {
      router.push('/dashboard');
    } else {
      // Error toast is handled by useAuthStore.login
      // setError("Mật khẩu không đúng."); // This can be uncommented if specific local error is needed
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Home className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">{APP_NAME}</CardTitle>
          <CardDescription className="text-muted-foreground">
            Ứng dụng này được phát triển Độc Lập bởi Ngô Minh Hiếu.
            <br />
            Quản lý tài chính chung cho cả gia đình.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="user-select" className="mb-2 block text-center">Chọn tài khoản để đăng nhập:</Label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {FAMILY_MEMBERS.map((member) => (
                <Button 
                  key={member} 
                  onClick={() => setSelectedUser(member)} 
                  variant={selectedUser === member ? "default" : "outline"}
                  className="w-full text-md py-3"
                >
                  <User className="mr-2 h-4 w-4" /> {member}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8"
                onKeyPress={(e) => { if (e.key === 'Enter') handleLoginAttempt(); }}
              />
            </div>
          </div>
          
          {error && (
            <div className="flex items-center text-sm text-destructive">
              <AlertCircle className="mr-1 h-4 w-4" />
              {error}
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button onClick={handleLoginAttempt} className="w-full text-lg py-6" disabled={!selectedUser || !password}>
            Đăng Nhập
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
