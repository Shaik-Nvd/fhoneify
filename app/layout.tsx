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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Meta Pixel Code */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '5476402322498970');
              fbq('track', 'PageView');
            `,
          }}
        />
        {/* Raw HTML so React doesn't preload the image (and count every visit twice) when JS is on. */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=5476402322498970&ev=PageView&noscript=1" />`,
          }}
        />
        {/* End Meta Pixel Code */}
      </head>
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
