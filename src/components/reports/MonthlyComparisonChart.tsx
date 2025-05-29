"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AlertTriangle, BarChart as BarChartIcon } from "lucide-react";

interface MonthlyComparisonChartProps {
  data: Array<{
    month: string; // e.g., "Tháng 1", "Tháng 2"
    thu: number;
    chi: number;
  }>;
}

const chartConfig = {
  thu: { label: "Tổng Thu", color: "hsl(var(--chart-2))" }, // Greenish
  chi: { label: "Tổng Chi", color: "hsl(var(--chart-1))" }, // Reddish/Orange
} satisfies Parameters<typeof ChartContainer>[0]["config"];

export function MonthlyComparisonChart({ data }: MonthlyComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>So Sánh Thu Chi Hàng Tháng</CardTitle>
          <CardDescription>Biểu đồ so sánh tổng thu và tổng chi qua các tháng.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
          <BarChartIcon className="h-16 w-16 mb-4" />
          <p>Không có dữ liệu để hiển thị biểu đồ.</p>
          <p className="text-sm">Hãy thêm giao dịch để xem báo cáo.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>So Sánh Thu Chi Hàng Tháng</CardTitle>
        <CardDescription>Biểu đồ cột so sánh tổng thu nhập và chi tiêu của bạn qua các tháng.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10}/>
            <YAxis 
                tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                axisLine={false}
                tickLine={false}
            />
            <ChartTooltip 
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
             />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="thu" fill="var(--color-thu)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="chi" fill="var(--color-chi)" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
