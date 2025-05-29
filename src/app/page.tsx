
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';

export default function HomePage() {
  const familyId = useAuthStore((state) => state.familyId);
  const router = useRouter();

  useEffect(() => {
    if (familyId) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [familyId, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Đang tải...</p>
    </div>
  );
}
