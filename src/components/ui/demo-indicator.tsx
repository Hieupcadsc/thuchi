"use client";

import { TestTube2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function DemoIndicator() {
  return (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800 p-3 mb-4">
      <div className="flex items-center justify-center space-x-2">
        <TestTube2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
          Chế độ Demo
        </Badge>
        <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      </div>
      <p className="text-xs text-center text-amber-700 dark:text-amber-300 mt-2">
        Bạn đang sử dụng tài khoản Demo với dữ liệu mẫu. Dữ liệu này riêng biệt với tài khoản chính.
      </p>
    </Card>
  );
}
