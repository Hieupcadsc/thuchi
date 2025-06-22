import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'loading' | 'success' | 'error' | 'warning';
  children?: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  animated?: boolean;
}

const statusConfig = {
  online: {
    icon: Wifi,
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    label: 'Trực tuyến'
  },
  offline: {
    icon: WifiOff,
    color: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
    label: 'Ngoại tuyến'
  },
  loading: {
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    label: 'Đang tải'
  },
  success: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
    label: 'Thành công'
  },
  error: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    label: 'Lỗi'
  },
  warning: {
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
    label: 'Cảnh báo'
  }
};

export function StatusBadge({ 
  status, 
  children, 
  className, 
  showIcon = true, 
  animated = true 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium border transition-all duration-200",
        config.color,
        animated && status === 'loading' && "animate-pulse",
        className
      )}
    >
      {showIcon && (
        <Icon className={cn(
          "h-3 w-3",
          animated && status === 'loading' && "animate-spin"
        )} />
      )}
      {children || config.label}
      {(status === 'online' || status === 'success') && animated && (
        <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
      )}
    </Badge>
  );
} 