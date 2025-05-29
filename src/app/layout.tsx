
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Added

const geistSans = GeistSans; 
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Ngân Sách Gia Đình',
  description: 'Ứng dụng quản lý chi tiêu gia đình',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <ThemeProvider> {/* Added ThemeProvider */}
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
