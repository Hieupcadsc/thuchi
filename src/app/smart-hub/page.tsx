"use client";

import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Sparkles, 
  Brain, 
  Zap, 
  Target,
  Cloud,
  Home as HomeIcon,
  Bell,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { FamilyGoalsTracker } from '@/components/dashboard/FamilyGoalsTracker';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { SmartHomeWidget } from '@/components/dashboard/SmartHomeWidget';
import { useAuthStore } from '@/hooks/useAuth';

export default function SmartHubPage() {
  const { currentUser } = useAuthStore();

  if (!currentUser) {
    return (
      <div className="text-center p-8">
        <Brain className="mx-auto h-12 w-12 text-purple-500 mb-4" />
        <p className="text-lg">Vui lòng đăng nhập để sử dụng Smart Hub.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section - đồng bộ với Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            Smart Hub
          </h1>
          <p className="text-muted-foreground">
            Trung tâm điều khiển thông minh - {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: vi })}
          </p>
        </div>
        
        <Button size="lg" className="gap-2">
          <Brain className="h-5 w-5" />
          AI Insights
        </Button>
      </div>

      {/* Stats Cards - style giống Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-slide-up">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mục tiêu đang theo đuổi</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">2</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">+12%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Tiến độ trung bình 68%</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tiết kiệm năng lượng</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">15%</p>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">↓285kWh</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">So với tháng trước</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gợi ý thực hiện</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">4</p>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">3 quan trọng</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Đang chờ hành động</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Thiết bị online</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">8/10</p>
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">98% uptime</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Hoạt động bình thường</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <HomeIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid - style giống Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <FamilyGoalsTracker />
          
          {/* Quick Actions Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                Hành động nhanh
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Target className="h-5 w-5" />
                <span className="text-sm">Thêm mục tiêu</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <HomeIcon className="h-5 w-5" />
                <span className="text-sm">Quản lý thiết bị</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Calendar className="h-5 w-5" />
                <span className="text-sm">Lập kế hoạch</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                <Brain className="h-5 w-5" />
                <span className="text-sm">AI Gợi ý</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <WeatherWidget />
          <SmartHomeWidget />
        </div>
      </div>

      {/* AI Insights Section - style giống Dashboard */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Financial Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">85%</div>
              <p className="text-sm font-medium text-blue-700">Khả năng đạt mục tiêu</p>
              <p className="text-xs text-blue-600 mt-1">Dự đoán hoàn thành trong 8 tháng</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">-12%</div>
              <p className="text-sm font-medium text-green-700">Nhờ thời tiết mát mẻ và smart control</p>
              <p className="text-xs text-green-600 mt-1">Nhờ thời tiết mát mẻ và smart control</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">4</div>
              <p className="text-sm font-medium text-purple-700">Gợi ý chờ thực hiện</p>
              <p className="text-xs text-purple-600 mt-1">3 quan trọng, 1 trung bình</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-700 mb-1">Gợi ý thông minh hôm nay</h4>
                <p className="text-sm text-purple-600 mb-2">
                  Dựa trên thời tiết mưa và mục tiêu tiết kiệm, hệ thống gợi ý tắt điều hòa và mua thực phẩm dự trữ.
                </p>
                <Button size="sm" variant="outline" className="text-purple-700 border-purple-300">
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 