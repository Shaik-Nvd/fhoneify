'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';

export const FB_PIXEL_ID = '1068307909151936';

// Admin pages are not tracked. The pixel counts client-side page changes on
// its own (it hooks history.pushState once loaded), so links from public pages
// into /admin must be full page loads (plain <a> / window.location) to keep
// the pixel off the page there.
export const isUntrackedPath = (path: string) => path === '/admin' || path.startsWith('/admin/');

export default function FacebookPixel() {
  const pathname = usePathname();

  if (isUntrackedPath(pathname)) return null;

  return (
    <>
      {/* Facebook Pixel Code */}
      <Script id="facebook-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${FB_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* Raw HTML so React doesn't preload the image (and count a visit) when JS is on. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html: `<img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1" />`,
        }}
      />
      {/* End Facebook Pixel Code */}
    </>
  );
}
