import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import WhatsAppFloatingBtn from '@/components/WhatsAppFloatingBtn';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-inter',
});

import type { Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Fhoneify',
    default: 'Fhoneify - Premium Phone Resale',
  },
  description: "India's premium marketplace for selling and buying verified refurbished phones",
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
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
    <html lang="en">
      <body className={`${inter.variable} ${inter.className}`} style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
        <div className="custom-cursor" id="custom-cursor"></div>
        <Navbar />
        <main className="page-animate pb-[calc(80px+env(safe-area-inset-bottom,16px))] md:pb-0" style={{ minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
          {children}
        </main>
        <MobileBottomNav />
        <WhatsAppFloatingBtn />
        <script dangerouslySetInnerHTML={{
          __html: `
            let mouseX = 0, mouseY = 0;
            let cursorX = 0, cursorY = 0;
            let isHovering = false;

            document.addEventListener('mousemove', (e) => {
              mouseX = e.clientX;
              mouseY = e.clientY;
              isHovering = true;
            });

            document.addEventListener('mouseleave', () => {
              isHovering = false;
              const cursor = document.getElementById('custom-cursor');
              if (cursor) cursor.style.opacity = '0';
            });

            document.addEventListener('mouseenter', () => {
              const cursor = document.getElementById('custom-cursor');
              if (cursor) cursor.style.opacity = '1';
            });

            function tick() {
              const cursor = document.getElementById('custom-cursor');
              if (cursor && isHovering) {
                cursorX += (mouseX - cursorX) * 0.15;
                cursorY += (mouseY - cursorY) * 0.15;
                cursor.style.transform = 'translate3d(' + (cursorX - 16) + 'px, ' + (cursorY - 16) + 'px, 0)';
                cursor.style.opacity = '1';
              }
              requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          `
        }} />
      </body>
    </html>
  );
}
