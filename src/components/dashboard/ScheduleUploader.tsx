"use client";

import React, { useState, useRef } from 'react';
import { Upload, Image, Calendar, Clock, User, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/hooks/useAuth';

interface ScheduleUploadResult {
  success: boolean;
  schedules?: any[];
  notifications?: string[];
  error?: string;
  summary?: {
    employee: string;
    month: number;
    year: number;
    totalShifts: number;
  };
}

interface ScheduleUploaderProps {
  onSuccess?: (result?: ScheduleUploadResult) => void;
}

export function ScheduleUploader({ onSuccess }: ScheduleUploaderProps = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ScheduleUploadResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { familyId } = useAuthStore();

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setResult({ success: false, error: 'Chỉ hỗ trợ file ảnh' });
      return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    await processScheduleImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          await handleFileSelect(file);
        }
        break;
      }
    }
  };

  const processScheduleImage = async (file: File) => {
    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('familyId', familyId || 'GIA_DINH');

      const response = await fetch('/api/ai/process-schedule', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);

      if (data.success && data.schedules) {
        // Call success callback to close modal and refresh
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(data);
          }, 2000); // Show success message for 2s then close
        } else {
          // Fallback: refresh page
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error processing schedule:', error);
      setResult({ 
        success: false, 
        error: 'Lỗi xử lý ảnh lịch làm việc' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          Tải lên lịch làm việc AI
        </CardTitle>
        <p className="text-sm text-gray-600">
          Upload ảnh lịch làm việc, AI sẽ tự động đọc và thêm vào calendar
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onPaste={handlePaste}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">
            Thả ảnh vào đây hoặc click để chọn
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Hỗ trợ: JPG, PNG, WebP. Hoặc Ctrl+V để paste từ clipboard
          </p>
          
          {/* Shift Legend */}
          <div className="flex justify-center gap-4 text-xs">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              L2: 14:00-23:00
            </Badge>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
              D2: 06:00-14:00
            </Badge>
            <Badge variant="secondary" className="bg-red-100 text-red-700">
              T2: 22:00-07:00
            </Badge>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        {/* Preview Image */}
        {previewImage && (
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-2">Ảnh lịch đã chọn:</p>
            <img
              src={previewImage}
              alt="Schedule preview"
              className="max-w-full h-auto max-h-64 mx-auto rounded border"
            />
          </div>
        )}

        {/* Loading */}
        {isUploading && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Đang xử lý ảnh lịch làm việc bằng AI... Vui lòng đợi.
            </AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            {result.success ? (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ Đã xử lý thành công lịch làm việc!
                  {result.schedules && (
                    <div className="mt-2">
                      <p>Đã thêm {result.schedules.length} ca làm việc</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  ❌ {result.error || 'Có lỗi xảy ra khi xử lý ảnh'}
                </AlertDescription>
              </Alert>
            )}

            {/* Notifications */}
            {result.notifications && result.notifications.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Thông báo ca làm việc Minh Hiếu:
                </h4>
                <div className="space-y-1">
                  {result.notifications.map((notification, index) => (
                    <p key={index} className="text-sm text-blue-700">
                      • {notification}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <h4 className="font-medium mb-2">Hướng dẫn sử dụng:</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>Upload ảnh lịch làm việc theo tháng hoặc tuần</li>
            <li>AI sẽ tự động đọc và phân tích lịch</li>
            <li>Hệ thống sẽ tự động thêm ca làm việc vào calendar</li>
            <li>Thông báo ca làm việc của Minh Hiếu sẽ được gửi</li>
            <li>Upload lại để cập nhật thay đổi theo tuần</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 