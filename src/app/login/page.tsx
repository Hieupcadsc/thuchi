"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/hooks/useAuth';

export default function LoginPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (user) {
    // Optional: render a loading state or null while redirecting
    return <div className="flex items-center justify-center min-h-screen"><p>Đang chuyển hướng...</p></div>;
  }

  return <LoginForm />;
}
