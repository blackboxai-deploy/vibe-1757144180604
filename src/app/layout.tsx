import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Inventory Management System',
    template: '%s | Inventory Management System'
  },
  description: 'Complete inventory and e-commerce management solution with role-based access control and comprehensive audit trails.',
  keywords: ['inventory', 'management', 'e-commerce', 'warehouse', 'stock', 'orders', 'suppliers'],
  authors: [{ name: 'Inventory Management System' }],
  creator: 'Inventory Management System',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Inventory Management System',
    description: 'Complete inventory and e-commerce management solution',
    siteName: 'Inventory Management System',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Inventory Management System',
    description: 'Complete inventory and e-commerce management solution',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
          <Toaster 
            position="top-right"
            expand={true}
            richColors
            closeButton
            toastOptions={{
              duration: 5000,
              className: 'rounded-2xl border-0 shadow-lg',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}