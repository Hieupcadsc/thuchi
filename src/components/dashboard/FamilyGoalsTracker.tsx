"use client";

import React, { useState, useMemo } from 'react';
import { format, addMonths, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Target, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle,
  Home,
  Car,
  GraduationCap,
  Plane,
  Gift,
  PiggyBank,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';

interface FamilyGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: 'savings' | 'investment' | 'purchase' | 'education' | 'travel' | 'other';
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  createdAt: Date;
  contributors: string[];
}

const goalCategories = [
  { value: 'savings', label: 'Tiết kiệm', icon: <PiggyBank className="h-4 w-4" />, color: '#10B981' },
  { value: 'investment', label: 'Đầu tư', icon: <TrendingUp className="h-4 w-4" />, color: '#3B82F6' },
  { value: 'purchase', label: 'Mua sắm lớn', icon: <Home className="h-4 w-4" />, color: '#8B5CF6' },
  { value: 'education', label: 'Giáo dục', icon: <GraduationCap className="h-4 w-4" />, color: '#F59E0B' },
  { value: 'travel', label: 'Du lịch', icon: <Plane className="h-4 w-4" />, color: '#EF4444' },
  { value: 'other', label: 'Khác', icon: <Target className="h-4 w-4" />, color: '#6B7280' }
];

// Sample goals data
const sampleGoals: FamilyGoal[] = [
  {
    id: '1',
    title: 'Mua nhà mới',
    description: 'Tiết kiệm để mua căn nhà 2 tỷ đồng',
    targetAmount: 2000000000,
    currentAmount: 750000000,
    deadline: '2025-12-31',
    category: 'purchase',
    priority: 'high',
    isCompleted: false,
    createdAt: new Date(),
    contributors: ['Minh Đan', 'Minh Hiếu']
  },
  {
    id: '2',
    title: 'Du lịch Châu Âu',
    description: 'Chuyến du lịch gia đình 15 ngày tại Châu Âu',
    targetAmount: 150000000,
    currentAmount: 120000000,
    deadline: '2025-06-15',
    category: 'travel',
    priority: 'medium',
    isCompleted: false,
    createdAt: new Date(),
    contributors: ['Minh Đan', 'Minh Hiếu']
  },
  {
    id: '3',
    title: 'Quỹ khẩn cấp',
    description: 'Quỹ dự phòng cho gia đình (6 tháng chi tiêu)',
    targetAmount: 100000000,
    currentAmount: 100000000,
    deadline: '2024-12-31',
    category: 'savings',
    priority: 'high',
    isCompleted: true,
    createdAt: new Date(),
    contributors: ['Minh Đan', 'Minh Hiếu']
  }
];

