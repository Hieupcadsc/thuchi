"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { UserNav } from '@/components/layout/UserNav';
import { GlobalAlertToaster } from '@/components/layout/GlobalAlertToaster';
import { WeakPasswordWarning } from '@/components/auth/WeakPasswordWarning';
import { ChatBot } from '@/components/ui/ChatBot';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { LogOut, Wallet, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthStore((state) => ({ currentUser: state.currentUser }));
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { showMobileUI } = useMobileFirst();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) router.replace('/login');
  }, [currentUser, router]);

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [pathname, isMobile]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => logout();
  const currentPageTitle = NAV_LINKS.find(
    (link) => pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
  )?.label || APP_NAME;

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <GlobalAlertToaster />
      <WeakPasswordWarning />

      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <Sidebar
          collapsible="icon"
          className="border-r-0 [&>div]:bg-sidebar [&>div]:text-sidebar-foreground"
        >
          {/* Logo */}
          <SidebarHeader className="px-4 py-5 border-b border-sidebar-border/40">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shrink-0">
                <Wallet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="group-data-[collapsible=icon]:hidden min-w-0">
                <p className="font-bold text-sm text-sidebar-foreground truncate">{APP_NAME}</p>
                <p className="text-[11px] text-sidebar-foreground/50">Tài chính gia đình</p>
              </div>
            </Link>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="px-2 py-3">
            <SidebarMenu className="space-y-0.5">
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/dashboard' && pathname.startsWith(link.href));
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={{ children: link.label }}
                      className={cn(
                        'rounded-lg py-2.5 px-3 text-sm font-medium transition-colors',
                        'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                        isActive && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground'
                      )}
                    >
                      <Link href={link.href} className="flex items-center gap-3">
                        <link.icon className="w-4 h-4 shrink-0" />
                        <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter className="px-2 py-3 border-t border-sidebar-border/40">
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip={{ children: 'Đăng xuất' }}
              className="rounded-lg py-2.5 px-3 text-sm font-medium text-sidebar-foreground/60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors w-full"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Đăng xuất</span>
            </SidebarMenuButton>

            {/* User info */}
            <div className="group-data-[collapsible=icon]:hidden mt-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{currentUser}</p>
              <p className="text-[11px] text-sidebar-foreground/50">Đang hoạt động</p>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main area ────────────────────────────────────────────────────── */}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Top header */}
          <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 sm:px-6 bg-background/95 backdrop-blur-sm border-b border-border/60">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />
              <div>
                <h2 className="text-sm font-semibold text-foreground leading-none">{currentPageTitle}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">Xin chào, {currentUser}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {theme === 'light'
                  ? <Moon className="w-4 h-4" />
                  : <Sun className="w-4 h-4" />}
              </button>
              <UserNav />
            </div>
          </header>

          {/* Page content */}
          <main className={cn(
            'flex-1 overflow-y-auto overflow-x-hidden',
            showMobileUI ? 'p-0 pb-20' : 'p-4 sm:p-6 pb-6'
          )}>
            <div className="w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {showMobileUI && <MobileBottomNavigation />}
      <ChatBot />
    </SidebarProvider>
  );
}
