import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  PiggyBank
} from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  variant?: 'income' | 'expense' | 'balance' | 'cash' | 'bank';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
}

export function SummaryCard({ 
  title, 
  value, 
  variant = 'balance',
  trend,
  icon 
}: SummaryCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'income':
        return {
          border: 'border-green-200 dark:border-green-800',
          bg: 'bg-green-50 dark:bg-green-950/30',
          iconBg: 'bg-green-100 dark:bg-green-900',
          iconColor: 'text-green-600 dark:text-green-400',
          valueColor: 'text-green-700 dark:text-green-300'
        };
      case 'expense':
        return {
          border: 'border-red-200 dark:border-red-800',
          bg: 'bg-red-50 dark:bg-red-950/30',
          iconBg: 'bg-red-100 dark:bg-red-900',
          iconColor: 'text-red-600 dark:text-red-400',
          valueColor: 'text-red-700 dark:text-red-300'
        };
      case 'cash':
        return {
          border: 'border-purple-200 dark:border-purple-800',
          bg: 'bg-purple-50 dark:bg-purple-950/30',
          iconBg: 'bg-purple-100 dark:bg-purple-900',
          iconColor: 'text-purple-600 dark:text-purple-400',
          valueColor: 'text-purple-700 dark:text-purple-300'
        };
      case 'bank':
        return {
          border: 'border-blue-200 dark:border-blue-800',
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          iconBg: 'bg-blue-100 dark:bg-blue-900',
          iconColor: 'text-blue-600 dark:text-blue-400',
          valueColor: 'text-blue-700 dark:text-blue-300'
        };
      default:
        return {
          border: 'border-indigo-200 dark:border-indigo-800',
          bg: 'bg-indigo-50 dark:bg-indigo-950/30',
          iconBg: 'bg-indigo-100 dark:bg-indigo-900',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          valueColor: 'text-indigo-700 dark:text-indigo-300'
        };
    }
  };

  const getDefaultIcon = () => {
    switch (variant) {
      case 'income':
        return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />;
      case 'cash':
        return <Wallet className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />;
      case 'bank':
        return <Landmark className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />;
      default:
        return <PiggyBank className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />;
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={cn(
      "card-hover border-2 animate-scale-in glass summary-card-fhd shadow-fhd",
      styles.border,
      "relative overflow-hidden group"
    )}>
      {/* Gradient overlay effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-4 sm:p-5 lg:p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm lg:text-base font-medium text-muted-foreground/80 uppercase tracking-wide">
              {title}
            </p>
            <p className={cn(
              "text-base sm:text-lg lg:text-xl xl:text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-300 group-hover:scale-105",
              variant === 'income' ? "from-green-600 to-emerald-500" :
              variant === 'expense' ? "from-red-600 to-rose-500" :
              variant === 'cash' ? "from-purple-600 to-violet-500" :
              variant === 'bank' ? "from-blue-600 to-cyan-500" :
              "from-indigo-600 to-purple-500"
            )}>
              {value}
            </p>
            {trend && (
              <div className="flex items-center gap-2 animate-fade-in">
                <div className={cn(
                  "p-1 rounded-full",
                  trend.isPositive ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                )}>
                  {trend.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              </div>
            )}
          </div>
          
          <div className={cn(
            "flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl shrink-0 transition-all duration-300 group-hover:scale-105",
            "bg-gradient-to-br shadow-lg shadow-fhd",
            variant === 'income' ? "from-green-500 to-emerald-600 shadow-green-500/25" :
            variant === 'expense' ? "from-red-500 to-rose-600 shadow-red-500/25" :
            variant === 'cash' ? "from-purple-500 to-violet-600 shadow-purple-500/25" :
            variant === 'bank' ? "from-blue-500 to-cyan-600 shadow-blue-500/25" :
            "from-indigo-500 to-purple-600 shadow-indigo-500/25"
          )}>
            <div className="text-white animate-pulse-soft">
              {icon || getDefaultIcon()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
