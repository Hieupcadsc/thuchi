import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Landmark, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string;
  variant?: 'income' | 'expense' | 'balance' | 'cash' | 'bank';
  trend?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
}

const VARIANT_CONFIG = {
  income: {
    iconBg:   'gradient-income',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
    accent:   'border-l-emerald-500',
    defaultIcon: <TrendingUp className="w-4 h-4" />,
  },
  expense: {
    iconBg:   'gradient-expense',
    valueColor: 'text-rose-600 dark:text-rose-400',
    accent:   'border-l-rose-500',
    defaultIcon: <TrendingDown className="w-4 h-4" />,
  },
  cash: {
    iconBg:   'gradient-cash',
    valueColor: 'text-violet-600 dark:text-violet-400',
    accent:   'border-l-violet-500',
    defaultIcon: <Wallet className="w-4 h-4" />,
  },
  bank: {
    iconBg:   'gradient-bank',
    valueColor: 'text-blue-600 dark:text-blue-400',
    accent:   'border-l-blue-500',
    defaultIcon: <Landmark className="w-4 h-4" />,
  },
  balance: {
    iconBg:   'gradient-primary',
    valueColor: 'text-indigo-600 dark:text-indigo-400',
    accent:   'border-l-indigo-500',
    defaultIcon: <PiggyBank className="w-4 h-4" />,
  },
};

export function SummaryCard({ title, value, variant = 'balance', trend, icon }: SummaryCardProps) {
  const cfg = VARIANT_CONFIG[variant];

  return (
    <div className={cn(
      'relative bg-card rounded-xl border border-border border-l-4 shadow-sm',
      'hover:shadow-md transition-all duration-200 hover:-translate-y-0.5',
      'p-4 sm:p-5',
      cfg.accent
    )}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: label + value + trend */}
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <p className={cn('text-xl sm:text-2xl font-bold text-currency leading-none', cfg.valueColor)}>
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              {trend.isPositive
                ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                : <ArrowDownRight className="w-3 h-3 text-rose-500" />}
              <span className={cn(
                'text-xs font-semibold',
                trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>

        {/* Right: icon badge */}
        <div className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl shrink-0 text-white shadow-sm',
          cfg.iconBg
        )}>
          {icon ?? cfg.defaultIcon}
        </div>
      </div>
    </div>
  );
}
