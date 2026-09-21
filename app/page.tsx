import LandingPage from "@/components/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrackCapi — Track Setiap Konversi CTWA di Meta Ads Manager",
  description:
    "Iklan CTWA Anda menghasilkan chat, tapi Meta bilang 0 konversi? TrackCapi mengirim setiap event WhatsApp ke Meta Conversions API secara server-side. 99.4% akurasi, setup 10 menit.",
};

export default function HomePage() {
  return <LandingPage />;
}
