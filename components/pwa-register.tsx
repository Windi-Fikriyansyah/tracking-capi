"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("[PWA] ServiceWorker registration failed:", error);
          });
      });
    } else if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV !== "production"
    ) {
      // In development, also register so installability can be tested locally
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA Dev] ServiceWorker active:", registration.scope);
        })
        .catch((error) => {
          console.warn("[PWA Dev] ServiceWorker registration:", error);
        });
    }
  }, []);

  return null;
}
