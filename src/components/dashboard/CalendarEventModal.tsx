"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CalendarIcon, 
  Heart, 
  Briefcase, 
  Gift, 
  Users, 
  Bell, 
  Cake, 
  FlowerIcon as Flower,
  Clock,
  MapPin
} from 'lucide-react';
import type { CalendarEvent, WorkSchedule, EventType, FamilyMember } from '@/types';
import { FAMILY_MEMBERS } from '@/lib/constants';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Partial<CalendarEvent> | Partial<WorkSchedule>) => void;
  mode: 'event' | 'work';
  editingItem?: CalendarEvent | WorkSchedule | null;
}

const eventTypeOptions: { value: EventType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'birthday', label: 'Sinh nhật', icon: <Cake className="h-4 w-4" />, color: '#FF6B6B' },
  { value: 'death_anniversary', label: 'Đám giỗ', icon: <Flower className="h-4 w-4" />, color: '#8B4513' },
  { value: 'wedding', label: 'Đám cưới', icon: <Heart className="h-4 w-4" />, color: '#E91E63' },
  { value: 'anniversary', label: 'Kỷ niệm', icon: <Gift className="h-4 w-4" />, color: '#9C27B0' },
  { value: 'meeting', label: 'Họp mặt', icon: <Users className="h-4 w-4" />, color: '#2196F3' },
  { value: 'reminder', label: 'Nhắc nhở', icon: <Bell className="h-4 w-4" />, color: '#FF9800' },
  { value: 'family', label: 'Gia đình', icon: <Heart className="h-4 w-4" />, color: '#4CAF50' },
  { value: 'work', label: 'Công việc', icon: <Briefcase className="h-4 w-4" />, color: '#607D8B' },
];

const priorityOptions = [
  { value: 'low', label: 'Thấp', color: '#4CAF50' },
  { value: 'medium', label: 'Trung bình', color: '#FF9800' },
  { value: 'high', label: 'Cao', color: '#F44336' },
];

const workColorOptions = [
  '#4A90E2', '#50E3C2', '#F5A623', '#D0021B', '#9013FE', '#00C853', '#FF6D00', '#E91E63'
];

