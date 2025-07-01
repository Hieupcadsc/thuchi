"use client";

import React, { useState, useMemo } from 'react';
import { format, isToday, isTomorrow, addDays, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Bell, 
  X, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Heart,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/hooks/useAuth';

interface Notification {
  id: string;
  type: 'event' | 'financial' | 'system' | 'goal';
  title: string;
  message: string;
  date?: string;
  priority: 'low' | 'medium' | 'high';
  icon: React.ReactNode;
  actionUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationCenterProps {
  workSchedules?: any[]; // Work schedules for Minh Hiếu notifications
  uploadNotifications?: any[]; // Upload success notifications
}

export function NotificationCenter({ workSchedules = [], uploadNotifications = [] }: NotificationCenterProps = {}) {
  const { transactions, familyId, currentUser } = useAuthStore();
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate real notifications from data
  const notifications = useMemo(() => {
    if (!currentUser || !familyId || !transactions) return [];

    const now = new Date();
    const currentMonth = startOfMonth(now);
    const lastMonth = startOfMonth(addDays(currentMonth, -1));
    
    // Get current month and last month transactions
    const currentMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= currentMonth && tDate <= endOfMonth(now);
    });
    
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= lastMonth && tDate < currentMonth;
    });

    const realNotifications: Notification[] = [];

    // 1. Financial Alerts
    const currentExpense = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const lastExpense = lastMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastExpense > 0) {
      const expenseChange = ((currentExpense - lastExpense) / lastExpense) * 100;
      
      if (expenseChange > 20) {
        realNotifications.push({
          id: 'expense-alert',
          type: 'financial',
          title: 'Chi tiêu tăng cao bất thường',
          message: `Chi tiêu tháng này tăng ${expenseChange.toFixed(1)}% so với tháng trước (${new Intl.NumberFormat('vi-VN').format(currentExpense)} VND)`,
          priority: 'high',
          icon: <TrendingUp className="h-4 w-4" />,
          actionUrl: '/reports',
          isRead: readNotifications.has('expense-alert'),
          createdAt: now
        });
      } else if (expenseChange < -15) {
        realNotifications.push({
          id: 'expense-good',
          type: 'financial',
          title: 'Tiết kiệm tốt tháng này',
          message: `Chi tiêu giảm ${Math.abs(expenseChange).toFixed(1)}% so với tháng trước. Tuyệt vời!`,
          priority: 'low',
          icon: <TrendingDown className="h-4 w-4" />,
          actionUrl: '/reports',
          isRead: readNotifications.has('expense-good'),
          createdAt: now
        });
      }
    }

    // 2. Daily Transaction Reminders
    const today = format(now, 'yyyy-MM-dd');
    const todayTransactions = transactions.filter(t => t.date === today);
    
    if (todayTransactions.length === 0 && new Date().getHours() > 18) {
      realNotifications.push({
        id: 'no-transactions-today',
        type: 'system',
        title: 'Chưa có giao dịch hôm nay',
        message: 'Bạn chưa ghi nhận giao dịch nào hôm nay. Đừng quên cập nhật chi tiêu nhé!',
        priority: 'medium',
        icon: <Calendar className="h-4 w-4" />,
        actionUrl: '/transactions',
        isRead: readNotifications.has('no-transactions-today'),
        createdAt: now
      });
    }

    // 3. Weekend Spending Review
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 && new Date().getHours() > 19) { // Sunday evening
      const weekTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const diffDays = differenceInDays(now, tDate);
        return diffDays <= 7;
      });
      
      const weekExpense = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      if (weekExpense > 0) {
        realNotifications.push({
          id: 'week-review',
          type: 'financial',
          title: 'Tổng kết chi tiêu tuần',
          message: `Tuần này bạn đã chi ${new Intl.NumberFormat('vi-VN').format(weekExpense)} VND qua ${weekTransactions.length} giao dịch`,
          priority: 'low',
          icon: <Calendar className="h-4 w-4" />,
          actionUrl: '/reports',
          isRead: readNotifications.has('week-review'),
          createdAt: now
        });
      }
    }

    // 4. Large Transaction Alert
    const recentLargeTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      const diffDays = differenceInDays(now, tDate);
      return diffDays <= 3 && t.amount > 1000000; // > 1M VND
    });

    recentLargeTransactions.forEach(t => {
      const id = `large-${t.id}`;
      realNotifications.push({
        id,
        type: 'financial',
        title: 'Giao dịch lớn gần đây',
        message: `${t.type === 'income' ? 'Thu nhập' : 'Chi tiêu'} ${new Intl.NumberFormat('vi-VN').format(t.amount)} VND - ${t.description}`,
        date: t.date,
        priority: 'medium',
        icon: t.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
        actionUrl: `/transactions?search=${t.id}`,
        isRead: readNotifications.has(id),
        createdAt: new Date(t.date)
      });
    });

    // 5. Budget Goals (mock for now - would come from FamilyGoalsTracker in real app)
    const monthlyBudget = 8000000; // 8M VND budget
    const budgetUsed = (currentExpense / monthlyBudget) * 100;

    if (budgetUsed > 80) {
      realNotifications.push({
        id: 'budget-warning',
        type: 'goal',
        title: 'Gần đạt ngân sách tháng',
        message: `Đã sử dụng ${budgetUsed.toFixed(1)}% ngân sách tháng (${new Intl.NumberFormat('vi-VN').format(currentExpense)}/${new Intl.NumberFormat('vi-VN').format(monthlyBudget)} VND)`,
        priority: budgetUsed > 95 ? 'high' : 'medium',
        icon: <Target className="h-4 w-4" />,
        actionUrl: '/smart-hub',
        isRead: readNotifications.has('budget-warning'),
        createdAt: now
      });
    }

    // 6. Work Schedule Notifications for Minh Hiếu
    if (workSchedules && workSchedules.length > 0) {
      const upcomingWorkDays: string[] = [];
      const personalDays: string[] = [];
      
      for (let i = 0; i < 7; i++) {
        const checkDate = addDays(now, i);
        const checkDateStr = format(checkDate, 'yyyy-MM-dd');
        
        const schedulesForDate = workSchedules.filter(ws => 
          ws.date === checkDateStr && ws.employeeName === 'Minh Hiếu'
        );
        
        schedulesForDate.forEach(schedule => {
          const dateDisplay = format(checkDate, 'dd/MM');
          
          if (schedule.title?.includes('Nghỉ') || schedule.title?.includes('OFF') || schedule.title?.includes('PERSONAL')) {
            personalDays.push(`${dateDisplay} (${schedule.title})`);
          } else {
            const shiftType = schedule.title?.includes('L2') ? 'ca chiều' :
                            schedule.title?.includes('D2') ? 'ca sáng' :
                            schedule.title?.includes('T2') ? 'ca tối' : 'ca làm';
            upcomingWorkDays.push(`${dateDisplay} (${shiftType})`);
          }
        });
      }
      
      if (upcomingWorkDays.length > 0) {
        realNotifications.push({
          id: 'work-schedule-upcoming',
          type: 'event',
          title: '📅 Lịch làm việc Minh Hiếu',
          message: `Minh Hiếu có ca làm việc: ${upcomingWorkDays.join(', ')}`,
          priority: 'medium',
          icon: <Briefcase className="h-4 w-4" />,
          actionUrl: '/dashboard',
          isRead: readNotifications.has('work-schedule-upcoming'),
          createdAt: now
        });
      }

      if (personalDays.length > 0) {
        realNotifications.push({
          id: 'personal-days-alert',
          type: 'event',
          title: '🏖️ Minh Hiếu nghỉ phép',
          message: `Minh Hiếu nghỉ: ${personalDays.join(', ')} - Có thể đi chơi cùng! 😎`,
          priority: 'high',
          icon: <Heart className="h-4 w-4" />,
          actionUrl: '/dashboard',
          isRead: readNotifications.has('personal-days-alert'),
          createdAt: now
        });
      }
    }

    // Add upload notifications
    uploadNotifications.forEach(uploadNotif => {
      realNotifications.push({
        id: uploadNotif.id,
        type: 'system',
        title: uploadNotif.title,
        message: uploadNotif.message,
        priority: uploadNotif.priority,
        icon: <CheckCircle className="h-4 w-4" />,
        isRead: readNotifications.has(uploadNotif.id),
        createdAt: uploadNotif.timestamp
      });
    });

    return realNotifications.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [transactions, currentUser, familyId, readNotifications, uploadNotifications]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  const recentNotifications = useMemo(() => 
    notifications.slice(0, isExpanded ? notifications.length : 3),
    [notifications, isExpanded]
  );

  const markAsRead = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const markAllAsRead = () => {
    setReadNotifications(new Set(notifications.map(n => n.id)));
  };

  const deleteNotification = (id: string) => {
    setReadNotifications(prev => new Set([...prev, id]));
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'high') return 'border-l-red-500 bg-red-50';
    if (type === 'financial') return 'border-l-blue-500 bg-blue-50';
    if (type === 'event') return 'border-l-purple-500 bg-purple-50';
    if (type === 'goal') return 'border-l-green-500 bg-green-50';
    return 'border-l-gray-500 bg-gray-50';
  };

  const getRelativeTime = (date: string) => {
    const targetDate = new Date(date);
    const today = new Date();
    const diffDays = differenceInDays(targetDate, today);
    
    if (isToday(targetDate)) return 'Hôm nay';
    if (isTomorrow(targetDate)) return 'Ngày mai';
    if (diffDays > 0 && diffDays <= 7) return `${diffDays} ngày nữa`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} ngày trước`;
    return format(targetDate, 'dd/MM', { locale: vi });
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Thông báo
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-1">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Đánh dấu đã đọc
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm"
            >
              {isExpanded ? 'Thu gọn' : 'Xem tất cả'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Không có thông báo mới</p>
            <p className="text-sm">Hệ thống sẽ thông báo về chi tiêu và mục tiêu của bạn</p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <div
              key={notification.id}
              className={cn(
                "relative p-4 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer",
                getNotificationColor(notification.type, notification.priority),
                !notification.isRead && "shadow-sm"
              )}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn(
                    "p-2 rounded-full",
                    notification.priority === 'high' ? 'bg-red-100 text-red-600' :
                    notification.type === 'financial' ? 'bg-blue-100 text-blue-600' :
                    notification.type === 'event' ? 'bg-purple-100 text-purple-600' :
                    notification.type === 'goal' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {notification.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn(
                        "font-semibold text-sm",
                        !notification.isRead && "text-foreground",
                        notification.isRead && "text-muted-foreground"
                      )}>
                        {notification.title}
                      </h4>
                      {notification.date && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {getRelativeTime(notification.date)}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    
                    {notification.actionUrl && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto mt-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = notification.actionUrl!;
                        }}
                      >
                        Xem chi tiết →
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}

        {!isExpanded && notifications.length > 3 && (
          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={() => setIsExpanded(true)}
          >
            Xem thêm {notifications.length - 3} thông báo
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 