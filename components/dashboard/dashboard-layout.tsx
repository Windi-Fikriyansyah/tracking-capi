"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Network,
  PlusCircle,
  LayoutDashboard,
  MessageSquare,
  Settings,
  BookOpen,
  Circle,
  Search,
  Bell,
  SlidersHorizontal,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("SP");

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

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
      badge: null,
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
        className={`h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/30 bg-surface-container-lowest z-50 flex flex-col justify-between p-4 transition-transform duration-200 md:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          {/* Organization / Header Workspace */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary glow-cyan">
                <Network className="w-[18px] h-[18px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold text-primary">
                  CAPI Telemetry
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
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-secondary-container hover:bg-secondary-container/90 text-on-background py-2 px-3 rounded-lg font-label-md text-label-md transition-all duration-150 active:scale-[0.99] border border-outline-variant/30 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Pipeline</span>
          </button>

          {/* Primary Nav Tabs */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                    item.active
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

        {/* Footer Utility Links & Sign Out */}
        <div className="border-t border-outline-variant/30 pt-3 space-y-1">
          <Link
            href="#docs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150"
          >
            <BookOpen className="w-[18px] h-[18px]" />
            <span className="font-label-md text-label-md">Docs</span>
          </Link>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors duration-150 cursor-pointer">
            <div className="flex items-center gap-3">
              <Circle className="w-3.5 h-3.5 text-tertiary fill-tertiary" />
              <span className="font-label-md text-label-md">System Status</span>
            </div>
            <span className="font-code-metric text-[10px] text-outline">100% UP</span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-error/80 hover:text-error hover:bg-error-container/20 transition-colors duration-150 cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-[18px] h-[18px]" />
              <span className="font-label-md text-label-md">Keluar Portal</span>
            </div>
          </button>

          <div className="px-3 pt-2 text-[10px] text-outline font-code-metric flex items-center justify-between">
            <span>v2.8.4-edge-capi</span>
            <span className="text-tertiary">Active</span>
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

            {/* Global Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input
                className="bg-surface-container-low border border-outline-variant/40 rounded pl-8 pr-3 py-1 font-code-metric text-xs text-on-surface placeholder:text-outline/70 focus:outline-none focus:border-primary w-52 sm:w-72 md:w-80"
                placeholder="Search event_id, fbp, email hash..."
                type="text"
              />
            </div>
          </div>

          {/* Right side: Action Icons & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Trailing Icon Actions */}
            <div className="flex items-center gap-1">
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                title="Notifications"
                type="button"
              >
                <Bell className="w-[18px] h-[18px]" />
              </button>
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                title="Pipeline Tuning"
                type="button"
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" />
              </button>
              <button
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded transition-colors cursor-pointer"
                title="Support & Guides"
                type="button"
              >
                <HelpCircle className="w-[18px] h-[18px]" />
              </button>
            </div>

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

        {/* PAGE CONTENT CONTAINER */}
        <main className="p-4 md:p-6 space-y-6 flex-1">{children}</main>

        {/* FOOTER TELEMETRY STATUS */}
        <footer className="px-6 py-3 bg-surface-container-lowest border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-code-metric text-outline">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary" />
            <span>SignalPulse CAPI Node #us-east-worker-04</span>
            <span>•</span>
            <span>Telemetry Frequency: 1.0 Hz</span>
          </div>
          <div>
            <span>Meta Ads Conversions API Engine • Protected under SOC-2 Type II Compliance</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
