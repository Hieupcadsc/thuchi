"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuthStore } from '@/hooks/useAuth';
import type { UserType } from '@/types';
import { APP_NAME } from '@/lib/constants';
import { PiggyBank } from 'lucide-react';

export function LoginForm() {
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = () => {
    if (selectedUser) {
      login(selectedUser);
      router.push('/dashboard');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <PiggyBank className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">{APP_NAME}</CardTitle>
          <CardDescription className="text-muted-foreground">Vui lòng chọn tài khoản để đăng nhập.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            onValueChange={(value) => setSelectedUser(value as UserType)}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <RadioGroupItem value="Vợ" id="wife" className="peer sr-only" />
              <Label
                htmlFor="wife"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-xl font-semibold">Vợ</span>
              </Label>
            </div>
            <div>
              <RadioGroupItem value="Chồng" id="husband" className="peer sr-only" />
              <Label
                htmlFor="husband"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
              >
                <span className="text-xl font-semibold">Chồng</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} disabled={!selectedUser} className="w-full text-lg py-6">
            Đăng Nhập
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
