"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, Trash2, Calendar } from 'lucide-react';
import { WorkSchedule } from '@/types';

interface WorkScheduleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workSchedule: WorkSchedule | null;
  onSave: (scheduleId: string, updates: Partial<WorkSchedule>) => Promise<void>;
  onDelete: (scheduleId: string) => Promise<void>;
}

const SHIFT_TYPES = [
  { value: 'L2', label: 'Ca L2 - Chiều', time: '14:00-23:00', color: '#10B981' },
  { value: 'D2', label: 'Ca D2 - Sáng', time: '06:00-14:00', color: '#F59E0B' },
  { value: 'T2', label: 'Ca T2 - Tối', time: '22:00-07:00', color: '#EF4444' },
  { value: 'OFF', label: 'Nghỉ phép', time: 'Cả ngày', color: '#6B7280' },
  { value: 'SICK', label: 'Nghỉ ốm', time: 'Cả ngày', color: '#DC2626' },
  { value: 'PERSONAL', label: 'Nghỉ cá nhân', time: 'Cả ngày', color: '#7C3AED' }
];

export function WorkScheduleEditModal({ 
  isOpen, 
  onClose, 
  workSchedule, 
  onSave, 
  onDelete 
}: WorkScheduleEditModalProps) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (workSchedule && isOpen) {
      setTitle(workSchedule.title || '');
      setStartTime(workSchedule.startTime || '');
      setEndTime(workSchedule.endTime || '');
      setLocation(workSchedule.location || '');
      setNotes(workSchedule.notes || '');
      
      // Detect shift type based on title
      const shiftType = SHIFT_TYPES.find(shift => 
        workSchedule.title?.includes(shift.value)
      );
      setSelectedShift(shiftType?.value || 'CUSTOM');
    }
  }, [workSchedule, isOpen]);

  const handleShiftChange = (shiftValue: string) => {
    setSelectedShift(shiftValue);
    const shift = SHIFT_TYPES.find(s => s.value === shiftValue);
    
    if (shift) {
      if (shift.value === 'L2') {
        setTitle('Ca L2 - Chiều');
        setStartTime('14:00');
        setEndTime('23:00');
        setLocation('Công ty MIS');
      } else if (shift.value === 'D2') {
        setTitle('Ca D2 - Sáng');
        setStartTime('06:00');
        setEndTime('14:00');
        setLocation('Công ty MIS');
      } else if (shift.value === 'T2') {
        setTitle('Ca T2 - Tối');
        setStartTime('22:00');
        setEndTime('07:00');
        setLocation('Công ty MIS');
      } else if (shift.value === 'OFF') {
        setTitle('Nghỉ phép');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setNotes('Nghỉ phép cá nhân');
      } else if (shift.value === 'SICK') {
        setTitle('Nghỉ ốm');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setNotes('Nghỉ ốm');
      } else if (shift.value === 'PERSONAL') {
        setTitle('Nghỉ cá nhân');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setNotes('Nghỉ cá nhân - trốn đi chơi 😎');
      }
    }
  };

  const handleSave = async () => {
    if (!workSchedule) return;

    setIsSaving(true);
    try {
      const updates: Partial<WorkSchedule> = {
        title,
        startTime,
        endTime,
        location,
        notes,
        color: SHIFT_TYPES.find(s => s.value === selectedShift)?.color || workSchedule.color
      };

      await onSave(workSchedule.id, updates);
      onClose();
    } catch (error) {
      console.error('Error saving work schedule:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!workSchedule) return;
    
    if (!confirm('Bạn có chắc muốn xóa ca làm việc này không?')) return;

    setIsDeleting(true);
    try {
      await onDelete(workSchedule.id);
      onClose();
    } catch (error) {
      console.error('Error deleting work schedule:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!workSchedule) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <DialogTitle>Sửa lịch làm việc</DialogTitle>
          </div>
          <DialogDescription>
            Ngày {format(new Date(workSchedule.date), 'dd/MM/yyyy')} - {workSchedule.employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Shift Selector */}
          <div>
            <Label className="text-sm font-medium">Loại ca</Label>
            <Select value={selectedShift} onValueChange={handleShiftChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Chọn loại ca" />
              </SelectTrigger>
              <SelectContent>
                {SHIFT_TYPES.map((shift) => (
                  <SelectItem key={shift.value} value={shift.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: shift.color }}
                      />
                      <span>{shift.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {shift.time}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="CUSTOM">Tùy chỉnh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Tiêu đề</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Ca sáng, Nghỉ phép..."
            />
          </div>

          {/* Time Fields - Only show for work shifts */}
          {selectedShift !== 'OFF' && selectedShift !== 'SICK' && selectedShift !== 'PERSONAL' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startTime">Giờ bắt đầu</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">Giờ kết thúc</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <Label htmlFor="location">Địa điểm</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Công ty MIS, Nhà..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú thêm..."
            />
          </div>

          {/* Quick Excuse Templates */}
          {(selectedShift === 'OFF' || selectedShift === 'PERSONAL') && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">
                💡 Gợi ý lý do:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Có việc gia đình',
                  'Đi khám bệnh',
                  'Đi du lịch',
                  'Nghỉ phép năm',
                  'Có việc cá nhân'
                ].map((excuse) => (
                  <Button
                    key={excuse}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setNotes(excuse)}
                  >
                    {excuse}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting || isSaving}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Đang xóa...' : 'Xóa'}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || isDeleting}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 