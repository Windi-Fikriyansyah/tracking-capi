"use client";

import React from "react";
import Script from "next/script";

export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || "1603845487907640";

interface MetaPixelProps {
  pixelId?: string;
}

/**
 * Base Code Meta Pixel murni tanpa event bawaan.
 * Memungkinkan pelacakan dan penambahan event dilakukan secara manual melalui
 * fitur 'Uji Peristiwa' (Test Events) / Event Setup Tool di Meta Events Manager.
 */
export default function MetaPixel({ pixelId }: MetaPixelProps) {
  const activePixelId = pixelId || META_PIXEL_ID;

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
