"use client";

import React from "react";
import Script from "next/script";

// Type definition for window.fbq
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
  }
}

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1023827323852108";

/**
 * Safely trigger standard Meta Pixel events on the client side.
 * e.g. trackMetaEvent('ViewContent', { content_name: 'Paket 6 Bulan', value: 149000, currency: 'IDR' })
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      if (params) {
        window.fbq("track", eventName, params);
      } else {
        window.fbq("track", eventName);
      }
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking event ${eventName}:`, err);
    }
  }
}

/**
 * Safely trigger custom Meta Pixel events on the client side.
 */
export function trackMetaCustomEvent(
  eventName: string,
  params?: Record<string, unknown>
): void {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    try {
      if (params) {
        window.fbq("trackCustom", eventName, params);
      } else {
        window.fbq("trackCustom", eventName);
      }
    } catch (err) {
      console.warn(`[Meta Pixel] Error tracking custom event ${eventName}:`, err);
    }
  }
}

interface MetaPixelProps {
  pixelId?: string;
}

export default function MetaPixel({ pixelId }: MetaPixelProps) {
  const activePixelId = pixelId || META_PIXEL_ID;

  if (!activePixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel-init"
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
