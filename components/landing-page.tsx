"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  EyeOff,
  Ghost,
  Layers,
  Lock,
  Menu,
  MessageSquare,
  MousePointerClick,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
  Play,
} from "lucide-react";

/* ───────────────────────────────────────────────
   Animated counter hook
   ─────────────────────────────────────────────── */
function useCountUp(end: number) {
  const [value] = useState(end);
  const ref = useRef<HTMLSpanElement>(null);
  return { value, ref };
}

/* ───────────────────────────────────────────────
   Floating particle background (deterministic to avoid hydration mismatch)
   ─────────────────────────────────────────────── */
const PARTICLES = [
  { w: 3.4, h: 5.2, l: 18.4, t: 20.0, c: 0, dur: 12.8, del: 2.9 },
  { w: 2.8, h: 5.3, l: 84.0, t: 17.4, c: 1, dur: 18.8, del: 3.2 },
  { w: 4.3, h: 3.1, l: 85.8, t: 55.6, c: 2, dur: 14.5, del: 2.4 },
  { w: 3.4, h: 3.4, l: 60.7, t: 60.4, c: 0, dur: 15.4, del: 4.9 },
  { w: 3.8, h: 2.2, l: 49.1, t: 38.1, c: 1, dur: 8.9, del: 2.8 },
  { w: 4.8, h: 5.3, l: 69.6, t: 8.3, c: 2, dur: 8.8, del: 1.4 },
  { w: 5.7, h: 4.0, l: 31.5, t: 91.3, c: 0, dur: 11.3, del: 2.9 },
  { w: 3.3, h: 6.0, l: 38.6, t: 81.4, c: 1, dur: 17.4, del: 5.2 },
  { w: 5.2, h: 3.4, l: 72.5, t: 79.3, c: 2, dur: 12.2, del: 4.4 },
  { w: 3.9, h: 2.3, l: 34.5, t: 14.1, c: 0, dur: 18.9, del: 0.3 },
  { w: 5.8, h: 3.0, l: 57.4, t: 41.8, c: 1, dur: 8.3, del: 1.6 },
  { w: 4.5, h: 4.5, l: 47.2, t: 77.8, c: 2, dur: 12.1, del: 1.0 },
  { w: 4.3, h: 2.4, l: 25.5, t: 72.0, c: 0, dur: 17.4, del: 5.5 },
  { w: 3.3, h: 4.3, l: 71.2, t: 24.6, c: 1, dur: 16.7, del: 1.2 },
  { w: 4.8, h: 3.7, l: 73.4, t: 56.6, c: 2, dur: 19.8, del: 5.9 },
  { w: 4.6, h: 5.7, l: 35.2, t: 92.9, c: 0, dur: 19.6, del: 2.3 },
  { w: 5.0, h: 4.6, l: 64.9, t: 97.1, c: 1, dur: 11.4, del: 5.2 },
  { w: 2.1, h: 4.8, l: 66.2, t: 72.1, c: 2, dur: 9.9, del: 3.5 },
  { w: 3.9, h: 4.3, l: 84.7, t: 77.0, c: 0, dur: 14.0, del: 2.6 },
  { w: 3.4, h: 3.9, l: 61.4, t: 72.7, c: 1, dur: 10.4, del: 4.4 },
  { w: 5.2, h: 2.8, l: 4.3, t: 21.0, c: 2, dur: 13.3, del: 1.0 },
  { w: 3.5, h: 3.6, l: 8.2, t: 82.9, c: 0, dur: 18.5, del: 5.3 },
  { w: 2.5, h: 5.7, l: 94.0, t: 85.9, c: 1, dur: 16.3, del: 2.1 },
  { w: 4.1, h: 3.0, l: 71.9, t: 1.9, c: 2, dur: 9.3, del: 0.6 },
  { w: 4.9, h: 4.7, l: 98.4, t: 99.7, c: 0, dur: 16.7, del: 0.3 },
  { w: 2.9, h: 3.8, l: 64.6, t: 9.7, c: 1, dur: 19.0, del: 3.9 },
  { w: 2.1, h: 3.4, l: 47.0, t: 30.8, c: 2, dur: 8.1, del: 5.6 },
  { w: 4.0, h: 2.0, l: 85.2, t: 43.7, c: 0, dur: 11.4, del: 4.5 },
] as const;

const PARTICLE_COLORS = [
  "rgba(76, 215, 246, 0.6)",
  "rgba(78, 222, 163, 0.5)",
  "rgba(180, 197, 255, 0.4)",
] as const;

function ParticleField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${p.w}px`,
            height: `${p.h}px`,
            left: `${p.l}%`,
            top: `${p.t}%`,
            background: PARTICLE_COLORS[p.c],
            willChange: "transform",
            animation: `float-particle ${p.dur}s ease-in-out infinite`,
            animationDelay: `${p.del}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────────
   Live webhook pulse animation
   ─────────────────────────────────────────────── */
function LivePulse() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );
}

/* ───────────────────────────────────────────────
   FAQ Accordion Item
   ─────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#1e2847] rounded-xl overflow-hidden transition-all hover:border-[#2d3a5c]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer group"
      >
        <span className="text-[#dbe1ff] font-medium text-sm sm:text-[15px] leading-relaxed pr-3 sm:pr-4 group-hover:text-white transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 sm:w-5 sm:h-5 text-[#4cd7f6] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""
            }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <p className="px-4 pb-4 sm:px-5 sm:pb-5 text-[#869397] text-xs sm:text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   MAIN LANDING PAGE COMPONENT
   ─────────────────────────────────────────────── */
