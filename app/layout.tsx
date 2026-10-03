import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import '@/styles/globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import WhatsAppFloatingBtn from '@/components/WhatsAppFloatingBtn';
import { Analytics } from "@vercel/analytics/next";
import KeepAlivePing from '@/components/KeepAlivePing';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Fhoneify',
    default: 'Fhoneify | Premium Phone Resale',
  },
  description: "India's premium marketplace for selling and buying verified refurbished phones",
};

export const viewport: Viewport = {
  themeColor: 'var(--background)',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${fraunces.variable} ${inter.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a href="#main-content" className="skip-link">Skip to content</a>
          <Navbar />
          <div className="pb-[calc(80px+env(safe-area-inset-bottom,16px))] md:pb-0">
            <main id="main-content" className="page-animate" style={{ minHeight: '100vh' }}>
              {children}
            </main>
            <Footer />
          </div>
          <MobileBottomNav />
          <WhatsAppFloatingBtn />
          <Analytics />
          <KeepAlivePing />
        </ThemeProvider>
      </body>
    </html>
  );
}
