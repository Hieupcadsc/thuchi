
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthStore } from '@/hooks/useAuth';

export default function LoginPage() {
  const familyId = useAuthStore((state) => state.familyId);
  const router = useRouter();

  useEffect(() => {
    if (familyId) {
      router.push('/dashboard');
    }
  }, [familyId, router]);

  if (familyId) {
    return <div className="flex items-center justify-center min-h-screen"><p>Đang chuyển hướng...</p></div>;
  }

  return <LoginForm />;
}
