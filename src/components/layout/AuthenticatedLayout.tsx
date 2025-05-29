
"use client";

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { NAV_LINKS, APP_NAME } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/layout/UserNav';
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
import { LogOut, PiggyBank } from 'lucide-react';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const familyId = useAuthStore((state) => state.familyId);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!familyId) {
      router.replace('/login');
    }
  }, [familyId, router]);

  if (!familyId) {
    return <div className="flex items-center justify-center min-h-screen"><p>Đang chuyển hướng đến trang đăng nhập...</p></div>;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };
  
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen">
        <Sidebar className="border-r" collapsible="icon">
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <PiggyBank className="h-8 w-8 text-sidebar-primary" />
              <h1 className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">{APP_NAME}</h1>
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
              {NAV_LINKS.map((link) => (
                <SidebarMenuItem key={link.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href))}
                    tooltip={{ children: link.label, className: "ml-2" }}
                    className="justify-start"
                  >
                    <Link href={link.href}>
                      <link.icon className="h-5 w-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 border-t border-sidebar-border">
             <SidebarMenuButton 
                onClick={handleLogout}
                tooltip={{ children: "Đăng xuất", className: "ml-2"}}
                className="justify-start w-full"
                variant="ghost"
              >
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">Đăng xuất</span>
              </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <h2 className="text-lg font-semibold">{NAV_LINKS.find(link => pathname.startsWith(link.href))?.label || APP_NAME}</h2>
            </div>
            <UserNav />
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
