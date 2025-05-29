import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  colorClass?: string;
}

export function SummaryCard({ title, value, icon: Icon, colorClass = "text-primary" }: SummaryCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
        </div>
        {/* <p className="text-xs text-muted-foreground">+20.1% so với tháng trước</p> */}
      </CardContent>
    </Card>
  );
}
