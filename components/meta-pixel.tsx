"use client";

import React, { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1603845487907640";

/* ───────────────────────────────────────────────
   Helper: fire a single Meta Pixel event safely.
   ─────────────────────────────────────────────── */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

export function trackMetaEvent(
  eventName: string,
  params?: Record<string, any>
) {
  if (typeof window !== "undefined" && window.fbq) {
    if (params) {
      window.fbq("track", eventName, params);
    } else {
      window.fbq("track", eventName);
    }
  }
}

interface MetaPixelProps {
  pixelId?: string;
}

/**
 * Base Code Meta Pixel — autoConfig DIMATIKAN agar fbevents.js
 * tidak otomatis mengirim PageView, ViewContent, dll.
 *
 * Event routing terpusat berdasarkan pathname:
 *   "/" → PageView (1x)
 *   "/checkout" → InitiateCheckout (1x)
 *   AddPaymentInfo → dipicu manual dari checkout saat transactionData terisi
 *   Purchase → server-side CAPI, tidak disentuh
 */
export default function MetaPixel({ pixelId }: MetaPixelProps) {
  const activePixelId = pixelId || META_PIXEL_ID;
  const pathname = usePathname();

  // Set mencegah duplikat dari React Strict Mode (double-mount) dan SPA re-render
  const firedEvents = useRef<Set<string>>(new Set());

  // ── Route-based event: hanya kirim 1x per route ──
  useEffect(() => {
    const key = `${pathname}`;

    // Sudah pernah kirim event untuk route ini? Skip.
    if (firedEvents.current.has(key)) return;

    // Tunggu fbq siap (Script afterInteractive mungkin belum load)
    const timer = setTimeout(() => {
      if (!window.fbq) return;

      if (pathname === "/") {
        window.fbq("track", "PageView");
      } else if (pathname === "/checkout") {
        window.fbq("track", "InitiateCheckout");
      } else {
        // Halaman lain: tidak ada event otomatis
        return;
      }

      firedEvents.current.add(key);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!activePixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="lazyOnload"
        onLoad={() => {
          if (window.fbq && !firedEvents.current.has(pathname)) {
            if (pathname === "/") {
              window.fbq("track", "PageView");
              firedEvents.current.add(pathname);
            } else if (pathname === "/checkout") {
              window.fbq("track", "InitiateCheckout");
              firedEvents.current.add(pathname);
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
            fbq('set', 'autoConfig', false, '${activePixelId}');
            fbq('init', '${activePixelId}');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${activePixelId}&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
