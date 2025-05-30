
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/hooks/useAuth';

export default function LoginPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const router = useRouter();

  useEffect(() => {
    if (currentUser) { // Check for currentUser instead of familyId
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  if (currentUser) {
    return <div className="flex items-center justify-center min-h-screen"><p>Đang chuyển hướng...</p></div>;
  }

  return <LoginForm />;
}
