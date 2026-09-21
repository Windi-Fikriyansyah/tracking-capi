import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrackCapi — CTWA Conversion Tracking via Meta Conversions API",
  description: "Track setiap konversi Click-to-WhatsApp (CTWA) langsung ke Meta Ads Manager via Conversions API. Server-side tracking, 99.4% akurasi, setup 10 menit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background text-on-background font-sans selection:bg-primary-container selection:text-surface-container-lowest antialiased relative overflow-x-hidden flex flex-col"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
