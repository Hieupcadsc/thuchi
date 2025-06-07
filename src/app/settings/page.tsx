
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch'; // Assuming you might want a switch for theme
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME, FAMILY_MEMBERS } from '@/lib/constants';
import { Sun, Moon, Info, Palette } from 'lucide-react';
import { useAuthStore } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const { currentUser, familyId } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài Đặt</h1>
        <p className="text-muted-foreground">Quản lý các tùy chọn và thông tin ứng dụng.</p>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-5 w-5" />
            Giao Diện
          </CardTitle>
          <CardDescription>Tùy chỉnh giao diện sáng hoặc tối cho ứng dụng.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
            <div className="flex items-center space-x-2">
              {theme === 'light' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
              <Label htmlFor="theme-toggle" className="text-base">
                Giao diện {theme === 'light' ? 'Sáng' : 'Tối'}
              </Label>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle theme"
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Thông Tin Tài Khoản
          </CardTitle>
          <CardDescription>Thông tin tài khoản đang đăng nhập.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentUser && (
            <div className="text-sm">
              <p><span className="font-semibold">Người dùng:</span> {currentUser}</p>
              <p><span className="font-semibold">ID Gia Đình:</span> {familyId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Giới Thiệu Ứng Dụng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-lg font-semibold">{APP_NAME}</p>
          <p className="text-sm text-muted-foreground">
            Phiên bản 1.0.0 (SQLite Edition)
          </p>
          <p className="text-sm">
            Ứng dụng quản lý tài chính cá nhân cho gia đình {FAMILY_MEMBERS.join(' và ')}.
          </p>
          <p className="text-sm">
            Phát triển bởi Ngô Minh Hiếu.
          </p>
          <p className="text-sm">
            Liên hệ: <a href="mailto:Hieu@hieungo.uk" className="text-primary hover:underline">Hieu@hieungo.uk</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
