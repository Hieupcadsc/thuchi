
import type { Metadata, Viewport } from 'next'; // Added Viewport
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { ThemeProvider } from '@/contexts/ThemeContext';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'Ngân Sách Gia Đình',
  description: 'Ứng dụng quản lý chi tiêu gia đình',
};

// Explicitly define viewport settings for better mobile control
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zooming up to 5x, or a value you prefer
  userScalable: true, // Allow user to scale (zoom)
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <Providers>
            {children}
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
