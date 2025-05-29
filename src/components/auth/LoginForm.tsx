
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore, FAMILY_ACCOUNT_ID } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';
import { PiggyBank, Users } from 'lucide-react';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = () => {
    login(); // Logs in to the default family account
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Users className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">{APP_NAME}</CardTitle>
          <CardDescription className="text-muted-foreground">Quản lý tài chính chung cho cả gia đình.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-muted-foreground">
            Nhấn nút bên dưới để bắt đầu quản lý ngân sách gia đình của bạn.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} className="w-full text-lg py-6">
            Vào Tài Khoản Gia Đình
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
