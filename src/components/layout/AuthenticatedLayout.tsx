"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/layout/UserNav';
import { GlobalAlertToaster } from '@/components/layout/GlobalAlertToaster';
import { WeakPasswordWarning } from '@/components/auth/WeakPasswordWarning';
import { useTheme } from '@/contexts/ThemeContext'; 
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileFirst } from '@/hooks/use-mobile-detection';
import { MobileBottomNavigation } from '@/components/mobile/MobileBottomNavigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter
} from '@/components/ui/sidebar';
import { LogOut, PiggyBank, Moon, Sun, Sparkles, Menu } from 'lucide-react';
import { cn } from '@/lib/utils'; 



export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthStore((state) => ({
    currentUser: state.currentUser,
  }));
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme(); 
  const isMobile = useIsMobile();
  const { showMobileUI } = useMobileFirst();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log('[AuthenticatedLayout] Rendering. currentUser from store:', currentUser);

  useEffect(() => {
    console.log('[AuthenticatedLayout] useEffect triggered. currentUser from store:', currentUser);
    if (!currentUser) {
      console.log('[AuthenticatedLayout] No currentUser in useEffect, redirecting to /login');
      router.replace('/login');
    }
  }, [currentUser, router]);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  if (!currentUser) {
    console.log('[AuthenticatedLayout] Render guard: currentUser is null/undefined, showing redirect message to /login.');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-primary">
        <div className="glass rounded-2xl p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-white" />
          <p className="text-white text-lg font-medium">Đang chuyển hướng đến trang đăng nhập...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    // router.push('/login') is handled by the useEffect above
  };

  const currentPageTitle = NAV_LINKS.find(link => pathname.startsWith(link.href))?.label || APP_NAME;
  
  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <GlobalAlertToaster />
      <WeakPasswordWarning />
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20"> 
        <div className="flex flex-1"> 
          <Sidebar className="border-r border-border/50 !bg-white dark:!bg-slate-900 shadow-fhd" collapsible="icon">
            <SidebarHeader className="p-4 xl:p-6 border-b border-sidebar-border/50 !bg-white dark:!bg-slate-900">
              <Link href="/dashboard" className="flex items-center gap-3 xl:gap-4 group-data-[collapsible=icon]:justify-center hover-lift">
                <div className="p-2 xl:p-3 bg-blue-500 rounded-xl">
                  <PiggyBank className="h-6 w-6 xl:h-8 xl:w-8 text-white icon-md-fhd" />
                </div>
                <div className="group-data-[collapsible=icon]:hidden">
                  <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold text-slate-900 dark:text-slate-100">{APP_NAME}</h1>
                  <p className="text-xs xl:text-base text-slate-600 dark:text-slate-400">Quản lý tài chính gia đình</p>
                </div>
              </Link>
            </SidebarHeader>
            <SidebarContent className="p-2 xl:p-4 !bg-white dark:!bg-slate-900">
              <SidebarMenu className="space-y-2 xl:space-y-3">
                {NAV_LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))}
                      tooltip={{ children: link.label, className: "ml-2 text-base xl:text-lg" }}
                      className="justify-start hover-lift rounded-xl mobile-friendly text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 data-[active=true]:bg-blue-100 dark:data-[active=true]:bg-blue-900 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300 nav-link-fhd py-3 xl:py-4 shadow-fhd"
                    >
                      <Link href={link.href} className="flex items-center gap-3 xl:gap-4">
                        <link.icon className="h-4 w-4 xl:h-6 xl:w-6 icon-sm-fhd" />
                        <span className="group-data-[collapsible=icon]:hidden font-medium text-base xl:text-lg">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2 xl:p-4 border-t border-slate-200 dark:border-slate-700 !bg-white dark:!bg-slate-900">
              <SidebarMenuButton 
                  onClick={handleLogout}
                  tooltip={{ children: "Đăng xuất", className: "ml-2 text-base xl:text-lg"}}
                  className="justify-start w-full hover-lift rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 mobile-friendly nav-link-fhd py-3 xl:py-4 shadow-fhd"
                  variant="outline"
                >
                  <LogOut className="h-4 w-4 xl:h-6 xl:w-6 icon-sm-fhd" />
                  <span className="group-data-[collapsible=icon]:hidden font-medium text-base xl:text-lg">Đăng xuất</span>
                </SidebarMenuButton>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex-1 flex flex-col overflow-x-hidden">
            <header className="sticky top-0 z-20 glass border-b border-border/20 safe-area-top shadow-fhd">
              <div className="flex items-center justify-between h-14 sm:h-16 xl:h-20 px-4 sm:px-6 xl:px-8">
                <div className="flex items-center gap-4 xl:gap-6">
                  <SidebarTrigger className="mobile-friendly p-2 xl:p-3 rounded-lg glass border-0 hover-lift nav-button-fhd" />
                  <div className="flex items-center gap-3 xl:gap-4">
                    <div className="hidden sm:block w-1 h-6 sm:h-8 xl:h-10 bg-gradient-primary rounded-full"></div>
                    <div>
                      <h2 className="text-base sm:text-lg xl:text-2xl 2xl:text-3xl font-bold text-foreground">{currentPageTitle}</h2>
                      <p className="text-xs xl:text-base text-muted-foreground hidden sm:block">Xin chào, {currentUser}!</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 xl:gap-4"> 
                  <button 
                    onClick={toggleTheme} 
                    aria-label="Toggle theme"
                    className="mobile-friendly rounded-xl glass border-0 hover-lift p-2 xl:p-3 nav-button-fhd shadow-fhd"
                  >
                    {theme === 'light' ? <Moon className="h-5 w-5 xl:h-6 xl:w-6" /> : <Sun className="h-5 w-5 xl:h-6 xl:w-6" />}
                  </button>
                  <UserNav />
                </div>
              </div>
            </header>
            <main className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-6",
              showMobileUI 
                ? "p-0" 
                : "p-4 sm:p-6"
            )}>
              <div className={cn(
                showMobileUI 
                  ? "w-full" 
                  : "max-w-7xl mx-auto"
              )}>
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
        
        {/* Mobile Bottom Navigation */}
        {showMobileUI && <MobileBottomNavigation />}
        
        <footer className="hidden md:block py-4 px-6 border-t border-border/50 bg-gradient-card text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Made with</span>
            <span className="text-red-500">♥</span>
            <span>by Hieu@hieungo.uk</span>
          </div>
        </footer>
      </div>
    </SidebarProvider>
  );
}