export function CalendarEventModal({ 
  isOpen, 
  onClose, 
  onSave, 
  mode, 
  editingItem 
}: CalendarEventModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    editingItem ? new Date(editingItem.date) : new Date()
  );
  const [isLunarDate, setIsLunarDate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#4A90E2');

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: editingItem?.title || '',
      description: mode === 'event' ? (editingItem as CalendarEvent)?.description || '' : '',
      type: mode === 'event' ? (editingItem as CalendarEvent)?.type || 'family' : 'work',
      priority: mode === 'event' ? (editingItem as CalendarEvent)?.priority || 'medium' : undefined,
      startTime: mode === 'work' ? (editingItem as WorkSchedule)?.startTime || '09:00' : undefined,
      endTime: mode === 'work' ? (editingItem as WorkSchedule)?.endTime || '17:00' : undefined,
      employeeName: mode === 'work' ? (editingItem as WorkSchedule)?.employeeName || 'Minh Đan' : undefined,
      location: mode === 'work' ? (editingItem as WorkSchedule)?.location || '' : undefined,
      notes: mode === 'work' ? (editingItem as WorkSchedule)?.notes || '' : undefined,
      recurringPattern: 'yearly',
    }
  });

  const selectedEventType = eventTypeOptions.find(opt => opt.value === watch('type'));

  const handleSave = (data: any) => {
    if (!selectedDate) return;

    const baseData = {
      title: data.title,
      date: format(selectedDate, 'yyyy-MM-dd'),
      isRecurring,
      color: selectedColor,
    };

    if (mode === 'event') {
      const eventData: Partial<CalendarEvent> = {
        ...baseData,
        description: data.description,
        type: data.type,
        isLunarDate,
        recurringPattern: isRecurring ? data.recurringPattern : undefined,
        priority: data.priority,
        createdBy: 'Minh Đan', // This should come from current user
        familyId: 'family1', // This should come from current family
      };
      onSave(eventData);
    } else {
      const workData: Partial<WorkSchedule> = {
        ...baseData,
        startTime: data.startTime,
        endTime: data.endTime,
        employeeName: data.employeeName,
        location: data.location,
        notes: data.notes,
      };
      onSave(workData);
    }

    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'event' ? (
              <>
                <Heart className="h-5 w-5 text-pink-500" />
                {editingItem ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
              </>
            ) : (
              <>
                <Briefcase className="h-5 w-5 text-blue-500" />
                {editingItem ? 'Chỉnh sửa lịch làm việc' : 'Thêm lịch làm việc'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'event' 
              ? 'Tạo sự kiện gia đình như sinh nhật, kỷ niệm, đám giỗ...'
              : 'Tạo lịch trình công việc cho thành viên gia đình'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleSave)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Tiêu đề *</Label>
            <Input
              id="title"
              placeholder={mode === 'event' ? 'VD: Sinh nhật mẹ' : 'VD: Họp team dự án'}
              {...register('title', { required: 'Vui lòng nhập tiêu đề' })}
            />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Chọn ngày *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {mode === 'event' && (
            <>
              {/* Event Type */}
              <div className="space-y-2">
                <Label>Loại sự kiện</Label>
                <Select 
                  value={watch('type')} 
                  onValueChange={(value) => {
                    setValue('type', value as EventType);
                    const eventType = eventTypeOptions.find(opt => opt.value === value);
                    if (eventType) {
                      setSelectedColor(eventType.color);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  placeholder="Thêm chi tiết về sự kiện..."
                  {...register('description')}
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Mức độ ưu tiên</Label>
                <Select value={watch('priority')} onValueChange={(value) => setValue('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: option.color }}
                          />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lunar Date Option */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lunar"
                  checked={isLunarDate}
                  onCheckedChange={setIsLunarDate}
                />
                <Label htmlFor="lunar" className="text-sm">
                  Theo lịch âm (đặc biệt hữu ích cho đám giỗ)
                </Label>
              </div>
            </>
          )}

          {mode === 'work' && (
            <>
              {/* Employee Name */}
              <div className="space-y-2">
                <Label>Người thực hiện</Label>
                <Select value={watch('employeeName')} onValueChange={(value) => setValue('employeeName', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_MEMBERS.map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Giờ bắt đầu</Label>
                  <Input
                    id="startTime"
                    type="time"
                    {...register('startTime')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Giờ kết thúc</Label>
                  <Input
                    id="endTime"
                    type="time"
                    {...register('endTime')}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Địa điểm</Label>
                <Input
                  id="location"
                  placeholder="VD: Phòng họp A, Văn phòng..."
                  {...register('location')}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea
                  id="notes"
                  placeholder="Ghi chú thêm về công việc..."
                  {...register('notes')}
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <Label>Màu hiển thị</Label>
                <div className="flex gap-2 flex-wrap">
                  {workColorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-all",
                        selectedColor === color ? "border-gray-900 scale-110" : "border-gray-300"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Recurring Option */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
              <Label htmlFor="recurring" className="text-sm">
                Lặp lại hàng năm
              </Label>
            </div>

            {isRecurring && (
              <Select 
                value={watch('recurringPattern')} 
                onValueChange={(value) => setValue('recurringPattern', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yearly">Hàng năm</SelectItem>
                  <SelectItem value="monthly">Hàng tháng</SelectItem>
                  <SelectItem value="weekly">Hàng tuần</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Preview */}
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground mb-2">Xem trước:</p>
            <div 
              className="flex items-center gap-2 p-2 rounded text-white text-sm"
              style={{ backgroundColor: selectedColor }}
            >
              {mode === 'event' ? (
                selectedEventType?.icon
              ) : (
                <Briefcase className="h-4 w-4" />
              )}
              <span>{watch('title') || 'Tiêu đề sự kiện'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit">
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 