export default function LandingPage() {
  const stat1 = useCountUp(99);
  const stat2 = useCountUp(73);
  const stat3 = useCountUp(40);

  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a122a] text-[#dbe1ff] overflow-x-hidden">
      {/* Skip to main content for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#4cd7f6] focus:text-[#050d25] focus:font-semibold focus:rounded-lg"
      >
        Lewati ke konten utama
      </a>

      {/* ───── STICKY NAV ───── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 40 || mobileMenuOpen
          ? "bg-[#0a122a]/95 backdrop-blur-xl border-b border-[#1e2847]/60 shadow-lg shadow-black/10"
          : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4cd7f6] to-[#06b6d4] flex items-center justify-center shadow-[0_0_20px_rgba(76,215,246,0.3)] group-hover:shadow-[0_0_28px_rgba(76,215,246,0.45)] transition-shadow">
              <Activity className="w-4.5 h-4.5 text-[#050d25]" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-base sm:text-lg tracking-tight text-white">
              Track<span className="text-[#4cd7f6]">Capi</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-[#869397]">
            <a href="#demo" className="hover:text-[#4cd7f6] transition-colors">
              Demo
            </a>
            <a href="#masalah" className="hover:text-[#4cd7f6] transition-colors">
              Masalah
            </a>
            <a href="#fitur" className="hover:text-[#4cd7f6] transition-colors">
              Fitur
            </a>
            <a href="#cara-kerja" className="hover:text-[#4cd7f6] transition-colors">
              Cara Kerja
            </a>
            <a href="#harga" className="hover:text-[#4cd7f6] transition-colors">
              Harga
            </a>
            <a href="#faq" className="hover:text-[#4cd7f6] transition-colors">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">

            <a
              href="#harga"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 rounded-lg bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] text-xs sm:text-sm font-semibold hover:shadow-[0_0_24px_rgba(76,215,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Pilih Paket</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#869397] hover:text-white hover:bg-[#1e2847]/60 transition-colors"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#4cd7f6]" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#1e2847] bg-[#0a122a]/98 backdrop-blur-2xl px-5 py-4 shadow-2xl animate-fade-in-up">
            <div className="flex flex-col gap-2.5 text-sm">
              <a
                href="#demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 text-[#4cd7f6] fill-current" />
                <span>Demo Video</span>
              </a>
              <a
                href="#masalah"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors"
              >
                Masalah Utama
              </a>
              <a
                href="#fitur"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors"
              >
                Fitur Solusi
              </a>
              <a
                href="#cara-kerja"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors"
              >
                Cara Kerja
              </a>
              <a
                href="#harga"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors font-medium flex items-center justify-between"
              >
                <span>Harga & Paket</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#4cd7f6]/10 text-[#4cd7f6] border border-[#4cd7f6]/20">
                  Mulai Rp 149k
                </span>
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg text-[#dbe1ff] hover:bg-[#1e2847]/50 hover:text-[#4cd7f6] transition-colors"
              >
                Pertanyaan Umum (FAQ)
              </a>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 px-3 py-2.5 rounded-lg bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 text-[#4cd7f6] font-semibold flex items-center justify-between transition-colors"
              >
                <span>Masuk ke Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Main Landmark for Accessibility */}
      <main id="main-content">
        {/* ───── HERO SECTION ───── */}
        <section className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 overflow-hidden">
          <ParticleField />
        {/* Radial gradient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] max-w-[800px] h-[360px] sm:h-[600px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(76,215,246,0.08) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)",
          }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Social proof badge */}
          {/* <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#1e2847] bg-[#0d1632]/80 backdrop-blur-sm text-[11px] sm:text-xs text-[#869397] mb-6 sm:mb-8 animate-fade-in-up">
            <LivePulse />
            <span>
              Dipercaya <span className="text-[#4cd7f6] font-semibold">200+</span> advertiser CTWA aktif di Indonesia
            </span>
          </div> */}

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.2] sm:leading-[1.15] tracking-tight mb-5 sm:mb-6 break-words">
            Chat WhatsApp dari Iklan Anda{" "}
            <span className="text-[#ffb4ab]">Tidak Terbaca di Meta?</span>
            <br className="hidden sm:block" />{" "}
            <span className="relative inline-block mt-1 sm:mt-0">
              <span className="relative z-10 bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Kirim Otomatis
              </span>
              <span className="absolute bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] rounded-full opacity-40" />
            </span>{" "}
            sebagai Konversi.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-[#869397] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            TrackCapi menangkap <strong className="text-[#dbe1ff]">ctwa_clid</strong> dan mengirim event{" "}
            <strong className="text-[#dbe1ff]">Lead sampai Purchase</strong> ke{" "}
            <strong className="text-[#dbe1ff]">Meta Conversions API</strong>, tanpa coding.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-10 sm:mb-14">
            <Link
              href="/checkout?plan=1-tahun"
              className="group inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-sm sm:text-base shadow-[0_0_30px_rgba(76,215,246,0.25)] hover:shadow-[0_0_40px_rgba(76,215,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5 shrink-0" />
              <span>Mulai Rp 20.750/bulan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl border border-[#4cd7f6]/40 bg-[#4cd7f6]/5 text-[#4cd7f6] hover:bg-[#4cd7f6]/15 hover:border-[#4cd7f6] transition-all text-sm sm:text-base font-medium shadow-[0_0_20px_rgba(76,215,246,0.1)]"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>Tonton Demo Video</span>
            </a>
            <a
              href="#cara-kerja"
              className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-xl border border-[#1e2847] text-[#869397] hover:text-white hover:border-[#2d3a5c] transition-all text-sm sm:text-base"
            >
              <span>Cara Kerja</span>
              <ChevronDown className="w-4 h-4 shrink-0" />
            </a>
          </div>

          {/* Hero metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
            <div className="p-4 sm:p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#4cd7f6]/30 transition-all group text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#4cd7f6] mb-1">
                <span ref={stat1.ref}>{stat1.value}</span>
                <span className="text-lg sm:text-xl">.4%</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Akurasi Deduplikasi Event
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#4edea3]/30 transition-all group text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#4edea3] mb-1">
                +<span ref={stat2.ref}>{stat2.value}</span>
                <span className="text-lg sm:text-xl">%</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Rata-rata Peningkatan Attributed Conversions
              </p>
            </div>
            <div className="p-4 sm:p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#b4c5ff]/30 transition-all group text-center sm:text-left">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-[#b4c5ff] mb-1">
                {"<"}<span ref={stat3.ref}>{stat3.value}</span>
                <span className="text-lg sm:text-xl">ms</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Latency Webhook → Meta Graph
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── DEMO VIDEO SECTION ───── */}
      <section id="demo" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6 overflow-hidden">
        {/* Ambient background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[900px] h-[450px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(76,215,246,0.12) 0%, rgba(78,222,163,0.05) 35%, transparent 70%)",
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 mb-3 sm:mb-4">
              <Play className="w-3.5 h-3.5 fill-current" />
              Demo Langsung
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight mb-4 sm:mb-5 leading-tight">
              Saksikan Bagaimana{" "}
              <span className="bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                TrackCapi Bekerja
              </span>
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Tonton demonstrasi lengkap bagaimana setiap pesan masuk dari iklan WhatsApp (CTWA)
              ditangkap otomatis dan diteruskan ke Meta Conversions API secara instan.
            </p>
          </div>

          {/* Video Player Card Frame */}
          <div className="relative rounded-2xl border border-[#1e2847] bg-[#0d1632]/80 backdrop-blur-xl p-2.5 sm:p-4 shadow-[0_0_50px_rgba(76,215,246,0.15)] hover:border-[#4cd7f6]/40 transition-all">
            {/* Browser/Window Header Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2847]/70 mb-2.5 sm:mb-3 text-xs text-[#869397]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]/80 inline-block" />
                <span className="ml-2 hidden sm:inline-block text-[11px] font-mono text-[#869397]">
                  TrackCapi • Live Demo System
                </span>
              </div>
              <div className="px-3 py-0.5 rounded-full bg-[#0a122a] border border-[#1e2847] text-[11px] font-mono text-[#4cd7f6] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
                <span>CTWA Live Tracking Demo</span>
              </div>
            </div>

            {/* Video Player Container */}
            <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-video shadow-inner">
              <video
                src="/asset/demo.mp4"
                controls
                playsInline
                preload="none"
                title="Demo Sistem TrackCapi WhatsApp CTWA"
                aria-label="Demo Sistem TrackCapi WhatsApp CTWA"
                className="w-full h-full object-contain"
              >
                <track
                  kind="captions"
                  src="/asset/captions-id.vtt"
                  srcLang="id"
                  label="Bahasa Indonesia"
                  default
                />
                Browser Anda tidak mendukung tag video. Silakan tonton langsung melalui file demo.
              </video>
            </div>

            {/* Highlights Below Video */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 sm:pt-5 border-t border-[#1e2847]/60 mt-3 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0a122a]/50 border border-[#1e2847]/40">
                <div className="w-7 h-7 rounded-lg bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6] shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Tangkapan Otomatis</h3>
                  <p className="text-[#869397] text-[11px] mt-0.5 leading-snug">Click ID (ctwa_clid) diekstrak tanpa jeda dari pesan pertama.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0a122a]/50 border border-[#1e2847]/40">
                <div className="w-7 h-7 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3] shrink-0 mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Pipeline 5 Event</h3>
                  <p className="text-[#869397] text-[11px] mt-0.5 leading-snug">Kirim status Lead, ViewContent hingga Closed Purchase.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0a122a]/50 border border-[#1e2847]/40">
                <div className="w-7 h-7 rounded-lg bg-[#b4c5ff]/10 border border-[#b4c5ff]/30 flex items-center justify-center text-[#b4c5ff] shrink-0 mt-0.5">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Live Delivery Feed</h3>
                  <p className="text-[#869397] text-[11px] mt-0.5 leading-snug">Pantau status event terkirim ke Meta secara real-time.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── PROBLEM SECTION ───── */}
      <section id="masalah" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#ffb4ab] mb-3 sm:mb-4">
              <Ghost className="w-4 h-4" />
              Masalah Utama
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">
              Kenapa Konversi CTWA Anda{" "}
              <span className="text-[#ffb4ab]">Menghilang</span> di Meta Ads?
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              Anda bukan satu-satunya. Ini adalah masalah{" "}
              <strong className="text-[#dbe1ff]">struktural</strong> yang dialami hampir semua
              advertiser CTWA — dan Meta tidak memberikan solusi out-of-the-box.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Problem Card 1 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                Chat WhatsApp Masuk, Tapi Meta Bilang 0 Konversi
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Iklan CTWA Anda generate ratusan chat per hari. Tapi di Ads Manager? Kolom
                &quot;Results&quot; kosong. Pixel browser{" "}
                <strong className="text-[#bcc9cd]">tidak bisa tracking percakapan WhatsApp</strong>{" "}
                — karena chat terjadi di luar website Anda.
              </p>
            </div>

            {/* Problem Card 2 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                Algoritma Meta Buta → CPA Meledak, ROAS Anjlok
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Tanpa data konversi, algoritma Meta tidak tahu iklan mana yang berhasil.
                Akibatnya?{" "}
                <strong className="text-[#bcc9cd]">
                  Budget iklan dihabiskan ke audience yang salah
                </strong>
                , CPA naik 2–3x lipat, dan optimasi ad set Anda menjadi gambling.
              </p>
            </div>

            {/* Problem Card 3 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <Ghost className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                iOS 14.5+ & Browser Blocking Bunuh Tracking Anda
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                40–60% user iOS opt-out dari tracking. Ad blocker makin agresif.{" "}
                <strong className="text-[#bcc9cd]">
                  Pixel browser Anda kehilangan setengah data
                </strong>{" "}
                bahkan sebelum user klik iklan CTWA. Reporting Anda bohong — dan Anda tidak tahu.
              </p>
            </div>

            {/* Problem Card 4 */}
            <div className="group relative p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                Scaling Iklan CTWA Terasa Seperti Menembak Dalam Gelap
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Mau scale budget? Tapi tidak ada data konversi yang reliable.{" "}
                <strong className="text-[#bcc9cd]">
                  Anda tidak tahu iklan mana yang hasilkan closing, mana yang buang duit
                </strong>
                . Keputusan scaling Anda berdasarkan feeling, bukan data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── SOLUTION BRIDGE ───── */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-gradient-to-r from-[#0d1632] via-[#111d3d] to-[#0d1632]">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-[#4cd7f6]/20 to-[#4edea3]/20 border border-[#4cd7f6]/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#4cd7f6]" />
            </div>
            <div>
              <p className="text-white font-semibold text-base sm:text-lg">
                Bagaimana jika setiap chat WhatsApp dari iklan CTWA…
              </p>
              <p className="text-[#4edea3] text-xs sm:text-sm font-medium mt-0.5">
                otomatis tercatat sebagai konversi di Meta Ads Manager Anda?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FEATURES / SOLUTION ───── */}
      <section id="fitur" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] mb-3 sm:mb-4">
              <Zap className="w-4 h-4" />
              Solusi & Manfaat
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">
              Iklan Bukan Cuma Bawa Chat,{" "}
              <span className="bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] bg-clip-text text-transparent">
                Tapi Bawa Pembeli
              </span>
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
              Meta jadi tahu chat mana yang closing, sehingga iklan dioptimasi ke calon pembeli, bukan sekadar yang chat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Feature 1 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4cd7f6]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:shadow-[0_0_16px_rgba(76,215,246,0.2)] transition-shadow">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Server-Side Tracking 100% Akurat
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Event dikirim langsung dari server ke Meta tanpa lewat browser. Bebas hambatan ad blocker atau batasan iOS, memastikan semua data konversi tersampaikan tanpa hilang.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4edea3]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3] mb-4 group-hover:shadow-[0_0_16px_rgba(78,222,163,0.2)] transition-shadow">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Otomatis Hubungkan Chat ke Iklan
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Setiap kali calon pelanggan klik iklan CTWA dan memulai WhatsApp, sistem otomatis menangkap ID klik (ctwa_clid) tanpa perlu Anda pusing setup manual.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#b4c5ff]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#b4c5ff]/10 border border-[#b4c5ff]/20 flex items-center justify-center text-[#b4c5ff] mb-4 group-hover:shadow-[0_0_16px_rgba(180,197,255,0.2)] transition-shadow">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Lacak Funnel Lengkap hingga Closing
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Kirim status konversi dari Chat Masuk (Lead), Tanya Harga / Keranjang (AddToCart), Checkout, hingga Closing (Purchase) agar Meta paham funnel penjualan Anda.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4cd7f6]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:shadow-[0_0_16px_rgba(76,215,246,0.2)] transition-shadow">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Optimasi ke Calon Pembeli Riil
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                <strong className="text-[#bcc9cd]">Meta jadi tahu chat mana yang closing, sehingga iklan dioptimasi ke calon pembeli, bukan sekadar yang chat.</strong> Bebas dari audiens yang cuma PHP atau buang budget iklan.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4edea3]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3] mb-4 group-hover:shadow-[0_0_16px_rgba(78,222,163,0.2)] transition-shadow">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Tahu Pasti Iklan Mana yang Closing
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Ketahui dengan akurat campaign, adset, dan materi iklan mana yang menghasilkan penjualan nyata. Matikan iklan yang boncos, perbesar budget pada iklan yang terbukti closing.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-5 sm:p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#b4c5ff]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#b4c5ff]/10 border border-[#b4c5ff]/20 flex items-center justify-center text-[#b4c5ff] mb-4 group-hover:shadow-[0_0_16px_rgba(180,197,255,0.2)] transition-shadow">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Hemat Budget & ROAS Lebih Tinggi
              </h3>
              <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                Algoritma Meta otomatis mempelajari data pelanggan yang benar-benar melakukan transaksi closing, lalu mencari audiens berkualitas serupa agar biaya akuisisi semakin murah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="cara-kerja" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4edea3] mb-3 sm:mb-4">
              <Radio className="w-4 h-4" />
              Cara Kerja
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-4 sm:mb-5">
              Setup 10 Menit.{" "}
              <span className="bg-gradient-to-r from-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Konversi Langsung Tercatat.
              </span>
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line (desktop only) */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#4cd7f6]/40 via-[#4edea3]/40 to-[#b4c5ff]/40 hidden md:block" />

            {/* Step 1 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="w-full md:w-1/2 md:text-right md:pr-12 p-5 rounded-xl border border-[#1e2847]/60 bg-[#0d1632]/40 md:border-0 md:bg-transparent md:p-0">
                <div className="inline-flex items-center gap-2 text-xs text-[#4cd7f6] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center font-mono text-sm">
                    1
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                  Hubungkan WhatsApp Business
                </h3>
                <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                  Login ke Trackcapi → klik &quot;Connect WhatsApp&quot; → otorisasi via OAuth. Selesai
                  dalam 2 menit, zero coding.
                </p>
              </div>
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4cd7f6] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(76,215,246,0.4)]" />
              <div className="hidden md:block md:w-1/2 md:pl-12" />
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="hidden md:block md:w-1/2 md:pr-12" />
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4edea3] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(78,222,163,0.4)]" />
              <div className="w-full md:w-1/2 md:pl-12 p-5 rounded-xl border border-[#1e2847]/60 bg-[#0d1632]/40 md:border-0 md:bg-transparent md:p-0">
                <div className="inline-flex items-center gap-2 text-xs text-[#4edea3] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center font-mono text-sm">
                    2
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                  Webhook Otomatis Aktif
                </h3>
                <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                  Setiap pesan masuk dari iklan CTWA, webhook menangkap{" "}
                  <code className="text-[#4edea3] bg-[#4edea3]/10 px-1 py-0.5 rounded text-xs">
                    ctwa_clid
                  </code>
                  , nomor telepon, dan metadata percakapan secara otomatis.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 mb-8 sm:mb-12">
              <div className="w-full md:w-1/2 md:text-right md:pr-12 p-5 rounded-xl border border-[#1e2847]/60 bg-[#0d1632]/40 md:border-0 md:bg-transparent md:p-0">
                <div className="inline-flex items-center gap-2 text-xs text-[#b4c5ff] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#b4c5ff]/10 border border-[#b4c5ff]/30 flex items-center justify-center font-mono text-sm">
                    3
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                  Event Terkirim ke Meta CAPI
                </h3>
                <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                  Trackcapi langsung mengirim event konversi (Lead, Purchase, dll) ke Meta
                  Conversions API dengan data ter-enriched. Deduplikasi otomatis mencegah double
                  counting.
                </p>
              </div>
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#b4c5ff] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(180,197,255,0.4)]" />
              <div className="hidden md:block md:w-1/2 md:pl-12" />
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6">
              <div className="hidden md:block md:w-1/2 md:pr-12" />
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4cd7f6] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(76,215,246,0.4)]" />
              <div className="w-full md:w-1/2 md:pl-12 p-5 rounded-xl border border-[#1e2847]/60 bg-[#0d1632]/40 md:border-0 md:bg-transparent md:p-0">
                <div className="inline-flex items-center gap-2 text-xs text-[#4cd7f6] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center font-mono text-sm">
                    4
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-base sm:text-lg mb-2">
                  Konversi Muncul di Ads Manager 🎯
                </h3>
                <p className="text-[#869397] text-xs sm:text-sm leading-relaxed">
                  Sekarang Meta tahu iklan mana yang hasilkan konversi. Algoritma mengoptimasi ke
                  audience terbaik. CPA turun, ROAS naik —{" "}
                  <strong className="text-[#bcc9cd]">scaling jadi berdasarkan data</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── BEFORE / AFTER COMPARISON ───── */}
      <section className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6 bg-[#060e22]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-5">
              Sebelum vs Sesudah{" "}
              <span className="text-[#4cd7f6]">Trackcapi</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Before */}
            <div className="p-5 sm:p-6 rounded-2xl border border-[#ffb4ab]/20 bg-[#0d1632]/40 space-y-4">
              <div className="flex items-center gap-2 text-[#ffb4ab] font-semibold text-xs sm:text-sm uppercase tracking-wider">
                <EyeOff className="w-4 h-4" />
                Tanpa Trackcapi
              </div>
              <ul className="space-y-2.5 sm:space-y-3">
                {[
                  "0 konversi tercatat di Meta Ads Manager",
                  "CPA tinggi, ROAS rendah — tidak bisa scale",
                  "40–60% data hilang karena iOS & ad blocker",
                  "Algoritma Meta tidak belajar — budget habis sia-sia",
                  "Tidak tahu iklan mana yang hasilkan closing",
                  "Reporting manual pakai spreadsheet",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#869397]">
                    <span className="w-5 h-5 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="p-5 sm:p-6 rounded-2xl border border-[#4edea3]/20 bg-[#0d1632]/40 space-y-4">
              <div className="flex items-center gap-2 text-[#4edea3] font-semibold text-xs sm:text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Dengan Trackcapi
              </div>
              <ul className="space-y-2.5 sm:space-y-3">
                {[
                  "Setiap chat CTWA = 1 konversi ter-record di Meta",
                  "CPA turun 30–50% berkat optimasi algoritma",
                  "100% data sampai — server-side, bypass semua blocker",
                  "Meta belajar dari data real → audience makin akurat",
                  "Dashboard real-time: tahu persis ROI per iklan per jam",
                  "Semua otomatis — zero manual work",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#dbe1ff]">
                    <span className="w-5 h-5 rounded-full bg-[#4edea3]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#4edea3]" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───── LIVE DEMO / SOCIAL PROOF TICKER ───── */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 border-y border-[#1e2847]/60 overflow-hidden">
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-center justify-center gap-3 text-xs sm:text-sm text-[#869397] mb-6 sm:mb-8 text-center">
            <LivePulse />
            <span>
              Event tracking aktif — data dikirim ke Meta sekarang
            </span>
          </div>

          {/* Scrolling ticker with edge fade masks */}
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-[#0a122a] to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-[#0a122a] to-transparent z-10" />
            <div className="flex gap-3 sm:gap-4 animate-ticker">
              {[
                { event: "Lead", phone: "+62 812-****-4821", status: "200 OK", time: "2s ago", color: "#4edea3" },
                { event: "Purchase", phone: "+62 857-****-9012", status: "200 OK", time: "5s ago", color: "#4cd7f6" },
                { event: "LeadSubmitted", phone: "+62 896-****-1080", status: "200 OK", time: "8s ago", color: "#4edea3" },
                { event: "AddToCart", phone: "+62 813-****-5567", status: "200 OK", time: "12s ago", color: "#b4c5ff" },
                { event: "Purchase", phone: "+62 878-****-3344", status: "200 OK", time: "15s ago", color: "#4cd7f6" },
                { event: "Lead", phone: "+62 821-****-7788", status: "200 OK", time: "18s ago", color: "#4edea3" },
                { event: "LeadSubmitted", phone: "+62 858-****-2200", status: "200 OK", time: "22s ago", color: "#4edea3" },
                { event: "Purchase", phone: "+62 811-****-6655", status: "200 OK", time: "25s ago", color: "#4cd7f6" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="shrink-0 flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg border border-[#1e2847] bg-[#0d1632]/60 font-mono text-[11px] sm:text-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#dbe1ff] font-medium">{item.event}</span>
                  <span className="text-[#869397]">{item.phone}</span>
                  <span className="text-[#4edea3]">{item.status}</span>
                  <span className="text-[#94a3b8]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── PRICING SECTION ───── */}
      <section id="harga" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] mb-3 sm:mb-4">
              <CreditCard className="w-4 h-4" />
              Struktur Harga & Paket
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 sm:mb-5">
              Investasi Terjangkau,{" "}
              <span className="bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Hasil Maksimal
              </span>
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-xs sm:text-base leading-relaxed">
              Tanpa biaya tersembunyi, tanpa komisi per konversi. Pilih paket yang sesuai kebutuhan
              skala iklan CTWA Anda dan mulai lacak setiap konversi secara akurat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto items-stretch">
            {/* 6 BULAN PLAN */}
            <div className="relative rounded-2xl border border-[#1e2847] bg-[#0d1632]/70 backdrop-blur-md p-6 sm:p-8 md:p-9 flex flex-col justify-between hover:border-[#4cd7f6]/40 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#869397] px-2.5 sm:px-3 py-1 rounded-full bg-[#1e2847]/60 border border-[#1e2847]">
                    Pilihan Fleksibel
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#4cd7f6] px-2.5 py-0.5 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/20">
                    Durasi 6 Bulan
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Paket 6 Bulan</h3>
                <p className="text-xs sm:text-sm text-[#869397] mb-6 leading-relaxed">
                  Akses penuh ke seluruh fitur Trackcapi selama 6 bulan untuk optimasi iklan CTWA Anda.
                </p>

                <div className="mb-6 pb-6 border-b border-[#1e2847]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm text-[#869397]">Rp</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                      149.000
                    </span>
                    <span className="text-xs text-[#869397]">/ 6 bulan</span>
                  </div>
                  <p className="text-xs text-[#4edea3] mt-2 flex items-center gap-1.5 font-medium flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Setara Rp 24.833 / bulan</span>
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-[#090f23]/60 border border-[#1e2847] mb-6 sm:mb-8 space-y-2 text-xs text-[#bcc9cd]">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4cd7f6] shrink-0" />
                    Termasuk Semua Fitur Tanpa Batas:
                  </p>
                  <p className="text-[#869397] leading-relaxed text-xs">
                    Mendapatkan akses lengkap 100% ke seluruh sistem tracking CAPI, telemetry, dan update selama masa aktif 6 bulan.
                  </p>
                </div>
              </div>

              <div>
                <Link
                  href="/checkout?plan=6-bulan"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl border border-[#4cd7f6]/50 bg-[#4cd7f6]/10 text-[#4cd7f6] font-semibold text-sm sm:text-base hover:bg-[#4cd7f6] hover:text-[#050d25] transition-all duration-200 group-hover:shadow-[0_0_25px_rgba(76,215,246,0.3)]"
                >
                  <span>Beli Paket 6 Bulan</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <p className="text-[11px] text-center text-[#94a3b8] mt-3 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" />
                  Pembayaran instan otomatis
                </p>
                <p className="text-[11px] text-center text-[#4edea3] mt-1.5 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Garansi Uang Kembali 7 Hari
                </p>
              </div>
            </div>

            {/* 1 TAHUN PLAN (RECOMMENDED) */}
            <div className="relative rounded-2xl border-2 border-[#4cd7f6] bg-gradient-to-b from-[#0f1c42] to-[#0a142f] p-6 sm:p-8 md:p-9 flex flex-col justify-between shadow-[0_0_40px_rgba(76,215,246,0.18)] hover:shadow-[0_0_60px_rgba(76,215,246,0.3)] transition-all mt-4 md:mt-0">
              {/* Highlight Badge */}
              <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] text-[#050d25] text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-lg whitespace-nowrap">
                🔥 Rekomendasi • Paling Hemat
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#4cd7f6] px-2.5 sm:px-3 py-1 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30">
                    Durasi 1 Tahun
                  </span>
                  <span className="text-[11px] sm:text-xs font-semibold text-[#4edea3] bg-[#4edea3]/10 px-2.5 py-0.5 rounded-full border border-[#4edea3]/20">
                    Hemat Rp 49.000
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Paket 1 Tahun</h3>
                <p className="text-xs sm:text-sm text-[#bcc9cd] mb-6 leading-relaxed">
                  Akses penuh ke seluruh fitur Trackcapi selama 12 bulan penuh dengan harga paling hemat.
                </p>

                <div className="mb-6 pb-6 border-b border-[#1e2847]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs sm:text-sm text-[#869397]">Rp</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                      249.000
                    </span>
                    <span className="text-xs text-[#869397]">/ 1 tahun</span>
                  </div>
                  <p className="text-xs text-[#4edea3] mt-2 flex items-center gap-1.5 font-medium flex-wrap">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Setara hanya Rp 20.750 / bulan (Diskon Terbesar!)</span>
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 rounded-xl bg-[#090f23]/60 border border-[#4edea3]/30 mb-6 sm:mb-8 space-y-2 text-xs text-[#bcc9cd]">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4edea3] shrink-0" />
                    Termasuk Semua Fitur Tanpa Batas:
                  </p>
                  <p className="text-[#869397] leading-relaxed text-xs">
                    Mendapatkan akses lengkap 100% ke seluruh sistem tracking CAPI, telemetry, dan update selama masa aktif 12 bulan penuh.
                  </p>
                </div>
              </div>

              <div>
                <Link
                  href="/checkout?plan=1-tahun"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-[#4cd7f6] via-[#06b6d4] to-[#4edea3] text-[#050d25] font-bold text-sm sm:text-base hover:shadow-[0_0_35px_rgba(76,215,246,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap className="w-4 h-4 shrink-0" />
                  <span>Beli Paket 1 Tahun</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
                <p className="text-[11px] text-center text-[#4edea3] mt-3 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  Aktivasi instan • Garansi Uang Kembali 7 Hari
                </p>
              </div>
            </div>
          </div>

          {/* 7-DAY MONEY BACK GUARANTEE BANNER */}
          <div className="mt-8 sm:mt-10 max-w-3xl mx-auto p-4 sm:p-6 rounded-2xl border border-[#4edea3]/30 bg-gradient-to-r from-[#0d1632]/90 via-[#0a1a36]/90 to-[#0d1632]/90 backdrop-blur-md shadow-[0_0_35px_rgba(78,222,163,0.12)] flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center text-[#4edea3] shrink-0 shadow-[0_0_20px_rgba(78,222,163,0.25)]">
              <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h3 className="text-white font-bold text-base sm:text-lg">
                  Garansi Uang Kembali 7 Hari
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#4edea3]/15 text-[#4edea3] border border-[#4edea3]/30">
                  100% Risk-Free
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#869397] leading-relaxed">
                Coba Trackcapi selama 7 hari penuh. Jika sistem tracking kami tidak berhasil mengirimkan event konversi WhatsApp ke Meta Ads Manager Anda atau Anda tidak puas dengan performanya, kami akan kembalikan uang Anda 100% tanpa potongan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FAQ SECTION ───── */}
      <section id="faq" className="relative py-16 sm:py-20 md:py-28 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3 sm:mb-4">
              Pertanyaan yang Sering Ditanyakan
            </h2>
            <p className="text-[#869397] text-xs sm:text-sm">
              Jawaban untuk pertanyaan umum seputar Trackcapi dan CTWA tracking.
            </p>
          </div>

          <div className="space-y-3">
            <FaqItem
              q="Apakah saya perlu coding atau technical skill?"
              a="Tidak sama sekali. Trackcapi didesain untuk advertiser, bukan developer. Setup dilakukan via dashboard visual — hubungkan WhatsApp, konfigurasi event, dan tracking langsung aktif. Zero coding."
            />
            <FaqItem
              q="Bagaimana Trackcapi menangkap konversi dari chat WhatsApp?"
              a="Ketika user klik iklan CTWA Anda dan memulai chat, Meta menyertakan 'ctwa_clid' (Click ID). Trackcapi menangkap ID ini via webhook, lalu mengirim event konversi ke Meta Conversions API secara server-side — sehingga Meta tahu persis konversi mana yang berasal dari iklan mana."
            />
            <FaqItem
              q="Apakah ini aman? Data pelanggan saya tidak bocor?"
              a="100% aman. Data dikirim terenkripsi SHA-256 ke Meta sesuai standar Conversions API. Kami tidak menyimpan data sensitif pelanggan — hanya hash yang diperlukan untuk matching. Semua sesuai kebijakan privasi Meta."
            />
            <FaqItem
              q="Apa bedanya dengan Meta Pixel biasa?"
              a="Meta Pixel bekerja di browser, rentan terhadap ad blocker, cookie restriction, dan iOS privacy update — kehilangan 40-60% data. Trackcapi mengirim data dari server ke server (server-side), sehingga 100% data sampai ke Meta tanpa loss."
            />
            <FaqItem
              q="Berapa banyak event yang bisa saya kirim per lead?"
              a="Hingga 5 event per lead: misalnya LeadSubmitted (chat masuk), AddToCart, InitiateCheckout, Purchase (closing). Semakin banyak data funnel, semakin cerdas algoritma Meta mengoptimasi iklan Anda."
            />

          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="relative py-16 sm:py-24 md:py-32 px-4 sm:px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center bottom, rgba(76,215,246,0.06) 0%, rgba(78,222,163,0.03) 30%, transparent 65%)",
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-[#4edea3]/30 bg-[#4edea3]/5 text-xs text-[#4edea3] font-medium mb-6 sm:mb-8">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Setup Cuma 10 Menit
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5 sm:mb-6 leading-tight break-words">
            Stop Bakar Budget Iklan{" "}
            <span className="bg-gradient-to-r from-[#ffb4ab] to-[#ff8a80] bg-clip-text text-transparent">
              Tanpa Data
            </span>
            .<br />
            <span className="bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] bg-clip-text text-transparent">
              Mulai Track Setiap Konversi
            </span>{" "}
            Sekarang.
          </h2>

          <p className="text-[#869397] text-sm sm:text-base md:text-lg mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed">
            Join 200+ advertiser CTWA yang sudah melihat data konversi mereka muncul kembali di
            Meta Ads Manager.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#harga"
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-sm sm:text-base shadow-[0_0_36px_rgba(76,215,246,0.3)] hover:shadow-[0_0_50px_rgba(76,215,246,0.45)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5 shrink-0" />
              <span>Pilih Paket Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </a>
          </div>

          <p className="text-[11px] sm:text-xs text-[#94a3b8] mt-6">
            Aktivasi Instan Otomatis • Pembayaran Resmi • Setup 10 Menit
          </p>
        </div>
      </section>
      </main>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-[#1e2847]/60 py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4cd7f6] to-[#06b6d4] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#050d25]" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-[#869397]">
              Track<span className="text-[#4cd7f6]">Capi</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#94a3b8]">
            <span>© 2026 Trackcapi. All rights reserved.</span>
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>

      {/* ───── FLOATING WHATSAPP BUTTON (FIXED BOTTOM-RIGHT) ───── */}
      <aside aria-label="WhatsApp Support" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 group">
        {/* Help Tooltip */}
        <div className="hidden sm:flex items-center px-3.5 py-1.5 rounded-full bg-[#0a142f]/95 border border-[#25D366]/40 text-[#4edea3] text-xs font-semibold shadow-2xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none translate-x-2 group-hover:translate-x-0">
          <span>Chat WhatsApp Kami</span>
        </div>

        <a
          href="https://wa.me/6289622981080?text=Halo%20Admin%20TrackCapi,%20saya%20tertarik%20dengan%20tools%20Trackingcapi%20Meta%20CTWA.%20Bisa%20bantu%20jelaskan?"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp dengan Tim TrackCapi"
          className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#128C7E] via-[#25D366] to-[#4edea3] text-white shadow-[0_0_25px_rgba(37,211,102,0.45)] hover:shadow-[0_0_35px_rgba(37,211,102,0.65)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        >
          {/* Animated ping ring */}
          <span className="absolute -inset-1 rounded-full bg-[#25D366]/40 animate-ping pointer-events-none" />

          {/* Official WhatsApp SVG Icon */}
          <svg
            className="w-6 h-6 sm:w-7 sm:h-7 fill-current relative z-10"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      </aside>

      {/* ───── GLOBAL ANIMATIONS ───── */}
      <style jsx global>{`
        @keyframes float-particle {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-8px);
          }
          75% {
            transform: translateY(-25px) translateX(5px);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-ticker {
          animation: ticker 30s linear infinite;
        }

        .animate-ticker:hover {
          animation-play-state: paused;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
