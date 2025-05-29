"use client";

import { Pie, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip as RechartsTooltip, Legend as RechartsLegend, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { CATEGORIES } from "@/lib/constants";
import { AlertTriangle, PieChart as PieChartIcon } from "lucide-react";

interface CategoryData {
  name: string;
  value: number;
  fill: string;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
];


export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: chartColors[index % chartColors.length],
      };
    });
    return config;
  }, [data]);

  if (!data || data.length === 0) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Phân Bổ Chi Tiêu Theo Danh Mục</CardTitle>
          <CardDescription>Biểu đồ tròn thể hiện tỷ trọng chi tiêu cho từng danh mục.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
          <PieChartIcon className="h-16 w-16 mb-4" />
          <p>Không có dữ liệu chi tiêu để hiển thị biểu đồ.</p>
          <p className="text-sm">Hãy thêm các khoản chi để xem phân tích.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Phân Bổ Chi Tiêu Theo Danh Mục</CardTitle>
        <CardDescription>Biểu đồ tròn thể hiện tỷ trọng chi tiêu cho từng danh mục trong tháng đã chọn.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[300px]">
          <RechartsPieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
             <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </RechartsPieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
