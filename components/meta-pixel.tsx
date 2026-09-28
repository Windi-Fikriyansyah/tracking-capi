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
 * Base Code Meta Pixel murni tanpa event PageView atau event lainnya.
 * Seluruh event akan ditentukan dan ditambahkan secara mandiri oleh pengguna
 * melalui fitur Uji Peristiwa / Alat Penyiapan Peristiwa di Meta Events Manager.
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
  const firedRef = useRef<string | null>(null);

  // ── Route-based event: hanya kirim 1x per pathname ──
  useEffect(() => {
    // Jangan kirim ulang jika pathname sama (mencegah duplikat)
    if (firedRef.current === pathname) return;

    // Tunggu fbq siap (Script afterInteractive mungkin belum load)
    const timer = setTimeout(() => {
      if (!window.fbq) return;

      if (pathname === "/") {
        window.fbq("track", "PageView");
        firedRef.current = pathname;
      } else if (pathname === "/checkout") {
        window.fbq("track", "InitiateCheckout");
        firedRef.current = pathname;
      }
      // halaman lain: tidak ada event otomatis
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname]);

  if (!activePixelId) return null;

  return (
    <>
      <Script
        id="meta-pixel-base"
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

