import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedChartProps {
  data: any[];
  isLoading?: boolean;
  title: string;
  description: string;
  className?: string;
}

const chartConfig = {
  thu: { 
    label: "Thu nhập", 
    color: "hsl(173 58% 39%)",
    icon: TrendingUp
  },
  chi: { 
    label: "Chi tiêu", 
    color: "hsl(12 76% 61%)",
    icon: TrendingDown
  },
};

export function EnhancedChart({ 
  data, 
  isLoading, 
  title, 
  description, 
  className 
}: EnhancedChartProps) {
  if (isLoading) {
    return (
      <Card className={cn("modern-card", className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-[300px]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Đang tải dữ liệu biểu đồ...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn("modern-card", className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Không có dữ liệu</h3>
            <p className="text-muted-foreground">
              Không có dữ liệu giao dịch để hiển thị biểu đồ.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Hãy thêm giao dịch mới để bắt đầu theo dõi.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("modern-card", className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { 
                  notation: 'compact', 
                  compactDisplay: 'short' 
                }).format(value)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip
                content={<ChartTooltipContent 
                  indicator="dot"
                  formatter={(value, name) => [
                    new Intl.NumberFormat('vi-VN', { 
                      style: 'currency', 
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(value as number),
                    chartConfig[name as keyof typeof chartConfig]?.label || name
                  ]}
                />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar 
                dataKey="thu" 
                fill={chartConfig.thu.color}
                radius={[4, 4, 0, 0]}
                name="thu"
              />
              <Bar 
                dataKey="chi" 
                fill={chartConfig.chi.color}
                radius={[4, 4, 0, 0]}
                name="chi"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
} 