"use client";

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  Filter,
  Calendar,
  Tag,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterOpen: () => void;
  placeholder?: string;
  hasActiveFilters?: boolean;
  resultCount?: number;
  className?: string;
}

export function MobileSearchBar({
  searchTerm,
  onSearchChange,
  onFilterOpen,
  placeholder = "Tìm giao dịch...",
  hasActiveFilters = false,
  resultCount = 0,
  className
}: MobileSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange('');
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search Input */}
      <div className="relative">
        <div className={cn(
          "relative flex items-center transition-all duration-200",
          isFocused ? "ring-2 ring-blue-500 ring-opacity-50" : ""
        )}>
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground z-10" />
          
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "mobile-input pl-10 pr-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm",
              isFocused ? "bg-white dark:bg-gray-800" : ""
            )}
          />
          
          <div className="absolute right-2 flex items-center gap-1">
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onFilterOpen}
              className={cn(
                "h-8 relative border-2 transition-colors",
                hasActiveFilters 
                  ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700" 
                  : ""
              )}
            >
              <Filter className="h-3 w-3" />
              {hasActiveFilters && (
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 h-8 px-3 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700 dark:from-green-950 dark:to-emerald-950"
        >
          <Tag className="h-3 w-3 mr-1" />
          Tất cả
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 h-8 px-3 rounded-full"
        >
          📅 Tháng này
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 h-8 px-3 rounded-full"
        >
          💰 Thu nhập
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 h-8 px-3 rounded-full"
        >
          💸 Chi tiêu
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 h-8 px-3 rounded-full"
        >
          🍽️ Ăn uống
        </Button>
      </div>

      {/* Search Results Summary */}
      {(searchTerm || hasActiveFilters) && (
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {resultCount} kết quả
            </span>
          </div>
          
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              Có bộ lọc
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Quick Filter Suggestions Component
export function MobileQuickFilters({
  onFilterSelect,
  className
}: {
  onFilterSelect: (filter: { type: string; value: string; label: string }) => void;
  className?: string;
}) {
  const quickFilters = [
    { type: 'time', value: 'thisMonth', label: '📅 Tháng này' },
    { type: 'time', value: 'lastMonth', label: '📅 Tháng trước' },
    { type: 'type', value: 'income', label: '💰 Thu nhập' },
    { type: 'type', value: 'expense', label: '💸 Chi tiêu' },
    { type: 'category', value: 'an_uong', label: '🍽️ Ăn uống' },
    { type: 'category', value: 'di_chuyen', label: '🚗 Di chuyển' },
    { type: 'category', value: 'mua_sam', label: '🛍️ Mua sắm' },
    { type: 'category', value: 'giai_tri', label: '🎬 Giải trí' },
  ];

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-hide", className)}>
      {quickFilters.map((filter, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          onClick={() => onFilterSelect(filter)}
          className="flex-shrink-0 h-8 px-3 rounded-full border-2 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
} 