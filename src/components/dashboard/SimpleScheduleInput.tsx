"use client";

import React, { useState } from 'react';
import { Calendar, Save, Copy, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface SimpleScheduleInputProps {
  onSuccess?: (result: any) => void;
}

export function SimpleScheduleInput({ onSuccess }: SimpleScheduleInputProps = {}) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [scheduleString, setScheduleString] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { familyId } = useAuthStore();

  const parseScheduleString = (input: string) => {
    const parts = input.trim().split(/\s+/);
    const shifts = [];
    
    for (let i = 0; i < parts.length; i++) {
      const day = i + 1;
      const shift = parts[i]?.toUpperCase();
      
      // Only add working shifts
      if (['L2', 'D2', 'T2'].includes(shift)) {
        shifts.push({ day, shift });
      }
      // Skip OFF, CE, empty, etc.
    }
    
    return shifts;
  };

  const generatePreview = () => {
    const shifts = parseScheduleString(scheduleString);
    
    const summary = {
      L2: shifts.filter(s => s.shift === 'L2').length,
      D2: shifts.filter(s => s.shift === 'D2').length,
      T2: shifts.filter(s => s.shift === 'T2').length,
      total: shifts.length
    };

    return { shifts, summary };
  };

  const fillExample = () => {
    setScheduleString('L2 L2 OFF L2 L2 L2 OFF L2 L2 OFF L2 L2 L2 OFF D2 D2 OFF D2 D2 D2 D2 OFF OFF CE D2 D2 D2 OFF T2 T2 OFF');
  };

  const submitSchedule = async () => {
    if (!scheduleString.trim()) {
      alert('Vui lòng nhập lịch làm việc');
      return;
    }

    const { shifts, summary } = generatePreview();
    
    if (shifts.length === 0) {
      alert('Không có ca làm việc nào hợp lệ (L2, D2, T2)');
      return;
    }

    setIsSubmitting(true);

    try {
      // Clear existing schedules first
      console.log(`🗑️ Clearing existing schedules for Minh Hiếu in ${year}/${month}...`);
      
      const clearResponse = await fetch('/api/work-schedules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          familyId: familyId || 'family1',
          employeeName: 'Minh Hiếu',
          month,
          year 
        })
      });
      
      if (!clearResponse.ok) {
        console.warn('Could not clear existing schedules, continuing...');
      }
      
      // Add new schedules
      const workSchedules = [];
      const notifications = [];

      for (const shift of shifts) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(shift.day).padStart(2, '0')}`;
        
        const shiftInfo = {
          L2: { name: 'Chiều', time: '14:00-23:00', color: '#10B981' },
          D2: { name: 'Sáng', time: '06:00-14:00', color: '#F59E0B' },
          T2: { name: 'Tối', time: '22:00-07:00', color: '#EF4444' }
        }[shift.shift as 'L2' | 'D2' | 'T2'];

        const workSchedule = {
          familyId: familyId || 'family1',
          employeeName: 'Minh Hiếu' as const,
          title: `Ca ${shift.shift} - ${shiftInfo.name}`,
          startTime: shift.shift === 'L2' ? '14:00' : shift.shift === 'D2' ? '06:00' : '22:00',
          endTime: shift.shift === 'L2' ? '23:00' : shift.shift === 'D2' ? '14:00' : '07:00',
          date: date,
          isRecurring: false,
          location: 'Công ty MIS',
          notes: `Ca làm việc ${shift.shift}`,
          color: shiftInfo.color
        };

        // Save to database
        const response = await fetch('/api/work-schedules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workSchedule)
        });

        if (response.ok) {
          workSchedules.push(workSchedule);
          notifications.push(`${format(new Date(date), 'dd/MM')}: ca ${shiftInfo.name.toLowerCase()} (${shiftInfo.time})`);
        }
      }

      // Call success callback
      if (onSuccess) {
        onSuccess({
          success: true,
          schedules: workSchedules,
          notifications: notifications,
          summary: {
            employee: 'Minh Hiếu',
            month,
            year,
            totalShifts: workSchedules.length
          }
        });
      }

      alert(`✅ Đã thêm ${workSchedules.length} ca làm việc tháng ${month}/${year}`);
      setScheduleString('');

    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('❌ Lỗi khi lưu lịch làm việc');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { shifts, summary } = generatePreview();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Nhập lịch đơn giản
        </CardTitle>
        <p className="text-sm text-gray-600">
          Nhập chuỗi lịch làm việc theo thứ tự ngày 1→31
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Month/Year selector */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tháng</Label>
            <Input 
              type="number" 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              min="1" 
              max="12"
            />
          </div>
          <div>
            <Label>Năm</Label>
            <Input 
              type="number" 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              min="2020" 
              max="2030"
            />
          </div>
        </div>

        {/* Schedule input */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label>Lịch làm việc (ngày 1→31)</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fillExample}>
                <Copy className="h-4 w-4 mr-1" />
                Ví dụ
              </Button>
              <Button variant="outline" size="sm" onClick={() => setScheduleString('')}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          
          <Textarea 
            value={scheduleString}
            onChange={(e) => setScheduleString(e.target.value)}
            placeholder="L2 L2 OFF L2 L2 L2 OFF L2 L2 OFF L2 L2 L2 OFF D2 D2 OFF D2 D2 D2 D2 OFF OFF CE D2 D2 D2 OFF T2 T2 OFF"
            className="min-h-24 text-sm font-mono"
            rows={3}
          />
          
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Hướng dẫn:</strong> Nhập mã ca cho từng ngày, cách nhau bởi dấu cách</p>
            <p><strong>Mã ca:</strong> L2 (chiều), D2 (sáng), T2 (tối), OFF (nghỉ), CE (nghỉ)</p>
            <p><strong>Ví dụ:</strong> "L2 OFF D2 T2" = Ngày 1: L2, Ngày 2: nghỉ, Ngày 3: D2, Ngày 4: T2</p>
          </div>
        </div>

        {/* Preview */}
        {scheduleString.trim() && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-gray-800">📋 Preview lịch làm việc:</h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="bg-green-100 p-3 rounded text-center">
                <div className="font-bold text-green-800">{summary.L2}</div>
                <div className="text-green-600">Ca Chiều (L2)</div>
              </div>
              <div className="bg-yellow-100 p-3 rounded text-center">
                <div className="font-bold text-yellow-800">{summary.D2}</div>
                <div className="text-yellow-600">Ca Sáng (D2)</div>
              </div>
              <div className="bg-red-100 p-3 rounded text-center">
                <div className="font-bold text-red-800">{summary.T2}</div>
                <div className="text-red-600">Ca Tối (T2)</div>
              </div>
            </div>
            
            <div className="text-center bg-blue-100 p-2 rounded">
              <span className="font-bold text-blue-800">Tổng: {summary.total} ca làm việc</span>
            </div>

            {shifts.length > 0 && (
              <div className="text-xs text-gray-600">
                <strong>Chi tiết:</strong> {shifts.map(s => `${s.day}:${s.shift}`).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <Button 
          onClick={submitSchedule} 
          disabled={isSubmitting || !scheduleString.trim()}
          className="w-full"
          size="lg"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Đang lưu...' : `Lưu ${summary.total} ca làm việc`}
        </Button>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2 text-blue-800">🚀 Siêu đơn giản:</h4>
          <ul className="space-y-1 list-disc list-inside text-blue-700">
            <li>Copy chuỗi lịch từ Excel/ảnh và paste vào</li>
            <li>Mã ca: <strong>L2 D2 T2</strong> (chỉ lưu 3 loại này)</li>
            <li>Nghỉ: <strong>OFF CE</strong> hoặc bất kỳ ký tự nào khác</li>
            <li>Hệ thống tự động bỏ qua ngày nghỉ</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 