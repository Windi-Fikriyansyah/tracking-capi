"use client";

import React, { useEffect, useRef, Suspense } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

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
      console.log(`[Meta Pixel]: Event '${eventName}' berhasil dikirim`, params || "");
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
      console.log(`[Meta Pixel]: Custom Event '${eventName}' berhasil dikirim`, params || "");
    }
  } catch (err) {
    console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, err);
  }
}

function MetaPixelInner({ pixelId }: { pixelId?: string }) {
  const activePixelId = pixelId || META_PIXEL_ID;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  // Kirim PageView HANYA saat terjadi perubahan rute (SPA Navigation di Next.js)
  // Kunjungan pertama (initial load) sudah otomatis ditangani oleh Base Script Meta di bawah
  useEffect(() => {
    if (!activePixelId) return;

    if (isFirstRender.current) {
      // Lewati render pertama karena script inline sudah menembak PageView awal
      isFirstRender.current = false;
      return;
    }

    // Tembak PageView untuk navigasi halaman berikutnya (misal pindah ke /checkout)
    trackMetaEvent("PageView");
  }, [pathname, searchParams, activePixelId]);

  if (!activePixelId) return null;

  return (
    <>
      {/* Base Code Resmi Meta Pixel */}
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
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${activePixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
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
