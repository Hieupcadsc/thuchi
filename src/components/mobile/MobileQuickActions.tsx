"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Plus, 
  Camera, 
  Search, 
  Filter, 
  ChevronUp,
  ChevronDown,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileQuickActionsProps {
  onAddTransaction: () => void;
  onAddFromBill: () => void;
  onSearch: () => void;
  onFilter: () => void;
  className?: string;
}

export function MobileQuickActions({
  onAddTransaction,
  onAddFromBill,
  onSearch,
  onFilter,
  className
}: MobileQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const quickActions = [
    {
      icon: Plus,
      label: 'Thêm giao dịch',
      onClick: onAddTransaction,
      color: 'bg-green-500 hover:bg-green-600',
      primary: true
    },
    {
      icon: Camera,
      label: 'Scan bill',
      onClick: onAddFromBill,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: Search,
      label: 'Tìm kiếm',
      onClick: onSearch,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: Filter,
      label: 'Bộ lọc',
      onClick: onFilter,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

  return (
    <div className={cn("fixed bottom-20 right-4 z-40", className)}>
      {/* Expanded Actions */}
      {isExpanded && (
        <div className="space-y-3 mb-3 animate-in slide-in-from-bottom-2 duration-200">
          {quickActions.slice(1).map((action, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm font-medium bg-black/80 text-white px-3 py-1 rounded-full">
                {action.label}
              </span>
              <Button
                size="sm"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg text-white border-0",
                  action.color
                )}
                onClick={() => {
                  action.onClick();
                  setIsExpanded(false);
                }}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <div className="flex flex-col items-end gap-2">
        {/* Primary Action Button */}
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl bg-green-500 hover:bg-green-600 text-white border-0"
          onClick={quickActions[0].onClick}
        >
          <Plus className="h-6 w-6" />
        </Button>

        {/* Expand/Collapse Button */}
        <Button
          size="sm"
          variant="secondary"
          className="h-10 w-10 rounded-full shadow-lg"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// Mobile Pull-to-Refresh Component
export function MobilePullToRefresh({ 
  onRefresh, 
  isRefreshing = false 
}: { 
  onRefresh: () => void; 
  isRefreshing?: boolean;
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const threshold = 80;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;

    const touch = e.touches[0];
    const distance = Math.max(0, touch.clientY - (touch.target as Element).getBoundingClientRect().top);
    setPullDistance(Math.min(distance, threshold + 20));
  };

  const handleTouchEnd = () => {
    if (isPulling && pullDistance >= threshold) {
      onRefresh();
    }
    setIsPulling(false);
    setPullDistance(0);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-200",
        isPulling ? "translate-y-0" : "-translate-y-full"
      )}
      style={{ transform: `translateY(${pullDistance - threshold}px)` }}
    >
      <div className="bg-background/95 backdrop-blur-sm border-b p-4 text-center">
        <div className={cn(
          "inline-flex items-center gap-2 text-sm",
          pullDistance >= threshold ? "text-green-600" : "text-muted-foreground"
        )}>
          {isRefreshing ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span>Đang làm mới...</span>
            </>
          ) : pullDistance >= threshold ? (
            <span>Thả để làm mới</span>
          ) : (
            <span>Kéo xuống để làm mới</span>
          )}
        </div>
      </div>
    </div>
  );
} 