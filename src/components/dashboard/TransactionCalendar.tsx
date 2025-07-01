"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Heart,
  Briefcase,
  Gift,
  Plus,
  Moon,
  Sun,
  Users,
  FlowerIcon as Flower,
  Cake,
  Bell,
  Dot,
  Camera
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useAuthStore } from '@/hooks/useAuth';
import type { Transaction, CalendarEvent, WorkSchedule, CalendarDay, LunarDate } from '@/types';
import { cn } from '@/lib/utils';
import { CalendarEventModal } from './CalendarEventModal';
import { DayDetailModal } from './DayDetailModal';
import { WorkScheduleEditModal } from './WorkScheduleEditModal';
import { SimpleScheduleInput } from './SimpleScheduleInput';

// Vietnamese Lunar calendar conversion
const solarToLunar = (date: Date): LunarDate => {
  try {
    // Try using lunar package
    const lunar = require('lunar');
    const result = lunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    console.log('lunar package result:', result);
    
    if (result && result.lDay && result.lMonth) {
      return {
        day: result.lDay,
        month: result.lMonth,
        year: result.lYear,
        isLeapMonth: result.isLeap || false
      };
    }
  } catch (error) {
    console.log('Lunar package error:', error);
  }
  
  try {
    // Try solarlunar-vi as backup
    const solarLunar = require('solarlunar-vi');
    const result = solarLunar.solar2lunar(date.getFullYear(), date.getMonth() + 1, date.getDate());
    
    if (result && result.lunarDay && result.lunarMonth) {
      return {
        day: result.lunarDay,
        month: result.lunarMonth,
        year: result.lunarYear,
        isLeapMonth: result.isLeapMonth || false
      };
    }
  } catch (error) {
    console.log('Solarlunar-vi error:', error);
  }
  
  // Manual calculation với ngày chuẩn
  // Hôm nay 21/6/2025 = 27/5 âm lịch (tham chiếu chính xác)
  const refSolar = new Date(2025, 5, 21); // 21/6/2025 (month is 0-indexed)
  const refLunar = { day: 27, month: 5, year: 2025 };
  
  // Tính sự khác biệt số ngày
  const diffTime = date.getTime() - refSolar.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Tính ngày âm lịch dựa trên tham chiếu
  let lunarDay = refLunar.day + diffDays;
  let lunarMonth = refLunar.month;
  let lunarYear = refLunar.year;
  
  // Xử lý ranh giới tháng (tháng âm lịch có 29-30 ngày)
  while (lunarDay > 30) {
    lunarDay -= 30; // Giả sử tháng có 30 ngày
    lunarMonth++;
    if (lunarMonth > 12) {
      lunarMonth = 1;
      lunarYear++;
    }
  }
  
  while (lunarDay < 1) {
    lunarDay += 30;
    lunarMonth--;
    if (lunarMonth < 1) {
      lunarMonth = 12;
      lunarYear--;
    }
  }
  
  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    isLeapMonth: false
  };
};

// Sample data - in production this would come from your database
const sampleEvents: CalendarEvent[] = [
  {
    id: '1',
    familyId: 'family1',
    title: 'Đám giỗ ông nội',
    description: 'Tưởng niệm ông nội',
    type: 'death_anniversary',
    date: '2024-12-20',
    isRecurring: true,
    recurringPattern: 'yearly',
    isLunarDate: true,
    lunarDate: { day: 15, month: 11, isLeapMonth: false },
    createdBy: 'Minh Đan',
    color: '#8B4513',
    priority: 'high'
  },
  {
    id: '2',
    familyId: 'family1',
    title: 'Sinh nhật Minh Hiếu',
    description: 'Sinh nhật anh Hiếu',
    type: 'birthday',
    date: '2024-12-25',
    isRecurring: true,
    recurringPattern: 'yearly',
    isLunarDate: false,
    createdBy: 'Minh Đan',
    color: '#FF6B6B',
    priority: 'high'
  }
];

