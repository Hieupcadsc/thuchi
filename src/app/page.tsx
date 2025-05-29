"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';

export default function HomePage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Đang tải...</p>
    </div>
  );
}
