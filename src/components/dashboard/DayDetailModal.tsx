"use client";

import React, { useMemo } from 'react';
import { format, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Clock,
  User,
  DollarSign,
  Receipt,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/hooks/useAuth';
import { CATEGORIES } from '@/lib/constants';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events?: any[];
  workSchedules?: any[];
  onEditEvent?: (event: any) => void;
  onDeleteEvent?: (eventId: string) => void;
  onEditWork?: (work: any) => void;
  onDeleteWork?: (workId: string) => void;
}

export function DayDetailModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  events = [],
  workSchedules = [],
  onEditEvent,
  onDeleteEvent,
  onEditWork,
  onDeleteWork
}: DayDetailModalProps) {
  const { transactions } = useAuthStore();

  const dayData = useMemo(() => {
    if (!selectedDate || !isValid(selectedDate)) {
      return null;
    }

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    
    // Get transactions for this day
    const dayTransactions = transactions.filter(t => t.date === dateString);
    
    // Get events for this day
    const dayEvents = events.filter(event => event.date === dateString);
    
    // Get work schedules for this day
    const dayWork = workSchedules.filter(work => work.date === dateString);

    // Calculate totals
    const totalIncome = dayTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = dayTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netAmount = totalIncome - totalExpense;

    return {
      date: selectedDate,
      dateString,
      transactions: dayTransactions,
      events: dayEvents,
      workSchedules: dayWork,
      totalIncome,
      totalExpense,
      netAmount,
      transactionCount: dayTransactions.length
    };
  }, [selectedDate, transactions, events, workSchedules]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(cat => cat.id === categoryId);
  };

  if (!dayData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {format(dayData.date, 'EEEE, dd MMMM yyyy', { locale: vi })}
              </DialogTitle>
              <DialogDescription>
                Chi tiết giao dịch trong ngày
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700">Thu nhập</span>
                </div>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(dayData.totalIncome)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-700">Chi tiêu</span>
                </div>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(dayData.totalExpense)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-700">Còn lại</span>
                </div>
                <p className={cn(
                  "text-xl font-bold",
                  dayData.netAmount >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(dayData.netAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions */}
          {dayData.transactions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-500" />
                  Giao dịch ({dayData.transactionCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayData.transactions.map((transaction) => {
                  const category = getCategoryInfo(transaction.categoryId);
                  return (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          transaction.type === 'income' ? "bg-green-100" : "bg-red-100"
                        )}>
                          {category?.icon && (
                            <category.icon className={cn(
                              "h-4 w-4",
                              transaction.type === 'income' ? "text-green-600" : "text-red-600"
                            )} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{transaction.description}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{category?.name || 'Khác'}</span>
                            <span>•</span>
                            <span>{transaction.paymentSource === 'bank' ? 'Ngân hàng' : 'Tiền mặt'}</span>
                            <span>•</span>
                            <span>{transaction.performedBy}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-bold",
                          transaction.type === 'income' ? "text-green-600" : "text-red-600"
                        )}>
                          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {/* Events */}
          {dayData.events && dayData.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Sự kiện ({dayData.events.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayData.events.map((event: any) => (
                  <div 
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border-l-4 hover:bg-gray-50 transition-colors"
                    style={{ borderLeftColor: event.color || '#8B5CF6' }}
                  >
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${event.color || '#8B5CF6'}20`, color: event.color || '#8B5CF6' }}
                    >
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>👤 {event.createdBy}</span>
                        {event.isLunarDate && <span>🌙 Âm lịch</span>}
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.priority === 'high' ? 'bg-red-100 text-red-700' :
                          event.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {event.priority === 'high' ? 'Quan trọng' : 
                           event.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                        </span>
                      </div>
                    </div>
                    {(onEditEvent || onDeleteEvent) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditEvent && (
                            <DropdownMenuItem onClick={() => onEditEvent(event)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                          )}
                          {onDeleteEvent && (
                            <DropdownMenuItem 
                              onClick={() => onDeleteEvent(event.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Work Schedules */}
          {dayData.workSchedules && dayData.workSchedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Lịch làm việc ({dayData.workSchedules.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayData.workSchedules.map((work: any) => (
                  <div 
                    key={work.id}
                    className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{work.title}</h4>
                                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>⏰ {work.startTime} - {work.endTime}</span>
                        <span>👤 {work.employeeName}</span>
                        {work.location && <span>📍 {work.location}</span>}
                        {work.employeeName === 'Minh Hiếu' && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                            Có thể sửa
                          </span>
                        )}
                      </div>
                      {work.notes && (
                        <p className="text-sm text-gray-600 mt-2">{work.notes}</p>
                      )}
                    </div>
                    {(onEditWork || onDeleteWork) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onEditWork && (
                            <DropdownMenuItem onClick={() => onEditWork(work)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                          )}
                          {onDeleteWork && (
                            <DropdownMenuItem 
                              onClick={() => onDeleteWork(work.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {(!dayData.transactions || dayData.transactions.length === 0) && 
           (!dayData.events || dayData.events.length === 0) && 
           (!dayData.workSchedules || dayData.workSchedules.length === 0) && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Không có hoạt động</h3>
                <p className="text-gray-500 mb-4">
                  Chưa có giao dịch, sự kiện hoặc lịch làm việc nào trong ngày này
                </p>
                <Button onClick={() => window.location.href = '/transactions'}>
                  Thêm giao dịch
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 