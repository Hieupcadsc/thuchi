"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit2, 
  Trash2, 
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import { CATEGORIES, FAMILY_MEMBERS } from '@/lib/constants';
import type { Transaction } from '@/types';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileTransactionListProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onSelect?: (transactionId: string) => void;
  selectedIds?: string[];
  isLoading?: boolean;
}

export function MobileTransactionList({ 
  transactions, 
  onEdit, 
  onDelete,
  onSelect,
  selectedIds = [],
  isLoading = false
}: MobileTransactionListProps) {
  const formatMobileCurrency = (amount: number): string => {
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId) || { 
      name: 'Khác', 
      icon: Tag, 
      type: 'expense' 
    };
  };

  const getMemberDisplayName = (memberId: string) => {
    return FAMILY_MEMBERS.find(member => member === memberId) || memberId;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">💸</div>
          <p className="text-lg font-medium mb-2">Chưa có giao dịch nào</p>
          <p className="text-sm">Hãy thêm giao dịch đầu tiên để bắt đầu!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const category = getCategoryInfo(transaction.categoryId);
        const CategoryIcon = category.icon;
        const isSelected = selectedIds.includes(transaction.id);
        const transactionDate = parseISO(transaction.date);

        return (
          <Card 
            key={transaction.id}
            className={`transition-all duration-200 ${
              isSelected 
                ? 'ring-2 ring-primary bg-blue-50 dark:bg-blue-950' 
                : 'hover:shadow-md'
            }`}
            onClick={() => onSelect?.(transaction.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Category Icon */}
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'income' 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}>
                    <CategoryIcon className={`h-4 w-4 ${
                      transaction.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`} />
                  </div>

                  {/* Transaction Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {transaction.description}
                      </h3>
                      {transaction.type === 'income' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>{format(transactionDate, 'dd/MM/yyyy', { locale: vi })}</span>
                      <User className="h-3 w-3 ml-1" />
                      <span>{getMemberDisplayName(transaction.performedBy)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs py-0">
                        {category.name}
                      </Badge>
                      {transaction.paymentSource && (
                        <Badge variant="outline" className="text-xs py-0">
                          {transaction.paymentSource === 'bank' ? 'NH' : 'TM'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount and Actions */}
                <div className="flex items-start gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className={`font-bold text-sm ${
                      transaction.type === 'income' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatMobileCurrency(transaction.amount)}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(transaction);
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(transaction.id);
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Note */}
              {transaction.note && (
                <div className="mt-3 p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">{transaction.note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 