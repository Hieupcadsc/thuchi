import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

const variantStyles = {
  primary: "bg-gradient-primary hover:shadow-2xl",
  secondary: "bg-gradient-secondary hover:shadow-2xl",
  success: "bg-gradient-success hover:shadow-2xl", 
  danger: "bg-gradient-danger hover:shadow-2xl"
};

export function FloatingActionButton({ 
  icon: Icon, 
  onClick, 
  className,
  children,
  tooltip,
  variant = 'primary'
}: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onClick}
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl hover-lift border-0 text-white transition-all duration-300",
          "hover:scale-110 active:scale-95",
          "backdrop-blur-sm",
          variantStyles[variant],
          className
        )}
        title={tooltip}
      >
        <Icon className="h-6 w-6" />
        {children && (
          <span className="ml-2 hidden sm:inline-block font-medium">
            {children}
          </span>
        )}
      </Button>
    </div>
  );
} 