export function FamilyGoalsTracker() {
  const [goals, setGoals] = useState<FamilyGoal[]>(sampleGoals);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FamilyGoal | null>(null);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm();

  const activeGoals = useMemo(() => 
    goals.filter(g => !g.isCompleted).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }),
    [goals]
  );

  const completedGoals = useMemo(() => 
    goals.filter(g => g.isCompleted),
    [goals]
  );

  const totalTargetAmount = useMemo(() =>
    activeGoals.reduce((sum, goal) => sum + goal.targetAmount, 0),
    [activeGoals]
  );

  const totalCurrentAmount = useMemo(() =>
    activeGoals.reduce((sum, goal) => sum + goal.currentAmount, 0),
    [activeGoals]
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (current: number, target: number): number => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysUntilDeadline = (deadline: string): number => {
    return differenceInDays(new Date(deadline), new Date());
  };

  const getCategoryInfo = (category: string) => {
    return goalCategories.find(cat => cat.value === category) || goalCategories[0];
  };

  const handleAddGoal = (data: any) => {
    const newGoal: FamilyGoal = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      targetAmount: parseInt(data.targetAmount),
      currentAmount: parseInt(data.currentAmount) || 0,
      deadline: data.deadline,
      category: data.category,
      priority: data.priority,
      isCompleted: false,
      createdAt: new Date(),
      contributors: ['Minh Đan'] // Should come from current user
    };

    setGoals(prev => [...prev, newGoal]);
    reset();
    setIsAddModalOpen(false);
  };

  const handleUpdateProgress = (goalId: string, newAmount: number) => {
    setGoals(prev => prev.map(goal => 
      goal.id === goalId 
        ? { 
            ...goal, 
            currentAmount: newAmount,
            isCompleted: newAmount >= goal.targetAmount
          }
        : goal
    ));
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  const GoalCard = ({ goal }: { goal: FamilyGoal }) => {
    const categoryInfo = getCategoryInfo(goal.category);
    const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
    const daysLeft = getDaysUntilDeadline(goal.deadline);
    
    return (
      <Card className={cn(
        "transition-all hover:shadow-lg border-l-4",
        goal.isCompleted ? "border-l-green-500 bg-green-50/50" : "border-l-blue-500"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${categoryInfo.color}20`, color: categoryInfo.color }}
              >
                {categoryInfo.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{goal.title}</h3>
                <p className="text-xs text-muted-foreground">{goal.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Badge 
                variant={goal.priority === 'high' ? 'destructive' : goal.priority === 'medium' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {goal.priority === 'high' ? 'Cao' : goal.priority === 'medium' ? 'TB' : 'Thấp'}
              </Badge>
              {goal.isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Tiến độ</span>
                <span className="font-semibold">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="flex justify-between text-sm">
              <span>Hiện tại: {formatCurrency(goal.currentAmount)}</span>
              <span>Mục tiêu: {formatCurrency(goal.targetAmount)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {daysLeft > 0 ? `${daysLeft} ngày còn lại` : 
                 daysLeft === 0 ? 'Hôm nay là deadline' : 
                 `Quá hạn ${Math.abs(daysLeft)} ngày`}
              </div>
              
              <div className="flex gap-1">
                {!goal.isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const newAmount = prompt(
                        `Cập nhật số tiền hiện tại cho "${goal.title}"`,
                        goal.currentAmount.toString()
                      );
                      if (newAmount) {
                        handleUpdateProgress(goal.id, parseInt(newAmount));
                      }
                    }}
                  >
                    <DollarSign className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:bg-red-100"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-slate-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Mục Tiêu Gia Đình
          </CardTitle>
          
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Thêm mục tiêu
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Thêm mục tiêu mới</DialogTitle>
                <DialogDescription>
                  Tạo mục tiêu tài chính mới cho gia đình
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit(handleAddGoal)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tên mục tiêu *</Label>
                  <Input
                    id="title"
                    placeholder="VD: Mua xe mới, Du lịch..."
                    {...register('title', { required: 'Vui lòng nhập tên mục tiêu' })}
                  />
                  {errors.title && <p className="text-sm text-red-500">{errors.title.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Textarea
                    id="description"
                    placeholder="Chi tiết về mục tiêu..."
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Danh mục</Label>
                    <Select onValueChange={(value) => setValue('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {goalCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Độ ưu tiên</Label>
                    <Select onValueChange={(value) => setValue('priority', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Độ ưu tiên" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">Cao</SelectItem>
                        <SelectItem value="medium">Trung bình</SelectItem>
                        <SelectItem value="low">Thấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targetAmount">Số tiền mục tiêu *</Label>
                    <Input
                      id="targetAmount"
                      type="number"
                      placeholder="1000000"
                      {...register('targetAmount', { required: 'Vui lòng nhập số tiền' })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentAmount">Số tiền hiện tại</Label>
                    <Input
                      id="currentAmount"
                      type="number"
                      placeholder="0"
                      {...register('currentAmount')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    {...register('deadline', { required: 'Vui lòng chọn deadline' })}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    Hủy
                  </Button>
                  <Button type="submit">Thêm mục tiêu</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Tổng mục tiêu</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(totalTargetAmount)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Đã đạt được</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalCurrentAmount)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Tỷ lệ hoàn thành</p>
            <p className="text-lg font-bold text-purple-700">
              {totalTargetAmount > 0 ? ((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Goals */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            Mục tiêu đang theo đuổi ({activeGoals.length})
          </h4>
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>

        {/* Completed Goals */}
        {completedGoals.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Đã hoàn thành ({completedGoals.length})
            </h4>
            {completedGoals.slice(0, 2).map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}

        {activeGoals.length === 0 && completedGoals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có mục tiêu nào</p>
            <p className="text-sm">Hãy thêm mục tiêu đầu tiên cho gia đình!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 