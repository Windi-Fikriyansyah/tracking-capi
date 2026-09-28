"use client";

import React, { useEffect, Suspense } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

// Type definition for window.fbq
declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    _fbqQueue?: Array<{
      type: "track" | "trackCustom";
      eventName: string;
      params?: Record<string, unknown>;
    }>;
  }
}

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1023827323852108";

/**
 * Helper pengiriman event Meta Pixel (Client-Side).
 * Jika script Meta Pixel masih dalam proses download, event otomatis diantrikan di queue
 * dan akan langsung dieksekusi begitu script siap.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    try {
      if (params) {
        window.fbq("track", eventName, params);
      } else {
        window.fbq("track", eventName);
      }
      console.log(`[Meta Pixel Track]: ${eventName}`, params || "");
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking event ${eventName}:`, err);
    }
  } else {
    // Antrikan di memori agar event tidak hilang saat script belum selesai diunduh
    window._fbqQueue = window._fbqQueue || [];
    window._fbqQueue.push({ type: "track", eventName, params });
  }
}

/**
 * Safely trigger custom Meta Pixel events on the client side.
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;

  if (typeof window.fbq === "function") {
    try {
      if (params) {
        window.fbq("trackCustom", eventName, params);
      } else {
        window.fbq("trackCustom", eventName);
      }
      console.log(`[Meta Pixel TrackCustom]: ${eventName}`, params || "");
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, err);
    }
  } else {
    window._fbqQueue = window._fbqQueue || [];
    window._fbqQueue.push({ type: "trackCustom", eventName, params });
  }
}

function MetaPixelInner({ pixelId }: { pixelId?: string }) {
  const activePixelId = pixelId || META_PIXEL_ID;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Kirim PageView otomatis setiap kali rute atau halaman berubah di Next.js (SPA Navigation)
  useEffect(() => {
    if (!activePixelId) return;

    // Eksekusi antrean yang tertunda jika ada
    if (typeof window !== "undefined" && typeof window.fbq === "function" && window._fbqQueue?.length) {
      const queue = [...window._fbqQueue];
      window._fbqQueue = [];
      queue.forEach((item) => {
        if (item.params) {
          window.fbq(item.type, item.eventName, item.params);
        } else {
          window.fbq(item.type, item.eventName);
        }
      });
    }

    // Trigger PageView
    trackMetaEvent("PageView");
  }, [pathname, searchParams, activePixelId]);

  if (!activePixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel-init"
        strategy="afterInteractive"
        onLoad={() => {
          // Begitu script fbevents.js selesai dimuat, langsung proses antrean jika ada
          if (typeof window !== "undefined" && typeof window.fbq === "function") {
            if (window._fbqQueue?.length) {
              const queue = [...window._fbqQueue];
              window._fbqQueue = [];
              queue.forEach((item) => {
                if (item.params) {
                  window.fbq(item.type, item.eventName, item.params);
                } else {
                  window.fbq(item.type, item.eventName);
                }
              });
            }
          }
        }}
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
            window.fbq('init', '${activePixelId}');
            window.fbq('track', 'PageView');
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
