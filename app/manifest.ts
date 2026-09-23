import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TrackCapi - CTWA Conversion Tracking",
    short_name: "TrackCapi",
    description:
      "Server-Side Meta CAPI Tracking untuk Click-to-WhatsApp Ads dengan akurasi 99.4%",
    start_url: "/dashboard/tracking",
    display: "standalone",
    background_color: "#060c1d",
    theme_color: "#0a122a",
    orientation: "portrait-primary",
    scope: "/",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
