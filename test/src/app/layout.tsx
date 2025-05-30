
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Providers } from './providers';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/constants';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Ứng dụng quản lý chi tiêu gia đình của Minh Đan và Minh Hiếu, phát triển bởi Ngô Minh Hiếu.',
  manifest: '/manifest.json', // Link to manifest file
  appleWebApp: { // Apple specific PWA settings
    capable: true,
    statusBarStyle: 'default', // or 'black-translucent'
    title: APP_NAME,
    // startupImage: [ // You can add startup images for different iOS devices
    //   { url: '/splash/iphone5_splash.png', media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)' },
    // ]
  },
  formatDetection: {
    telephone: false,
  },
  // Other common PWA meta tags can be added here if needed
  // themeColor: [ // theme-color for different schemes
  //   { media: '(prefers-color-scheme: light)', color: '#E8F5E9' },
  //   { media: '(prefers-color-scheme: dark)', color: '#1C2B1F' }, // Example dark theme color
  // ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zooming up to 5x
  userScalable: true, // Allow user to scale (zoom)
  themeColor: '#388E3C', // Primary theme color for address bar, etc.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/*
          It's generally recommended to let Next.js handle the manifest link via metadata.
          If you need more control or older browser support, you can uncomment the line below.
          <link rel="manifest" href="/manifest.json" />
        */}
        {/*
          It's generally recommended to let Next.js handle theme-color via viewport metadata.
          If you need more control or older browser support, you can uncomment the line below.
          <meta name="theme-color" content="#388E3C" />
        */}
         <link rel="apple-touch-icon" href="/icons/icon-192x192.png"></link>
      </head>
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
