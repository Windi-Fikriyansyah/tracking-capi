import DashboardLayout from "@/components/dashboard/dashboard-layout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - TrackCapi CAPI Telemetry Portal",
  description: "Enterprise Telemetry for Meta Ads Conversions API",
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
