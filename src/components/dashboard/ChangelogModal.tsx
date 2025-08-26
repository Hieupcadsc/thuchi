"use client";

import React, { useState } from 'react';
import { X, Sparkles, Shield, Calendar, Bot, Home, Zap, CheckCircle, Star, Rocket, Box, Server, GitBranch, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const changelogData = [
  {
    version: "v2.1.0",
    date: "07/01/2025",
    tag: "latest",
    features: [
      {
        icon: Rocket,
        title: "🚀 CI/CD Pipeline Hoàn Thành",
        description: "Automated deployment với Docker + Kubernetes + GitHub Actions. Push code → Auto build → Auto deploy!",
        type: "feature"
      },
      {
        icon: Box,
        title: "🐳 Docker Containerization",
        description: "Multi-stage build, optimized image, production-ready container với Next.js 15",
        type: "improvement"
      },
      {
        icon: Server,
        title: "☸️ Kubernetes Deployment",
        description: "Production-ready orchestration với auto-scaling, health checks, và rolling updates",
        type: "improvement"
      },
      {
        icon: GitBranch,
        title: "⚡ GitHub Actions Automation",
        description: "Complete CI/CD workflow: build, test, push image, deploy tự động",
        type: "improvement"
      },
      {
        icon: Package,
        title: "📦 GitHub Container Registry",
        description: "Secure image storage với private/public visibility control",
        type: "improvement"
      },
      {
        icon: Shield,
        title: "Bảo mật mật khẩu nâng cao",
        description: "Hệ thống tự động phát hiện mật khẩu yếu và bắt buộc đổi mật khẩu mạnh với validation real-time",
        type: "security"
      },
      {
        icon: Calendar,
        title: "Nhập lịch làm việc thông minh", 
        description: "Nhập lịch ca làm việc chỉ bằng 1 dòng text đơn giản (L2 D2 T2 OFF...) thay vì AI phức tạp",
        type: "feature"
      },
      {
        icon: Home,
        title: "Smart Hub hoàn chỉnh",
        description: "Trung tâm điều khiển thông minh với navigation đầy đủ, weather widget, smart home controls",
        type: "feature"
      },
      {
        icon: Bot,
        title: "AI Processing cải tiến",
        description: "Tối ưu AI bill processing, loại bỏ lỗi đọc sai tên và ca làm việc, cải thiện độ chính xác",
        type: "improvement"
      }
    ]
  },
  {
    version: "v2.0.5", 
    date: "06/01/2025",
    features: [
      {
        icon: Zap,
        title: "Performance Optimization",
        description: "Tối ưu tốc độ load trang, cải thiện responsive mobile UI",
        type: "improvement"
      },
      {
        icon: CheckCircle,
        title: "Bug Fixes",
        description: "Fix lỗi authentication, database connection stability, UI overflow issues",
        type: "bugfix"
      }
    ]
  }
];

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security': return 'bg-red-100 text-red-800 border-red-200';
      case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'improvement': return 'bg-green-100 text-green-800 border-green-200';
      case 'bugfix': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'security': return 'Bảo mật';
      case 'feature': return 'Tính năng mới';
      case 'improvement': return 'Cải thiện';
      case 'bugfix': return 'Sửa lỗi';
      default: return 'Khác';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 min-h-screen">
      <Card className="w-full max-w-2xl shadow-xl border-0 overflow-hidden my-auto max-h-[90vh] overflow-y-auto">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-600 text-white relative">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              Có gì mới trong phiên bản này?
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-purple-100 text-sm mt-2">
            Khám phá những tính năng và cải tiến mới nhất của Thu Chi Gia Đình
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {changelogData.map((version, vIndex) => (
            <div key={version.version} className="space-y-4">
              {/* Version Header */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-800">{version.version}</h3>
                  {version.tag && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                      <Star className="h-3 w-3 mr-1" />
                      {version.tag}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-gray-500">{version.date}</span>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {version.features.map((feature, fIndex) => {
                  const Icon = feature.icon;
                  return (
                    <div key={fIndex} className="flex gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Icon className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800">{feature.title}</h4>
                          <Badge className={`text-xs ${getTypeColor(feature.type)}`}>
                            {getTypeLabel(feature.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="pt-4 border-t bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span>Cảm ơn bạn đã sử dụng Thu Chi Gia Đình!</span>
            </div>
            <p className="text-xs text-gray-500">
              Có góp ý hoặc báo lỗi? Liên hệ: <span className="font-medium">hieu@hieungo.uk</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 