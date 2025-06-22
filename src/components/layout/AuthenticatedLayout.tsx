"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/layout/UserNav';
import { GlobalAlertToaster } from '@/components/layout/GlobalAlertToaster';
import { useTheme } from '@/contexts/ThemeContext'; 
import { useIsMobile } from '@/hooks/use-mobile';
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

// Mobile Bottom Navigation Component
function MobileBottomNav({ currentPath }: { currentPath: string }) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 safe-area-bottom z-50">
      <div className="grid grid-cols-4 gap-1 p-2">
        {NAV_LINKS.slice(0, 4).map((link) => {
          const isActive = currentPath === link.href || (link.href !== "/dashboard" && currentPath.startsWith(link.href));
          return (
            <Link 
              key={link.href}
              href={link.href}
              className={`mobile-friendly flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <link.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium truncate">
                {link.label.replace(/\s+/g, ' ').split(' ')[0]}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthStore((state) => ({
    currentUser: state.currentUser,
  }));
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme(); 
  const isMobile = useIsMobile();
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
      <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-background via-background to-muted/20"> 
        <div className="flex flex-1"> 
          <Sidebar className="border-r border-border/50 !bg-white dark:!bg-slate-900" collapsible="icon">
            <SidebarHeader className="p-4 border-b border-sidebar-border/50 !bg-white dark:!bg-slate-900">
              <Link href="/dashboard" className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center hover-lift">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <PiggyBank className="h-6 w-6 text-white" />
                </div>
                <div className="group-data-[collapsible=icon]:hidden">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{APP_NAME}</h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Quản lý tài chính gia đình</p>
                </div>
              </Link>
            </SidebarHeader>
            <SidebarContent className="p-2 !bg-white dark:!bg-slate-900">
              <SidebarMenu>
                {NAV_LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))}
                      tooltip={{ children: link.label, className: "ml-2" }}
                      className="justify-start hover-lift rounded-xl mobile-friendly text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 data-[active=true]:bg-blue-100 dark:data-[active=true]:bg-blue-900 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300"
                    >
                      <Link href={link.href} className="flex items-center gap-3">
                        <link.icon className="h-4 w-4" />
                        <span className="group-data-[collapsible=icon]:hidden font-medium">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="p-2 border-t border-slate-200 dark:border-slate-700 !bg-white dark:!bg-slate-900">
              <SidebarMenuButton 
                  onClick={handleLogout}
                  tooltip={{ children: "Đăng xuất", className: "ml-2"}}
                  className="justify-start w-full hover-lift rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 mobile-friendly"
                  variant="ghost"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden font-medium">Đăng xuất</span>
                </SidebarMenuButton>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset className="flex-1 flex flex-col overflow-x-hidden">
            <header className="sticky top-0 z-20 glass border-b border-border/20 safe-area-top">
              <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="mobile-friendly p-2 rounded-lg glass border-0 hover-lift" />
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-1 h-6 sm:h-8 bg-gradient-primary rounded-full"></div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-foreground">{currentPageTitle}</h2>
                      <p className="text-xs text-muted-foreground hidden sm:block">Xin chào, {currentUser}!</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2"> 
                  <button 
                    onClick={toggleTheme} 
                    aria-label="Toggle theme"
                    className="mobile-friendly rounded-xl glass border-0 hover-lift p-2"
                  >
                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  </button>
                  <UserNav />
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-20 md:pb-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </SidebarInset>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav currentPath={pathname} />
        
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
