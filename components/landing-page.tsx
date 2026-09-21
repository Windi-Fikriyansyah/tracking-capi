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
  MessageSquare,
  MousePointerClick,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ───────────────────────────────────────────────
   Animated counter hook
   ─────────────────────────────────────────────── */
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!startOnView) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, startOnView]);

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
    <span className="relative flex h-2.5 w-2.5">
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
        className="w-full flex items-center justify-between p-5 text-left cursor-pointer group"
      >
        <span className="text-[#dbe1ff] font-medium text-[15px] leading-relaxed pr-4 group-hover:text-white transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-[#4cd7f6] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""
            }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <p className="px-5 pb-5 text-[#869397] text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────
   MAIN LANDING PAGE COMPONENT
   ─────────────────────────────────────────────── */
export default function LandingPage() {
  const stat1 = useCountUp(99, 1800);
  const stat2 = useCountUp(73, 2200);
  const stat3 = useCountUp(40, 2000);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a122a] text-[#dbe1ff] overflow-x-hidden">
      {/* ───── STICKY NAV ───── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 40
          ? "bg-[#0a122a]/90 backdrop-blur-xl border-b border-[#1e2847]/60 shadow-lg shadow-black/10"
          : "bg-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4cd7f6] to-[#06b6d4] flex items-center justify-center shadow-[0_0_20px_rgba(76,215,246,0.3)] group-hover:shadow-[0_0_28px_rgba(76,215,246,0.45)] transition-shadow">
              <Activity className="w-4.5 h-4.5 text-[#050d25]" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              Signal<span className="text-[#4cd7f6]">Pulse</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-[#869397]">
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

          <div className="flex items-center gap-3">
            <a
              href="#harga"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] text-sm font-semibold hover:shadow-[0_0_24px_rgba(76,215,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Pilih Paket</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* ───── HERO SECTION ───── */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-6">
        <ParticleField />
        {/* Radial gradient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(76,215,246,0.08) 0%, rgba(6,182,212,0.03) 40%, transparent 70%)",
          }}
        />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Social proof badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1e2847] bg-[#0d1632]/80 backdrop-blur-sm text-xs text-[#869397] mb-8 animate-fade-in-up">
            <LivePulse />
            <span>
              Dipercaya <span className="text-[#4cd7f6] font-semibold">200+</span> advertiser CTWA
              aktif di Indonesia
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] tracking-tight mb-6 animate-fade-in-up [animation-delay:100ms]">
            Iklan CTWA Anda{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Menghasilkan Leads
              </span>
              <span className="absolute bottom-1 left-0 right-0 h-[3px] bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] rounded-full opacity-40" />
            </span>
            ,<br className="hidden sm:block" /> Tapi Meta Bilang{" "}
            <span className="text-[#ffb4ab]">0 Konversi</span>?
          </h1>

          <p className="text-lg md:text-xl text-[#869397] max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up [animation-delay:200ms]">
            SignalPulse menghubungkan <strong className="text-[#dbe1ff]">setiap chat WhatsApp</strong>{" "}
            dari iklan CTWA langsung ke{" "}
            <strong className="text-[#dbe1ff]">Meta Conversions API</strong> — secara real-time,
            server-side, tanpa kehilangan data satu pun.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-in-up [animation-delay:300ms]">
            <a
              href="#harga"
              className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-base shadow-[0_0_30px_rgba(76,215,246,0.25)] hover:shadow-[0_0_40px_rgba(76,215,246,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5" />
              <span>Lihat Paket Berlangganan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#cara-kerja"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#1e2847] text-[#869397] hover:text-white hover:border-[#2d3a5c] transition-all text-base"
            >
              <span>Lihat Cara Kerjanya</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          {/* Hero metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto animate-fade-in-up [animation-delay:450ms]">
            <div className="p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#4cd7f6]/30 transition-all group">
              <div className="text-3xl font-bold font-mono text-[#4cd7f6] mb-1">
                <span ref={stat1.ref}>{stat1.value}</span>
                <span className="text-xl">.4%</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Akurasi Deduplikasi Event
              </p>
            </div>
            <div className="p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#4edea3]/30 transition-all group">
              <div className="text-3xl font-bold font-mono text-[#4edea3] mb-1">
                +<span ref={stat2.ref}>{stat2.value}</span>
                <span className="text-xl">%</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Rata-rata Peningkatan Attributed Conversions
              </p>
            </div>
            <div className="p-5 rounded-xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm hover:border-[#b4c5ff]/30 transition-all group">
              <div className="text-3xl font-bold font-mono text-[#b4c5ff] mb-1">
                {"<"}<span ref={stat3.ref}>{stat3.value}</span>
                <span className="text-xl">ms</span>
              </div>
              <p className="text-xs text-[#869397] group-hover:text-[#bcc9cd] transition-colors">
                Latency Webhook → Meta Graph
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── PROBLEM SECTION ───── */}
      <section id="masalah" className="relative py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#ffb4ab] mb-4">
              <Ghost className="w-4 h-4" />
              Masalah Utama
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Kenapa Konversi CTWA Anda{" "}
              <span className="text-[#ffb4ab]">Menghilang</span> di Meta Ads?
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-base leading-relaxed">
              Anda bukan satu-satunya. Ini adalah masalah{" "}
              <strong className="text-[#dbe1ff]">struktural</strong> yang dialami hampir semua
              advertiser CTWA — dan Meta tidak memberikan solusi out-of-the-box.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Problem Card 1 */}
            <div className="group relative p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <EyeOff className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Chat WhatsApp Masuk, Tapi Meta Bilang 0 Konversi
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Iklan CTWA Anda generate ratusan chat per hari. Tapi di Ads Manager? Kolom
                &quot;Results&quot; kosong. Pixel browser{" "}
                <strong className="text-[#bcc9cd]">tidak bisa tracking percakapan WhatsApp</strong>{" "}
                — karena chat terjadi di luar website Anda.
              </p>
            </div>

            {/* Problem Card 2 */}
            <div className="group relative p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Algoritma Meta Buta → CPA Meledak, ROAS Anjlok
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Tanpa data konversi, algoritma Meta tidak tahu iklan mana yang berhasil.
                Akibatnya?{" "}
                <strong className="text-[#bcc9cd]">
                  Budget iklan dihabiskan ke audience yang salah
                </strong>
                , CPA naik 2–3x lipat, dan optimasi ad set Anda menjadi gambling.
              </p>
            </div>

            {/* Problem Card 3 */}
            <div className="group relative p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <Ghost className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                iOS 14.5+ & Browser Blocking Bunuh Tracking Anda
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                40–60% user iOS opt-out dari tracking. Ad blocker makin agresif.{" "}
                <strong className="text-[#bcc9cd]">
                  Pixel browser Anda kehilangan setengah data
                </strong>{" "}
                bahkan sebelum user klik iklan CTWA. Reporting Anda bohong — dan Anda tidak tahu.
              </p>
            </div>

            {/* Problem Card 4 */}
            <div className="group relative p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#ffb4ab]/30 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb4ab]/[0.03] rounded-full blur-3xl pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/20 flex items-center justify-center text-[#ffb4ab] mb-4">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                Scaling Iklan CTWA Terasa Seperti Menembak Dalam Gelap
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
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
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 p-6 rounded-2xl border border-[#1e2847] bg-gradient-to-r from-[#0d1632] via-[#111d3d] to-[#0d1632]">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4cd7f6]/20 to-[#4edea3]/20 border border-[#4cd7f6]/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#4cd7f6]" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-lg">
                Bagaimana jika setiap chat WhatsApp dari iklan CTWA…
              </p>
              <p className="text-[#4edea3] text-sm font-medium">
                otomatis tercatat sebagai konversi di Meta Ads Manager Anda?
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FEATURES / SOLUTION ───── */}
      <section id="fitur" className="relative py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] mb-4">
              <Zap className="w-4 h-4" />
              Solusi
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Server-Side Tracking yang{" "}
              <span className="bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] bg-clip-text text-transparent">
                Benar-Benar Bekerja
              </span>
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-base leading-relaxed">
              SignalPulse menangkap <code className="text-[#4cd7f6] bg-[#4cd7f6]/10 px-1.5 py-0.5 rounded text-xs">ctwa_clid</code> dari
              setiap klik iklan CTWA, lalu mengirim event konversi langsung ke Meta Conversions API
              — bypass browser sepenuhnya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4cd7f6]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:shadow-[0_0_16px_rgba(76,215,246,0.2)] transition-shadow">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Server-Side CAPI Tracking
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Event dikirim dari server, bukan browser. Tidak terpengaruh ad blocker, cookie
                restriction, atau iOS privacy update. Data Anda{" "}
                <strong className="text-[#bcc9cd]">100% sampai ke Meta</strong>.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4edea3]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3] mb-4 group-hover:shadow-[0_0_16px_rgba(78,222,163,0.2)] transition-shadow">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Auto-Capture CTWA Click ID
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Setiap kali user klik iklan CTWA dan memulai chat,{" "}
                <code className="text-[#4edea3] bg-[#4edea3]/10 px-1 py-0.5 rounded text-xs">
                  ctwa_clid
                </code>{" "}
                otomatis ditangkap via webhook — tanpa setup manual atau coding.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#b4c5ff]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#b4c5ff]/10 border border-[#b4c5ff]/20 flex items-center justify-center text-[#b4c5ff] mb-4 group-hover:shadow-[0_0_16px_rgba(180,197,255,0.2)] transition-shadow">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Multi-Stage Event Pipeline
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Kirim hingga 4 event per lead:{" "}
                <span className="text-[#bcc9cd]">
                  LeadSubmitted → Qualified → Proposal → Purchase
                </span>
                . Beri Meta data funnel lengkap agar algoritma belajar lebih cerdas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4cd7f6]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/20 flex items-center justify-center text-[#4cd7f6] mb-4 group-hover:shadow-[0_0_16px_rgba(76,215,246,0.2)] transition-shadow">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Smart Deduplication Engine
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Redis-powered cache memastikan{" "}
                <strong className="text-[#bcc9cd]">tidak ada event duplikat</strong> yang terkirim ke
                Meta. EMQ Score Anda tetap tinggi, reporting tetap akurat.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#4edea3]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center text-[#4edea3] mb-4 group-hover:shadow-[0_0_16px_rgba(78,222,163,0.2)] transition-shadow">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                Real-Time Payload Inspector
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Dashboard live monitoring: lihat setiap webhook masuk, payload terkirim, response
                Meta, dan status deduplikasi —{" "}
                <strong className="text-[#bcc9cd]">semuanya real-time</strong>.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-6 rounded-2xl border border-[#1e2847] bg-[#0d1632]/40 hover:border-[#b4c5ff]/30 hover:bg-[#0d1632]/60 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#b4c5ff]/10 border border-[#b4c5ff]/20 flex items-center justify-center text-[#b4c5ff] mb-4 group-hover:shadow-[0_0_16px_rgba(180,197,255,0.2)] transition-shadow">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-white font-semibold text-base mb-2">
                EMQ Score 8.7+ Guaranteed
              </h3>
              <p className="text-[#869397] text-sm leading-relaxed">
                Event yang dikirim selalu ter-enriched dengan{" "}
                <span className="text-[#bcc9cd]">email hash, phone hash, fbp, fbc, IP, user agent</span>.
                EMQ Score tinggi = Meta percaya data Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section id="cara-kerja" className="relative py-20 md:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4edea3] mb-4">
              <Radio className="w-4 h-4" />
              Cara Kerja
            </span>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Setup 10 Menit.{" "}
              <span className="bg-gradient-to-r from-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Konversi Langsung Tercatat.
              </span>
            </h2>
          </div>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[#4cd7f6]/40 via-[#4edea3]/40 to-[#b4c5ff]/40 hidden sm:block" />

            {/* Step 1 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
              <div className="md:w-1/2 md:text-right md:pr-12">
                <div className="inline-flex items-center gap-2 text-xs text-[#4cd7f6] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center font-mono text-sm">
                    1
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Hubungkan WhatsApp Business
                </h3>
                <p className="text-[#869397] text-sm leading-relaxed">
                  Login ke SignalPulse → klik &quot;Connect WhatsApp&quot; → otorisasi via OAuth. Selesai
                  dalam 2 menit, zero coding.
                </p>
              </div>
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4cd7f6] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(76,215,246,0.4)]" />
              <div className="md:w-1/2 md:pl-12" />
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
              <div className="md:w-1/2 md:pr-12" />
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4edea3] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(78,222,163,0.4)]" />
              <div className="md:w-1/2 md:pl-12">
                <div className="inline-flex items-center gap-2 text-xs text-[#4edea3] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center font-mono text-sm">
                    2
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Webhook Otomatis Aktif
                </h3>
                <p className="text-[#869397] text-sm leading-relaxed">
                  Setiap pesan masuk dari iklan CTWA, webhook menangkap{" "}
                  <code className="text-[#4edea3] bg-[#4edea3]/10 px-1 py-0.5 rounded text-xs">
                    ctwa_clid
                  </code>
                  , nomor telepon, dan metadata percakapan secara otomatis.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
              <div className="md:w-1/2 md:text-right md:pr-12">
                <div className="inline-flex items-center gap-2 text-xs text-[#b4c5ff] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#b4c5ff]/10 border border-[#b4c5ff]/30 flex items-center justify-center font-mono text-sm">
                    3
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Event Terkirim ke Meta CAPI
                </h3>
                <p className="text-[#869397] text-sm leading-relaxed">
                  SignalPulse langsung mengirim event konversi (Lead, Purchase, dll) ke Meta
                  Conversions API dengan data ter-enriched. Deduplikasi otomatis mencegah double
                  counting.
                </p>
              </div>
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#b4c5ff] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(180,197,255,0.4)]" />
              <div className="md:w-1/2 md:pl-12" />
            </div>

            {/* Step 4 */}
            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="md:w-1/2 md:pr-12" />
              <div className="hidden md:flex w-4 h-4 rounded-full bg-[#4cd7f6] border-4 border-[#0a122a] absolute left-1/2 -translate-x-1/2 shadow-[0_0_12px_rgba(76,215,246,0.4)]" />
              <div className="md:w-1/2 md:pl-12">
                <div className="inline-flex items-center gap-2 text-xs text-[#4cd7f6] font-semibold mb-2">
                  <span className="w-7 h-7 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center font-mono text-sm">
                    4
                  </span>
                  STEP
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  Konversi Muncul di Ads Manager 🎯
                </h3>
                <p className="text-[#869397] text-sm leading-relaxed">
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
      <section className="relative py-20 md:py-28 px-6 bg-[#060e22]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Sebelum vs Sesudah{" "}
              <span className="text-[#4cd7f6]">SignalPulse</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before */}
            <div className="p-6 rounded-2xl border border-[#ffb4ab]/20 bg-[#0d1632]/40 space-y-4">
              <div className="flex items-center gap-2 text-[#ffb4ab] font-semibold text-sm uppercase tracking-wider">
                <EyeOff className="w-4 h-4" />
                Tanpa SignalPulse
              </div>
              <ul className="space-y-3">
                {[
                  "0 konversi tercatat di Meta Ads Manager",
                  "CPA tinggi, ROAS rendah — tidak bisa scale",
                  "40–60% data hilang karena iOS & ad blocker",
                  "Algoritma Meta tidak belajar — budget habis sia-sia",
                  "Tidak tahu iklan mana yang hasilkan closing",
                  "Reporting manual pakai spreadsheet",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#869397]">
                    <span className="w-5 h-5 rounded-full bg-[#ffb4ab]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="p-6 rounded-2xl border border-[#4edea3]/20 bg-[#0d1632]/40 space-y-4">
              <div className="flex items-center gap-2 text-[#4edea3] font-semibold text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4" />
                Dengan SignalPulse
              </div>
              <ul className="space-y-3">
                {[
                  "Setiap chat CTWA = 1 konversi ter-record di Meta",
                  "CPA turun 30–50% berkat optimasi algoritma",
                  "100% data sampai — server-side, bypass semua blocker",
                  "Meta belajar dari data real → audience makin akurat",
                  "Dashboard real-time: tahu persis ROI per iklan per jam",
                  "Semua otomatis — zero manual work",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#dbe1ff]">
                    <span className="w-5 h-5 rounded-full bg-[#4edea3]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-[#4edea3]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ───── LIVE DEMO / SOCIAL PROOF TICKER ───── */}
      <section className="relative py-16 px-6 border-y border-[#1e2847]/60 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-sm text-[#869397] mb-8">
            <LivePulse />
            <span>
              Event tracking aktif — data dikirim ke Meta sekarang
            </span>
          </div>

          {/* Scrolling ticker */}
          <div className="relative overflow-hidden">
            <div className="flex gap-4 animate-ticker">
              {[
                { event: "Lead", phone: "+62 812-****-4821", status: "200 OK", time: "2s ago", color: "#4edea3" },
                { event: "Purchase", phone: "+62 857-****-9012", status: "200 OK", time: "5s ago", color: "#4cd7f6" },
                { event: "LeadSubmitted", phone: "+62 896-****-1080", status: "200 OK", time: "8s ago", color: "#4edea3" },
                { event: "Qualified", phone: "+62 813-****-5567", status: "200 OK", time: "12s ago", color: "#b4c5ff" },
                { event: "Purchase", phone: "+62 878-****-3344", status: "200 OK", time: "15s ago", color: "#4cd7f6" },
                { event: "Lead", phone: "+62 821-****-7788", status: "200 OK", time: "18s ago", color: "#4edea3" },
                { event: "LeadSubmitted", phone: "+62 858-****-2200", status: "200 OK", time: "22s ago", color: "#4edea3" },
                { event: "Purchase", phone: "+62 811-****-6655", status: "200 OK", time: "25s ago", color: "#4cd7f6" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="shrink-0 flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[#1e2847] bg-[#0d1632]/60 font-mono text-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#dbe1ff] font-medium">{item.event}</span>
                  <span className="text-[#869397]">{item.phone}</span>
                  <span className="text-[#4edea3]">{item.status}</span>
                  <span className="text-[#5a6480]">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── PRICING SECTION ───── */}
      <section id="harga" className="relative py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] mb-4">
              <CreditCard className="w-4 h-4" />
              Struktur Harga & Paket
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-5">
              Investasi Terjangkau,{" "}
              <span className="bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] bg-clip-text text-transparent">
                Hasil Maksimal
              </span>
            </h2>
            <p className="text-[#869397] max-w-2xl mx-auto text-base leading-relaxed">
              Tanpa biaya tersembunyi, tanpa komisi per konversi. Pilih paket yang sesuai kebutuhan
              skala iklan CTWA Anda dan mulai lacak setiap konversi secara akurat.
            </p>
          </div>

          {/* ALL FEATURES HIGHLIGHT (SHARED ACROSS BOTH PLANS) */}


          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* 6 BULAN PLAN */}
            <div className="relative rounded-2xl border border-[#1e2847] bg-[#0d1632]/70 backdrop-blur-md p-8 md:p-9 flex flex-col justify-between hover:border-[#4cd7f6]/40 transition-all group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#869397] px-3 py-1 rounded-full bg-[#1e2847]/60 border border-[#1e2847]">
                    Pilihan Fleksibel
                  </span>
                  <span className="text-xs font-semibold text-[#4cd7f6] px-2.5 py-0.5 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/20">
                    Durasi 6 Bulan
                  </span>
                </div>

                <h3 className="text-3xl font-bold text-white mb-2">Paket 6 Bulan</h3>
                <p className="text-sm text-[#869397] mb-6 leading-relaxed">
                  Akses penuh ke seluruh fitur SignalPulse selama 6 bulan untuk optimasi iklan CTWA Anda.
                </p>

                <div className="mb-6 pb-6 border-b border-[#1e2847]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[#869397]">Rp</span>
                    <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                      149.000
                    </span>
                    <span className="text-xs text-[#869397]">/ 6 bulan</span>
                  </div>
                  <p className="text-xs text-[#4edea3] mt-2 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Setara Rp 24.833 / bulan
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090f23]/60 border border-[#1e2847] mb-8 space-y-2 text-xs text-[#bcc9cd]">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4cd7f6]" />
                    Termasuk Semua Fitur Tanpa Batas:
                  </p>
                  <p className="text-[#869397] leading-relaxed">
                    Mendapatkan akses lengkap 100% ke seluruh sistem tracking CAPI, telemetry, dan update selama masa aktif 6 bulan.
                  </p>
                </div>
              </div>

              <div>
                <Link
                  href="/checkout?plan=6-bulan"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-[#4cd7f6]/50 bg-[#4cd7f6]/10 text-[#4cd7f6] font-semibold text-base hover:bg-[#4cd7f6] hover:text-[#050d25] transition-all duration-200 group-hover:shadow-[0_0_25px_rgba(76,215,246,0.3)]"
                >
                  <span>Beli Paket 6 Bulan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-[#5a6480] mt-3 flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Pembayaran instan otomatis
                </p>
              </div>
            </div>

            {/* 1 TAHUN PLAN (RECOMMENDED) */}
            <div className="relative rounded-2xl border-2 border-[#4cd7f6] bg-gradient-to-b from-[#0f1c42] to-[#0a142f] p-8 md:p-9 flex flex-col justify-between shadow-[0_0_40px_rgba(76,215,246,0.18)] hover:shadow-[0_0_60px_rgba(76,215,246,0.3)] transition-all">
              {/* Highlight Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[#4cd7f6] via-[#4edea3] to-[#4cd7f6] text-[#050d25] text-xs font-bold uppercase tracking-wider shadow-lg">
                🔥 Rekomendasi • Paling Hemat
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4cd7f6] px-3 py-1 rounded-full bg-[#4cd7f6]/10 border border-[#4cd7f6]/30">
                    Durasi 1 Tahun
                  </span>
                  <span className="text-xs font-semibold text-[#4edea3] bg-[#4edea3]/10 px-2.5 py-0.5 rounded-full border border-[#4edea3]/20">
                    Hemat Rp 49.000
                  </span>
                </div>

                <h3 className="text-3xl font-bold text-white mb-2">Paket 1 Tahun</h3>
                <p className="text-sm text-[#bcc9cd] mb-6 leading-relaxed">
                  Akses penuh ke seluruh fitur SignalPulse selama 12 bulan penuh dengan harga paling hemat.
                </p>

                <div className="mb-6 pb-6 border-b border-[#1e2847]">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-[#869397]">Rp</span>
                    <span className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                      249.000
                    </span>
                    <span className="text-xs text-[#869397]">/ 1 tahun</span>
                  </div>
                  <p className="text-xs text-[#4edea3] mt-2 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Setara hanya Rp 20.750 / bulan (Diskon Terbesar!)
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#090f23]/60 border border-[#4edea3]/30 mb-8 space-y-2 text-xs text-[#bcc9cd]">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4edea3]" />
                    Termasuk Semua Fitur Tanpa Batas:
                  </p>
                  <p className="text-[#869397] leading-relaxed">
                    Mendapatkan akses lengkap 100% ke seluruh sistem tracking CAPI, telemetry, dan update selama masa aktif 12 bulan penuh.
                  </p>
                </div>
              </div>

              <div>
                <Link
                  href="/checkout?plan=1-tahun"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-[#4cd7f6] via-[#06b6d4] to-[#4edea3] text-[#050d25] font-bold text-base hover:shadow-[0_0_35px_rgba(76,215,246,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>Beli Paket 1 Tahun</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="text-[11px] text-center text-[#4edea3] mt-3 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Aktivasi instan otomatis & jaminan terhubung
                </p>
              </div>
            </div>
          </div>


        </div>
      </section>

      {/* ───── FAQ SECTION ───── */}
      <section id="faq" className="relative py-20 md:py-28 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Pertanyaan yang Sering Ditanyakan
            </h2>
            <p className="text-[#869397] text-sm">
              Jawaban untuk pertanyaan umum seputar SignalPulse dan CTWA tracking.
            </p>
          </div>

          <div className="space-y-3">
            <FaqItem
              q="Apakah saya perlu coding atau technical skill?"
              a="Tidak sama sekali. SignalPulse didesain untuk advertiser, bukan developer. Setup dilakukan via dashboard visual — hubungkan WhatsApp, konfigurasi event, dan tracking langsung aktif. Zero coding."
            />
            <FaqItem
              q="Bagaimana SignalPulse menangkap konversi dari chat WhatsApp?"
              a="Ketika user klik iklan CTWA Anda dan memulai chat, Meta menyertakan 'ctwa_clid' (Click ID). SignalPulse menangkap ID ini via webhook, lalu mengirim event konversi ke Meta Conversions API secara server-side — sehingga Meta tahu persis konversi mana yang berasal dari iklan mana."
            />
            <FaqItem
              q="Apakah ini aman? Data pelanggan saya tidak bocor?"
              a="100% aman. Data dikirim terenkripsi SHA-256 ke Meta sesuai standar Conversions API. Kami tidak menyimpan data sensitif pelanggan — hanya hash yang diperlukan untuk matching. Semua sesuai kebijakan privasi Meta."
            />
            <FaqItem
              q="Apa bedanya dengan Meta Pixel biasa?"
              a="Meta Pixel bekerja di browser, rentan terhadap ad blocker, cookie restriction, dan iOS privacy update — kehilangan 40-60% data. SignalPulse mengirim data dari server ke server (server-side), sehingga 100% data sampai ke Meta tanpa loss."
            />
            <FaqItem
              q="Berapa banyak event yang bisa saya kirim per lead?"
              a="Hingga 4 event per lead: misalnya LeadSubmitted (chat masuk), Qualified (lead berkualitas), Proposal (kirim penawaran), Purchase (closing). Semakin banyak data funnel, semakin cerdas algoritma Meta mengoptimasi iklan Anda."
            />
            <FaqItem
              q="Apakah mendukung semua provider WhatsApp Business?"
              a="SignalPulse saat ini terintegrasi dengan Zernio sebagai provider utama, yang merupakan Meta Verified Partner. Integrasi dengan provider lain akan segera hadir."
            />
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="relative py-24 md:py-32 px-6">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center bottom, rgba(76,215,246,0.06) 0%, rgba(78,222,163,0.03) 30%, transparent 65%)",
          }}
        />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#4edea3]/30 bg-[#4edea3]/5 text-xs text-[#4edea3] font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Setup Cuma 10 Menit
          </div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 leading-tight">
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

          <p className="text-[#869397] text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join 200+ advertiser CTWA yang sudah melihat data konversi mereka muncul kembali di
            Meta Ads Manager.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#harga"
              className="group inline-flex items-center gap-2.5 px-10 py-4 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-base shadow-[0_0_36px_rgba(76,215,246,0.3)] hover:shadow-[0_0_50px_rgba(76,215,246,0.45)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-5 h-5" />
              <span>Pilih Paket Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <p className="text-xs text-[#5a6480] mt-6">
            Aktivasi Instan Otomatis • Pembayaran Resmi via Pakasir • Setup 10 Menit
          </p>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-[#1e2847]/60 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4cd7f6] to-[#06b6d4] flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-[#050d25]" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm text-[#869397]">
              Signal<span className="text-[#4cd7f6]">Pulse</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#5a6480]">
            <span>© 2026 SignalPulse. All rights reserved.</span>
            <a href="#" className="hover:text-[#869397] transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-[#869397] transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>

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
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
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
