"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_LINKS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MobileBottomNavigationProps {
  className?: string;
  notificationCount?: number;
}

export function MobileBottomNavigation({ 
  className, 
  notificationCount = 0 
}: MobileBottomNavigationProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border/50 safe-area-bottom z-50 shadow-2xl",
      className
    )}>
      <div className="grid grid-cols-4 gap-1 p-2">
        {NAV_LINKS.slice(0, 4).map((link) => {
          const isActive = pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
          
          return (
            <Link 
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 active:scale-95 relative",
                isActive 
                  ? 'bg-gradient-to-b from-blue-500 to-purple-600 text-white shadow-lg transform scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted'
              )}
              // Add haptic feedback on touch devices
              onTouchStart={() => {
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
              }}
            >
              <div className="relative">
                <link.icon className={cn(
                  "h-5 w-5 mb-1 transition-transform duration-300",
                  isActive ? "scale-110" : ""
                )} />
                
                {/* Notification badge for specific routes */}
                {link.href === '/dashboard' && notificationCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </div>
              
              <span className={cn(
                "text-xs font-medium truncate transition-all duration-300",
                isActive ? "text-white scale-105" : ""
              )}>
                {link.label.split(' ')[0]}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-white rounded-full opacity-80" />
              )}
            </Link>
          );
        })}
      </div>
      
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-white dark:bg-gray-900" />
    </div>
  );
}

// Hook for managing mobile navigation state
export function useMobileNavigation() {
  const pathname = usePathname();
  
  const getCurrentPageInfo = () => {
    const currentNav = NAV_LINKS.find(link => 
      pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))
    );
    
    return {
      title: currentNav?.label || 'Thuchi',
      icon: currentNav?.icon,
      canGoBack: pathname !== '/dashboard'
    };
  };

  return {
    pathname,
    currentPage: getCurrentPageInfo(),
    navLinks: NAV_LINKS
  };
} 