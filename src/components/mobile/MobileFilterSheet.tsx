"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Search, 
  Calendar, 
  Tag, 
  User, 
  X,
  Check,
  RotateCcw
} from 'lucide-react';
import { CATEGORIES, FAMILY_MEMBERS } from '@/lib/constants';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface MobileFilterSheetProps {
  // Filter states
  searchTerm: string;
  filterCategory: string;
  filterPerformedBy: string;
  filterStartDate?: Date;
  filterEndDate?: Date;
  isDateFilterActive: boolean;
  
  // Filter handlers
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onPerformedByChange: (value: string) => void;
  onDateRangeChange: (startDate?: Date, endDate?: Date) => void;
  onDateFilterActiveChange: (active: boolean) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  
  // UI state
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Data
  resultCount?: number;
}

export function MobileFilterSheet({
  searchTerm,
  filterCategory,
  filterPerformedBy,
  filterStartDate,
  filterEndDate,
  isDateFilterActive,
  onSearchChange,
  onCategoryChange,
  onPerformedByChange,
  onDateRangeChange,
  onDateFilterActiveChange,
  onApplyFilters,
  onResetFilters,
  isOpen,
  onOpenChange,
  resultCount = 0
}: MobileFilterSheetProps) {
  const [localStartDate, setLocalStartDate] = useState<Date | undefined>(filterStartDate);
  const [localEndDate, setLocalEndDate] = useState<Date | undefined>(filterEndDate);

  const hasActiveFilters = searchTerm || 
    filterCategory !== 'all_categories' || 
    filterPerformedBy !== 'all_members' || 
    isDateFilterActive;

  const handleApply = () => {
    if (localStartDate && localEndDate) {
      onDateRangeChange(localStartDate, localEndDate);
      onDateFilterActiveChange(true);
    }
    onApplyFilters();
    onOpenChange?.(false);
  };

  const handleReset = () => {
    setLocalStartDate(undefined);
    setLocalEndDate(undefined);
    onResetFilters();
  };

  const handleDateQuickSelect = (type: 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    if (type === 'thisMonth') {
      setLocalStartDate(startOfMonth(now));
      setLocalEndDate(endOfMonth(now));
    } else {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      setLocalStartDate(startOfMonth(lastMonth));
      setLocalEndDate(endOfMonth(lastMonth));
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Bộ lọc
          {hasActiveFilters && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
              !
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[85vh] flex flex-col">
        <SheetHeader className="text-left pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc thông minh
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Tìm kiếm và lọc giao dịch ({resultCount} kết quả)
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          {/* Search */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Search className="h-4 w-4" />
              Tìm kiếm
            </Label>
            <Input
              placeholder="Nhập mô tả giao dịch..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="mobile-input"
            />
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Tag className="h-4 w-4" />
              Danh mục
            </Label>
            <Select value={filterCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="mobile-input">
                <SelectValue placeholder="Chọn danh mục..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_categories">🏷️ Tất cả danh mục</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Member Filter */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <User className="h-4 w-4" />
              Người thực hiện
            </Label>
            <Select value={filterPerformedBy} onValueChange={onPerformedByChange}>
              <SelectTrigger className="mobile-input">
                <SelectValue placeholder="Chọn thành viên..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_members">👥 Tất cả thành viên</SelectItem>
                {FAMILY_MEMBERS.map(member => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Calendar className="h-4 w-4" />
              Khoảng thời gian
            </Label>
            
            {/* Quick Date Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateQuickSelect('thisMonth')}
                className="flex-1"
              >
                Tháng này
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateQuickSelect('lastMonth')}
                className="flex-1"
              >
                Tháng trước
              </Button>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground">Từ ngày</Label>
                <Input
                  type="date"
                  value={localStartDate ? format(localStartDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setLocalStartDate(new Date(e.target.value));
                    } else {
                      setLocalStartDate(undefined);
                    }
                  }}
                  className="mobile-input"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Đến ngày</Label>
                <Input
                  type="date"
                  value={localEndDate ? format(localEndDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      setLocalEndDate(new Date(e.target.value));
                    } else {
                      setLocalEndDate(undefined);
                    }
                  }}
                  className="mobile-input"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <p className="text-sm font-medium mb-2">Bộ lọc đang áp dụng:</p>
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary">
                    Tìm: "{searchTerm}"
                  </Badge>
                )}
                {filterCategory !== 'all_categories' && (
                  <Badge variant="secondary">
                    {CATEGORIES.find(c => c.id === filterCategory)?.name}
                  </Badge>
                )}
                {filterPerformedBy !== 'all_members' && (
                  <Badge variant="secondary">
                    {filterPerformedBy}
                  </Badge>
                )}
                {isDateFilterActive && filterStartDate && filterEndDate && (
                  <Badge variant="secondary">
                    {format(filterStartDate, "dd/MM")} - {format(filterEndDate, "dd/MM")}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <div className="flex gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex-1 mobile-button"
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Xóa bộ lọc
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1 mobile-button bg-gradient-to-r from-blue-500 to-purple-600 text-white"
            >
              <Check className="h-4 w-4 mr-2" />
              Áp dụng ({resultCount})
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
} 