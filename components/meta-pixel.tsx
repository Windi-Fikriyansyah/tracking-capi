"use client";

import React, { useEffect, useRef, Suspense } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// Type definition for window.fbq
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
  }
}

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1603845487907640";

/**
 * Helper untuk memicu event standar Meta Pixel secara aman di sisi client.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof window.fbq === "function") {
      if (params) {
        window.fbq("track", eventName, params);
      } else {
        window.fbq("track", eventName);
      }
      console.log(`[Meta Pixel]: Event '${eventName}' terkirim`, params || "");
    }
  } catch (err) {
    console.warn(`[Meta Pixel] Error tracking event ${eventName}:`, err);
  }
}

/**
 * Helper untuk memicu custom event Meta Pixel secara aman di sisi client.
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof window.fbq === "function") {
      if (params) {
        window.fbq("trackCustom", eventName, params);
      } else {
        window.fbq("trackCustom", eventName);
      }
      console.log(`[Meta Pixel]: Custom Event '${eventName}' terkirim`, params || "");
    }
  } catch (err) {
    console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, err);
  }
}

function MetaPixelInner({ pixelId }: { pixelId?: string }) {
  const activePixelId = pixelId || META_PIXEL_ID;
  const pathname = usePathname();
  const hasTrackedLandingPageView = useRef(false);

  // Event PageView HANYA terkirim di Landing Page ('/').
  // Di halaman /checkout atau halaman lainnya, PageView DILARANG terkirim.
  useEffect(() => {
    if (!activePixelId) return;

    if (pathname === "/") {
      if (!hasTrackedLandingPageView.current) {
        hasTrackedLandingPageView.current = true;
        trackMetaEvent("PageView");
      }
    } else {
      // Reset ref jika user bernavigasi kembali ke landing page nanti
      hasTrackedLandingPageView.current = false;
    }
  }, [pathname, activePixelId]);

  if (!activePixelId) return null;

  return (
    <>
      {/* Base Code Resmi Meta Pixel (Hanya init Pixel ID, TIDAK memanggil PageView secara otomatis) */}
      <Script
        id="meta-pixel-script"
        strategy="afterInteractive"
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
            fbq('init', '${activePixelId}');
          `,
        }}
      />
    </>
  );
}

export default function MetaPixel({ pixelId }: { pixelId?: string }) {
  return (
    <Suspense fallback={null}>
      <MetaPixelInner pixelId={pixelId} />
    </Suspense>
  );
}