const sampleWorkSchedules: WorkSchedule[] = [
  {
    id: '1',
    employeeName: 'Minh Đan',
    title: 'Họp team',
    startTime: '09:00',
    endTime: '10:30',
    date: '2024-12-18',
    isRecurring: false,
    location: 'Phòng họp A',
    color: '#4A90E2'
  }
];

interface TransactionCalendarProps {
  onUploadSuccess?: (result: any) => void;
}

export function TransactionCalendar({ onUploadSuccess }: TransactionCalendarProps = {}) {
  const { transactions, familyId } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'all' | 'transactions' | 'events' | 'work'>('all');
  const [showLunar, setShowLunar] = useState(true);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'event' | 'work'>('event');
  const [editingItem, setEditingItem] = useState<CalendarEvent | WorkSchedule | null>(null);
  const [isDayDetailModalOpen, setIsDayDetailModalOpen] = useState(false);
  const [selectedDayDetail, setSelectedDayDetail] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [isWorkEditModalOpen, setIsWorkEditModalOpen] = useState(false);
  const [editingWorkSchedule, setEditingWorkSchedule] = useState<WorkSchedule | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Load events and work schedules
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!familyId) return;
      
      try {
        const [eventsRes, schedulesRes] = await Promise.all([
          fetch(`/api/events?familyId=${familyId}`),
          fetch(`/api/work-schedules?familyId=${familyId}`)
        ]);

        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(eventsData.events || []);
        }

        if (schedulesRes.ok) {
          const schedulesData = await schedulesRes.json();
          setWorkSchedules(schedulesData.schedules || []);
        }
      } catch (error) {
        console.error('Error loading calendar data:', error);
      }
    };

    loadCalendarData();
  }, [familyId]);

  // Calculate calendar days with all data
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return days.map(date => {
      // Transactions for this date
      const dayTransactions = transactions.filter(t => 
        isSameDay(new Date(t.date), date)
      );

      // Events for this date
      const dayEvents = events.filter(event => 
        isSameDay(new Date(event.date), date)
      );

      // Work schedules for this date
      const dayWorkSchedules = workSchedules.filter(schedule => 
        isSameDay(new Date(schedule.date), date)
      );

      const totalIncome = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const lunarDate = solarToLunar(date);
      
      // Debug log for first few days
      if (date.getDate() <= 3) {
        console.log(`Solar: ${format(date, 'yyyy-MM-dd')} -> Lunar: ${lunarDate.day}/${lunarDate.month}`);
      }

      return {
        date,
        isCurrentMonth: isSameMonth(date, currentDate),
        transactions: dayTransactions,
        events: dayEvents,
        workSchedules: dayWorkSchedules,
        totalIncome,
        totalExpense,
        lunarDate,
      } as CalendarDay;
    });
  }, [currentDate, transactions, events, workSchedules]);

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddEvent = () => {
    setModalMode('event');
    setEditingItem(null);
    setIsEventModalOpen(true);
  };

  const handleAddWork = () => {
    setModalMode('work');
    setEditingItem(null);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (data: Partial<CalendarEvent> | Partial<WorkSchedule>) => {
    try {
      if (modalMode === 'event') {
        const eventData = data as Partial<CalendarEvent>;
        eventData.familyId = familyId || 'family1';
        
        if (editingItem && 'type' in editingItem) {
          // Editing existing event
          const response = await fetch('/api/events', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingItem.id, ...eventData })
          });
          
          if (response.ok) {
            setEvents(prev => prev.map(event => 
              event.id === editingItem.id ? { ...event, ...eventData } : event
            ));
          }
        } else {
          // Creating new event
          const response = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventData)
          });
          
          if (response.ok) {
            const result = await response.json();
            setEvents(prev => [...prev, result.event]);
          }
        }
      } else {
        const workData = data as Partial<WorkSchedule>;
        
        if (editingItem && 'employeeName' in editingItem) {
          // Editing existing work schedule
          const response = await fetch('/api/work-schedules', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingItem.id, ...workData })
          });
          
          if (response.ok) {
            setWorkSchedules(prev => prev.map(work => 
              work.id === editingItem.id ? { ...work, ...workData } : work
            ));
          }
        } else {
          // Creating new work schedule
          workData.familyId = familyId || 'family1';
          const response = await fetch('/api/work-schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workData)
          });
          
          if (response.ok) {
            const result = await response.json();
            setWorkSchedules(prev => [...prev, result.schedule]);
          }
        }
      }
      
      setEditingItem(null);
      setIsEventModalOpen(false);
    } catch (error) {
      console.error('Error saving event/work:', error);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDayDetail(date);
    setIsDayDetailModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingItem(event);
    setModalMode('event');
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Bạn có chắc muốn xóa sự kiện này?')) {
      try {
        const response = await fetch(`/api/events?id=${eventId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setEvents(prev => prev.filter(event => event.id !== eventId));
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleEditWork = (work: WorkSchedule) => {
    setEditingWorkSchedule(work);
    setIsWorkEditModalOpen(true);
  };

  const handleDeleteWork = async (workId: string) => {
    if (confirm('Bạn có chắc muốn xóa lịch làm việc này?')) {
      try {
        const response = await fetch(`/api/work-schedules?id=${workId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setWorkSchedules(prev => prev.filter(work => work.id !== workId));
        }
      } catch (error) {
        console.error('Error deleting work schedule:', error);
      }
    }
  };

  const handleSaveWorkSchedule = async (scheduleId: string, updates: Partial<WorkSchedule>) => {
    try {
      const response = await fetch('/api/work-schedules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: scheduleId, ...updates })
      });
      
      if (response.ok) {
        setWorkSchedules(prev => prev.map(work => 
          work.id === scheduleId ? { ...work, ...updates } : work
        ));
      }
    } catch (error) {
      console.error('Error updating work schedule:', error);
    }
  };

  const handleDeleteWorkSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/work-schedules?id=${scheduleId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setWorkSchedules(prev => prev.filter(work => work.id !== scheduleId));
      }
    } catch (error) {
      console.error('Error deleting work schedule:', error);
    }
  };



  const weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <Card className="w-full shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-gray-900 dark:to-gray-800 overflow-visible">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-100 text-gray-800 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold flex items-center gap-3">
          <Calendar className="h-6 w-6" />
          Lịch Gia Đình Thông Minh
        </CardTitle>
                      <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={showLunar ? "secondary" : "outline"} 
                      size="default" 
                      onClick={() => setShowLunar(!showLunar)}
                      className="h-9 px-4 text-sm"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Âm lịch
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showLunar ? 'Ẩn' : 'Hiện'} âm lịch</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <Button variant="outline" size="default" onClick={handleToday} className="h-9 px-4 text-sm border-gray-300 text-gray-700 hover:bg-gray-50">
                <Sun className="h-4 w-4 mr-2" />
                Hôm nay
              </Button>
            </div>
        </div>
        
        {/* Enhanced View Mode Filter */}
        <div className="flex gap-2 mt-4">
          {([
            { key: 'all', label: 'Tất cả', icon: Calendar },
            { key: 'transactions', label: 'Thu chi', icon: TrendingUp },
            { key: 'events', label: 'Sự kiện', icon: Heart },
            { key: 'work', label: 'Công việc', icon: Briefcase }
          ] as const).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={viewMode === key ? "secondary" : "ghost"}
              size="default"
              onClick={() => setViewMode(key)}
              className="h-9 px-4 text-sm text-gray-700 hover:bg-gray-200 transition-all duration-200"
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Button>
          ))}
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" size="lg" onClick={handlePrevMonth} className="h-12 w-12 p-0 text-gray-700 hover:bg-gray-200 rounded-xl">
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="text-center">
            <h3 className="text-2xl font-bold">
              {format(currentDate, 'MMMM yyyy', { locale: vi })}
            </h3>
            {showLunar && (
              <p className="text-sm text-gray-600 mt-1">
                Tháng {solarToLunar(currentDate).month} Âm lịch
              </p>
            )}
          </div>
          
          <Button variant="ghost" size="lg" onClick={handleNextMonth} className="h-12 w-12 p-0 text-gray-700 hover:bg-gray-200 rounded-xl">
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" size="lg" onClick={handleAddEvent} className="h-11 px-6 text-sm flex-1 font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Thêm Sự Kiện
          </Button>
          <Button variant="outline" size="lg" onClick={handleAddWork} className="h-11 px-6 text-sm flex-1 text-gray-700 border-gray-300 hover:bg-gray-50 font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Thêm Công Việc
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => setIsUploadModalOpen(true)} 
            className="h-11 px-4 text-sm text-blue-700 border-blue-300 hover:bg-blue-50 font-semibold"
            title="Nhập lịch làm việc thủ công"
          >
            <Camera className="h-4 w-4 mr-2" />
            Nhập Lịch
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Week headers - Enhanced styling */}
          {weekDays.map((day, index) => (
            <div 
              key={day} 
              className={cn(
                "h-16 flex items-center justify-center text-lg font-bold bg-gradient-to-b from-gray-50 to-gray-100 border-b-2 border-r border-gray-200 shadow-sm",
                index === 6 && "text-red-600", // Sunday in red
                index === 5 && "text-blue-600", // Saturday in blue
                index < 5 && "text-gray-700" // Weekdays in gray
              )}
            >
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map((day, index) => (
            <CompactCalendarDayCell 
              key={index} 
              day={day} 
              viewMode={viewMode}
              showLunar={showLunar}
              onDayClick={handleDayClick}
            />
          ))}
        </div>
      </CardContent>

      {/* Event Modal */}
      <CalendarEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        mode={modalMode}
        editingItem={editingItem}
      />

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={isDayDetailModalOpen}
        onClose={() => setIsDayDetailModalOpen(false)}
        selectedDate={selectedDayDetail}
        events={events}
        workSchedules={workSchedules}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onEditWork={handleEditWork}
        onDeleteWork={handleDeleteWork}
      />

      {/* Work Schedule Edit Modal */}
      <WorkScheduleEditModal
        isOpen={isWorkEditModalOpen}
        onClose={() => {
          setIsWorkEditModalOpen(false);
          setEditingWorkSchedule(null);
        }}
        workSchedule={editingWorkSchedule}
        onSave={handleSaveWorkSchedule}
        onDelete={handleDeleteWorkSchedule}
      />

      {/* Manual Schedule Input Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsUploadModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nhập Lịch Làm Việc</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <SimpleScheduleInput onSuccess={(result) => {
              setIsUploadModalOpen(false);
              
              // Call parent notification handler
              if (onUploadSuccess && result) {
                onUploadSuccess(result);
              }
              
              // Auto navigate to the input month if provided
              if (result?.summary?.month && result?.summary?.year) {
                const inputDate = new Date(result.summary.year, result.summary.month - 1, 1);
                setCurrentDate(inputDate);
              }
              
              // Reload calendar data
              if (familyId) {
                Promise.all([
                  fetch(`/api/events?familyId=${familyId}`).then(res => res.json()).then(data => setEvents(data.events || [])),
                  fetch(`/api/work-schedules?familyId=${familyId}`).then(res => res.json()).then(data => setWorkSchedules(data.schedules || []))
                ]).catch(console.error);
              }
            }} />
          </div>
        </div>
      )}
    </Card>
  );
}

interface CompactCalendarDayCellProps {
  day: CalendarDay;
  viewMode: 'all' | 'transactions' | 'events' | 'work';
  showLunar: boolean;
  onDayClick: (date: Date) => void;
}

function CompactCalendarDayCell({ day, viewMode, showLunar, onDayClick }: CompactCalendarDayCellProps) {
  const isToday = isSameDay(day.date, new Date());
  const hasTransactions = day.transactions.length > 0;
  const hasEvents = day.events.length > 0;
  const hasWork = day.workSchedules.length > 0;
  const hasAnyActivity = hasTransactions || hasEvents || hasWork;

  const shouldShowTransactions = viewMode === 'all' || viewMode === 'transactions';
  const shouldShowEvents = viewMode === 'all' || viewMode === 'events';
  const shouldShowWork = viewMode === 'all' || viewMode === 'work';

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'birthday': return <Cake className="h-4 w-4" />;
      case 'death_anniversary': return <Flower className="h-4 w-4" />;
      case 'wedding': return <Heart className="h-4 w-4" />;
      case 'anniversary': return <Gift className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'reminder': return <Bell className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className={cn(
        "relative h-32 p-3 border-r border-b border-gray-200 hover:bg-gray-50 transition-all duration-200 cursor-pointer bg-white hover:shadow-md",
        !day.isCurrentMonth && "bg-gray-50/50 text-gray-400",
        isToday && "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 border-2 shadow-md ring-1 ring-blue-200",
        hasAnyActivity && "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
      )}
      onClick={() => onDayClick(day.date)}
      title="Click để xem chi tiết ngày này"
    >
      {/* Date header - Enhanced */}
      <div className="flex justify-between items-start mb-2">
        <div className={cn(
          "text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
          isToday && "bg-blue-500 text-white shadow-lg font-extrabold",
          !isToday && !day.isCurrentMonth && "text-gray-400",
          !isToday && day.isCurrentMonth && "text-gray-700 hover:bg-gray-100"
        )}>
          {format(day.date, 'd')}
        </div>
        {showLunar && (
          <div className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-full">
            {day.lunarDate.day}/{day.lunarDate.month}
            {day.lunarDate.isLeapMonth && '*'}
          </div>
        )}
      </div>

      {/* Content area - spacious */}
      <div className="space-y-1.5 text-sm">
        {/* Transactions */}
        {shouldShowTransactions && hasTransactions && (
          <div className="space-y-1">
            {day.totalIncome > 0 && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-bold text-sm">
                  {formatExpandedCurrency(day.totalIncome)}
                </span>
              </div>
            )}
            {day.totalExpense > 0 && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <TrendingDown className="h-4 w-4" />
                <span className="font-bold text-sm">
                  {formatExpandedCurrency(day.totalExpense)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Events - with text */}
        {shouldShowEvents && hasEvents && (
          <div className="space-y-1">
            {day.events.slice(0, 2).map((event) => (
              <TooltipProvider key={event.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white text-sm cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                      style={{ backgroundColor: event.color || '#8B5CF6' }}
                    >
                      {getEventIcon(event.type)}
                      <span className="truncate font-semibold">{event.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{event.title}</p>
                      {event.description && <p className="text-sm">{event.description}</p>}
                      <p className="text-sm">👤 {event.createdBy}</p>
                      {event.isLunarDate && <p className="text-sm">🌙 Theo âm lịch</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {day.events.length > 2 && (
              <div className="text-sm text-muted-foreground font-semibold">
                +{day.events.length - 2} sự kiện
              </div>
            )}
          </div>
        )}

        {/* Work schedules - with more detail */}
        {shouldShowWork && hasWork && (
          <div className="space-y-1">
            {day.workSchedules.slice(0, 2).map((schedule) => (
              <TooltipProvider key={schedule.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white text-sm cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                      style={{ backgroundColor: schedule.color || '#6366F1' }}
                    >
                      <Briefcase className="h-4 w-4" />
                      <span className="truncate font-semibold">{schedule.title}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{schedule.title}</p>
                      <p className="text-sm">⏰ {schedule.startTime} - {schedule.endTime}</p>
                      <p className="text-sm">👤 {schedule.employeeName}</p>
                      {schedule.location && <p className="text-sm">📍 {schedule.location}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {day.workSchedules.length > 2 && (
              <div className="text-sm text-muted-foreground font-semibold">
                +{day.workSchedules.length - 2} việc
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today indicator - bigger */}
      {isToday && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg"></div>
      )}

      {/* Priority indicator - more prominent */}
      {day.events.some(e => e.priority === 'high') && (
        <div className="absolute bottom-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-md"></div>
      )}
    </div>
  );
}

// Expanded currency formatting - more readable
const formatExpandedCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toLocaleString('vi-VN');
}; 