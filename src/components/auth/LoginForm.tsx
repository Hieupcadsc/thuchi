
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore, FAMILY_MEMBERS } from '@/hooks/useAuth';
import { APP_NAME } from '@/lib/constants';
import { Users, User, Home } from 'lucide-react'; // Added User icon

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleLogin = (user: (typeof FAMILY_MEMBERS)[number]) => {
    login(user); 
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary/20 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Home className="w-16 h-16 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">{APP_NAME}</CardTitle>
          <CardDescription className="text-muted-foreground">Quản lý tài chính chung cho cả gia đình.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Vui lòng chọn tài khoản để đăng nhập:
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          {FAMILY_MEMBERS.map((member) => (
            <Button key={member} onClick={() => handleLogin(member)} className="w-full text-lg py-6">
              <User className="mr-2 h-5 w-5" /> Đăng nhập tài khoản {member}
            </Button>
          ))}
        </CardFooter>
      </Card>
    </div>
  );
}
