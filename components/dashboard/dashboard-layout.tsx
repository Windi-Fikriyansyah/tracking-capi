"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Network,
  PlusCircle,
  MessageSquare,
  Settings,
  BookOpen,
  Circle,
  LogOut,
  Menu,
  X,
  Loader2,
  ShieldAlert,
  Target,
  Lock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export interface SubscriptionData {
  hasSubscription: boolean;
  isExpired: boolean;
  planId: string;
  planName: string;
  paidAt?: string;
  expiresAt?: string;
  daysLeft: number;
  formattedExpiresAt: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("SP");

  // Subscription state
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [refreshingSub, setRefreshingSub] = useState(false);

  // Auth Guard States
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsAuthChecking(true);

    // 1. Check demo session first
    if (typeof window !== "undefined") {
      const demo = localStorage.getItem("signalpulse_demo_session");
      if (demo) {
        try {
          const parsed = JSON.parse(demo);
          if (parsed?.email) {
            setUserEmail(parsed.email);
            setUserInitials(parsed.email.slice(0, 2).toUpperCase());
            setIsAuthenticated(true);
            setIsAuthChecking(false);
            return;
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Check Supabase session
    if (isSupabaseConfigured) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          setUserEmail(session.user.email);
          setUserInitials(session.user.email.slice(0, 2).toUpperCase());
          setIsAuthenticated(true);
          setIsAuthChecking(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.email) {
          setUserEmail(user.email);
          setUserInitials(user.email.slice(0, 2).toUpperCase());
          setIsAuthenticated(true);
          setIsAuthChecking(false);
          return;
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    }

    // 3. Unauthorized: Block access and redirect to login portal
    setIsAuthenticated(false);
    setIsAuthChecking(false);
    const redirectTarget = pathname ? `&redirect=${encodeURIComponent(pathname)}` : "";
    router.replace(`/?unauthorized=true${redirectTarget}`);
  }, [pathname, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Real-time listener for Auth state changes (e.g. sign out)
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        const demo = typeof window !== "undefined" ? localStorage.getItem("signalpulse_demo_session") : null;
        if (!demo) {
          setIsAuthenticated(false);
          router.replace("/?unauthorized=true");
        }
      } else if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserInitials(session.user.email.slice(0, 2).toUpperCase());
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("signalpulse_demo_session");
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    router.replace("/");
  };

  const fetchSubscription = useCallback(async (email: string) => {
    if (!email) return;
    setLoadingSubscription(true);
    try {
      const res = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`);
      const data = await res.json().catch(() => ({}));
      if (data && data.success) {
        setSubscription(data);
      }
    } catch (err) {
      console.warn("Failed to fetch subscription status:", err);
    } finally {
      setLoadingSubscription(false);
    }
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchSubscription(userEmail);
    }
  }, [userEmail, fetchSubscription]);

  const handleRefreshSubscription = async () => {
    if (!userEmail) return;
    setRefreshingSub(true);
    await fetchSubscription(userEmail);
    setTimeout(() => setRefreshingSub(false), 600);
  };

  const navItems = [
    {
      label: "Tracking WhatsApp",
      href: "/dashboard/tracking",
      icon: Target,
      active: pathname.startsWith("/dashboard/tracking") || pathname === "/dashboard",
      badge: (
        <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-code-metric bg-primary/10 text-primary border border-primary/30">
          CTWA
        </span>
      ),
    },
    {
      label: "Connect WhatsApp",
      href: "/dashboard/connect-whatsapp",
      icon: MessageSquare,
      active: pathname.startsWith("/dashboard/connect-whatsapp"),
      badge: (
        <span className="ml-auto w-2 h-2 rounded-full bg-tertiary glow-dot animate-ping" />
      ),
    },
    {
      label: "Pengaturan",
      href: "/dashboard/settings",
      icon: Settings,
      active: pathname.startsWith("/dashboard/settings"),
      badge: null,
    },
  ];

  // Auth Guard Screen: shown while checking session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background text-on-surface flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-primary/40 flex items-center justify-center text-primary glow-cyan shadow-[0_0_20px_rgba(6,182,212,0.2)]">
          <ShieldAlert className="w-7 h-7 animate-pulse text-primary" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-headline-sm font-semibold text-on-surface">
            Memverifikasi Hak Akses...
          </h2>
          <p className="text-body-sm text-on-surface-variant font-code-metric">
            Protected Telemetry Route • SignalPulse Security Gateway
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-code-metric text-primary">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Memeriksa sesi login Supabase...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, do not render dashboard content at all
  if (!isAuthenticated) {
    return null;
  }

  const isExpired = Boolean(subscription?.isExpired);

  return (
    <div className="bg-background text-on-surface font-body-md antialiased overflow-x-hidden min-h-screen selection:bg-primary-container selection:text-on-primary-container flex">
      {/* MOBILE MENU BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside
        className={`h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/30 bg-surface-container-lowest z-50 flex flex-col justify-between p-4 transition-transform duration-200 md:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="space-y-6 overflow-y-auto">
          {/* Organization / Header Workspace */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary glow-cyan">
                <Network className="w-[18px] h-[18px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold text-primary">
                  TrackCapi
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant font-code-metric">
                  Meta Graph v19.0
                </span>
              </div>
            </div>

            {/* Close Button on Mobile */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1 text-on-surface-variant hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Action CTA */}


          {/* Primary Nav Tabs */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${item.active
                    ? "bg-surface-container-high text-primary font-medium border-l-2 border-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-label-md text-label-md">{item.label}</span>
                  {item.badge}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* SUBSCRIPTION STATUS WIDGET & FOOTER */}
        <div className="space-y-3 pt-2">
          {/* Active Subscription Badge Box */}
          <div
            className={`p-3 rounded-xl border transition-all ${isExpired
              ? "bg-error-container/10 border-error/40 text-error"
              : subscription?.daysLeft && subscription.daysLeft <= 14
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                : "bg-surface-container-high border-primary/25 text-on-surface"
              }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant/20">
              <span className="text-[11px] font-semibold tracking-wide uppercase flex items-center gap-1.5 font-code-metric">
                <Zap className="w-3 h-3 text-primary" />
                {subscription?.planName || "Paket Langganan"}
              </span>

              {isExpired ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-error/20 text-error border border-error/30 uppercase font-code-metric">
                  Expired
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/30 uppercase font-code-metric flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  Aktif
                </span>
              )}
            </div>

            <div className="pt-2 space-y-1 font-code-metric text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant text-[11px]">Sisa Waktu:</span>
                <span className={`font-bold ${isExpired ? "text-error" : "text-tertiary"}`}>
                  {isExpired ? "0 Hari (Habis)" : `${subscription?.daysLeft ?? 0} Hari`}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] text-outline">
                <span>Berlaku s/d:</span>
                <span className="text-on-surface-variant truncate max-w-[120px]">
                  {subscription?.formattedExpiresAt || "-"}
                </span>
              </div>
            </div>

            {/* Renewal Link Button */}
            <Link
              href={isExpired ? "/checkout?plan=6-bulan" : `/checkout?plan=${subscription?.planId || "6-bulan"}`}
              className={`mt-2.5 w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all text-center ${isExpired
                ? "bg-error text-white hover:bg-error/90 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isExpired ? "Perpanjang Sekarang" : "Perpanjang Paket"}</span>
            </Link>
          </div>

          {/* Utility Links & Sign Out */}
          <div className="border-t border-outline-variant/30 pt-2 space-y-1">


            <div className="flex items-center justify-between px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150 cursor-pointer text-xs">
              <div className="flex items-center gap-2.5">
                <Circle className="w-3 h-3 text-tertiary fill-tertiary" />
                <span className="font-label-md text-label-md">System Status</span>
              </div>
              <span className="font-code-metric text-[10px] text-outline">100% UP</span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-error/80 hover:text-error hover:bg-error-container/20 transition-colors duration-150 cursor-pointer text-left text-xs"
            >
              <div className="flex items-center gap-2.5">
                <LogOut className="w-4 h-4" />
                <span className="font-label-md text-label-md">Keluar Portal</span>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTAINER */}
      <div className="md:ml-64 flex flex-col min-h-screen bg-background w-full">
        {/* TOP NAVIGATION BAR */}
        <header className="sticky top-0 z-30 flex justify-between items-center w-full px-4 md:px-6 h-14 bg-surface-container-lowest border-b border-outline-variant/30">
          {/* Left side: Hamburger (mobile) + Global Search */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Subscription Status Chip in Header */}
            {subscription && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-code-metric border ${isExpired
                  ? "bg-error/15 border-error/40 text-error"
                  : subscription.daysLeft <= 14
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-tertiary/10 border-tertiary/30 text-tertiary"
                  }`}
              >
                {isExpired ? (
                  <>
                    <Lock className="w-3 h-3 text-error" />
                    <span>Paket Berakhir (Fitur Terkunci)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                    <span>
                      {subscription.planName} • Sisa {subscription.daysLeft} Hari
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right side: Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Profile Avatar with Title */}
            <div
              onClick={handleSignOut}
              className="w-7 h-7 rounded bg-surface-container-highest border border-outline/30 flex items-center justify-center font-code-metric text-xs font-semibold text-primary ml-1 cursor-pointer hover:border-primary transition-colors"
              title={`Logged in as ${userEmail} - Click to Sign Out`}
            >
              {userInitials}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT CONTAINER WITH SUBSCRIPTION LOCK OVERLAY */}
        <main className="p-3.5 sm:p-4 md:p-6 space-y-4 sm:space-y-6 flex-1 relative">
          {/* FEATURE LOCK OVERLAY: Displayed if subscription is expired */}
          {isExpired && (
            <div className="fixed inset-0 z-40 md:ml-64 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              <div className="max-w-2xl w-full my-auto bg-surface-container-lowest border border-error/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] space-y-6 text-center animate-in fade-in zoom-in duration-200">
                {/* Lock Icon */}
                <div className="w-16 h-16 rounded-2xl bg-error/10 border border-error/40 text-error flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.3)]">
                  <Lock className="w-8 h-8" />
                </div>

                {/* Lock Heading & Info */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-code-metric bg-error/20 text-error border border-error/40">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>MASA AKTIF PAKET TELAH BERAKHIR</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    Akses Fitur Terkunci
                  </h2>
                  <p className="text-body-sm text-on-surface-variant max-w-lg mx-auto leading-relaxed">
                    Masa aktif paket <strong>{subscription?.planName || "TrackCapi"}</strong> Anda telah habis pada{" "}
                    <span className="text-error font-medium">{subscription?.formattedExpiresAt || "hari ini"}</span>.
                    Seluruh pengiriman event Meta CAPI, otomatisasi pesan CTWA, sinkronisasi akun WhatsApp, dan telemetri dinonaktifkan sementara.
                  </p>
                </div>

                {/* Plan Renewal Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
                  {/* Option 1: 6 Bulan */}
                  <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary font-code-metric">
                          Paket 6 Bulan
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 font-code-metric">
                          Reguler
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-on-surface">
                        Rp 149.000
                        <span className="text-xs font-normal text-on-surface-variant ml-1">/ 6 Bulan</span>
                      </div>
                      <ul className="text-xs text-on-surface-variant space-y-1.5 pt-2 font-body-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Akses penuh 6 bulan ke depan</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Unlimited Event CAPI & CTWA</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Dukungan Zernio Partner & WABA</span>
                        </li>
                      </ul>
                    </div>

                    <Link
                      href="/checkout?plan=6-bulan"
                      className="w-full py-2.5 px-4 rounded-lg bg-surface-container-high hover:bg-primary/20 hover:text-primary text-on-surface border border-outline-variant/40 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                    >
                      <span>Perpanjang 6 Bulan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Option 2: 1 Tahun (Recommended) */}
                  <div className="p-5 rounded-xl bg-surface-container-low border-2 border-tertiary/50 hover:border-tertiary transition-all flex flex-col justify-between space-y-4 relative overflow-hidden shadow-[0_0_20px_rgba(78,222,163,0.15)]">
                    <div className="absolute top-0 right-0 bg-tertiary text-[#050d25] px-2.5 py-0.5 text-[10px] font-bold rounded-bl font-code-metric uppercase">
                      Paling Hemat
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-tertiary font-code-metric">
                          Paket 1 Tahun
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-on-surface">
                        Rp 249.000
                        <span className="text-xs font-normal text-on-surface-variant ml-1">/ 12 Bulan</span>
                      </div>
                      <ul className="text-xs text-on-surface-variant space-y-1.5 pt-2 font-body-sm">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Akses penuh 1 tahun (12 bulan)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Hemat Rp 49.000 dibanding 6 bulan</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tertiary shrink-0" />
                          <span>Prioritas pembaruan Meta API v20+</span>
                        </li>
                      </ul>
                    </div>

                    <Link
                      href="/checkout?plan=1-tahun"
                      className="w-full py-2.5 px-4 rounded-lg bg-tertiary hover:bg-tertiary/90 text-[#050d25] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-[0_0_15px_rgba(78,222,163,0.3)]"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Perpanjang 1 Tahun</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Footer Check Again & CS Link */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-outline-variant/30">
                  <button
                    type="button"
                    onClick={handleRefreshSubscription}
                    disabled={refreshingSub}
                    className="text-on-surface-variant hover:text-primary flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshingSub ? "animate-spin text-primary" : ""}`} />
                    <span>{refreshingSub ? "Memeriksa status..." : "Sudah bayar? Cek ulang status"}</span>
                  </button>

                  <span className="text-outline">
                    Butuh bantuan? Hubungi WhatsApp Support kami
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Children Dashboard Content (dimmed / blurred when expired) */}
          <div className={isExpired ? "opacity-30 pointer-events-none select-none filter blur-[1px]" : ""}>
            {children}
          </div>
        </main>

        {/* FOOTER TELEMETRY STATUS */}

      </div>
    </div>
  );
}
