"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Download,
  Smartphone,
  CheckCircle2,
  Share,
  PlusSquare,
  Monitor,
  Sparkles,
  Zap,
  ShieldCheck,
  Radio,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Layers,
  Activity,
  HardDrive,
  Cpu,
  Globe,
} from "lucide-react";

export default function InstallPwaPage() {
  // PWA & Platform Detection State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"android" | "ios" | "desktop">("android");
  const [swActive, setSwActive] = useState(false);
  const [deviceDetected, setDeviceDetected] = useState<string>("Mendeteksi...");

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // 2. Detect Operating System & auto-select tab
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setActiveTab("ios");
      setDeviceDetected("Perangkat Apple iOS (iPhone/iPad)");
    } else if (/android/i.test(userAgent)) {
      setActiveTab("android");
      setDeviceDetected("Perangkat Android");
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
      setActiveTab("desktop");
      setDeviceDetected("Komputer Mac (macOS)");
    } else if (/Windows/i.test(userAgent)) {
      setActiveTab("desktop");
      setDeviceDetected("Komputer Windows PC");
    } else {
      setActiveTab("desktop");
      setDeviceDetected("Desktop / Browser Web");
    }

    // 3. Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Listen for app installed event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setInstalledSuccess(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // 5. Check Service Worker status
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.active) {
          setSwActive(true);
        }
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Trigger 1-Click PWA Installation for Supported Browsers (Chrome Android/Desktop, Edge)
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setInstalledSuccess(true);
        setIsStandalone(true);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn("PWA installation prompt error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-surface-container-high border border-primary/40 flex items-center justify-center p-2 glow-cyan shrink-0 mt-0.5 sm:mt-0">
            <Image
              src="/icons/icon-192x192.png"
              alt="TrackCapi Icon"
              width={48}
              height={48}
              className="rounded-xl w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-headline-sm font-semibold text-on-surface">
                Install Aplikasi TrackCapi (PWA)
              </h1>
              {isStandalone ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] sm:text-label-sm font-code-metric bg-tertiary/15 text-tertiary border border-tertiary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  SUDAH TERPASANG
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] sm:text-label-sm font-code-metric bg-primary/10 text-primary border border-primary/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  SIAP DIINSTALL
                </span>
              )}
            </div>
            <p className="text-xs sm:text-body-sm font-body-sm text-on-surface-variant mt-1 leading-relaxed">
              Pasang aplikasi langsung ke layar utama (*Home Screen*) ponsel atau desktop Anda. Akses lebih cepat, ringan, dan tanpa repot membuka browser setiap saat.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
          <div className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-xs font-code-metric text-on-surface-variant flex items-center justify-center sm:justify-start gap-2">
            <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{deviceDetected}</span>
          </div>
        </div>
      </div>

      {/* 2. Standalone Active or 1-Click Install CTA Box */}
      {isStandalone ? (
        <div className="p-4 sm:p-5 rounded-xl bg-tertiary-container/15 border border-tertiary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-body-sm">
          <div className="flex items-start sm:items-center gap-3 text-tertiary">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-on-surface">
                TrackCapi Sudah Berjalan Sebagai Aplikasi PWA!
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Aplikasi sedang dibuka dalam mode standalone di perangkat Anda. Nikmati performa maksimal dan kemudahan akses langsung dari ikon layar utama.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/tracking"
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary-container font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <span>Buka Tracking</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-surface-container-low via-surface-container to-surface-container-low border border-primary/30 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm sm:text-base">
              <Sparkles className="w-4 h-4" />
              <span>Instalasi Cepat 1-Klik</span>
            </div>
            <span className="text-[11px] font-code-metric text-outline">
              Progressive Web App • Standalone v1.0
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="font-headline-sm text-sm sm:text-base font-bold text-on-surface">
                {deferredPrompt
                  ? "Browser Anda Mendukung Instalasi Langsung!"
                  : "Pasang TrackCapi di Perangkat Anda"}
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {deferredPrompt
                  ? "Klik tombol di sebelah kanan untuk langsung memunculkan dialog konfirmasi instalasi resmi dari browser Anda."
                  : "Gunakan panduan mudah di bawah ini sesuai perangkat yang Anda gunakan saat ini (Android, iOS Safari, atau Desktop)."}
              </p>
            </div>

            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] active:scale-[0.98] transition-all cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 shrink-0 animate-bounce" />
                <span>{isInstalling ? "Memproses..." : "Install Aplikasi Sekarang"}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs font-code-metric text-primary self-start sm:self-auto shrink-0">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Lihat Panduan di Bawah</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Platform Instruction Tabs */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
          <div>
            <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span>Petunjuk Cara Pasang per Perangkat</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Pilih tipe perangkat Anda untuk melihat langkah pemasangan:
            </p>
          </div>

          {/* Platform Tab Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 self-start sm:self-auto font-code-metric text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("android")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "android"
                  ? "bg-primary text-on-primary font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>Android</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ios"
                  ? "bg-primary text-on-primary font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>iOS (iPhone/iPad)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("desktop")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "desktop"
                  ? "bg-primary text-on-primary font-semibold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>Desktop PC</span>
            </button>
          </div>
        </div>

        {/* Tab Content: Android */}
        {activeTab === "android" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Mendukung <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, <strong>Samsung Internet</strong>, atau <strong>Brave Browser</strong> pada semua tipe smartphone Android.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-code-metric">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  01
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  1
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Buka Menu Browser (⋮)
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Buka aplikasi TrackCapi di Chrome Android, lalu ketuk ikon <strong>tiga titik vertikal (⋮)</strong> di sudut kanan atas layar.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  02
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  2
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Pilih &quot;Install Aplikasi&quot;
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Gulir ke bawah pada menu lalu ketuk opsi <strong>&quot;Install aplikasi&quot;</strong> atau <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (*Add to Home Screen*).
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-tertiary/30 absolute top-2 right-3">
                  03
                </span>
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary font-bold text-xs">
                  3
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Ketuk &quot;Install&quot; &amp; Selesai!
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Ketuk tombol <strong>Install</strong> pada jendela konfirmasi. Ikon aplikasi TrackCapi akan langsung muncul di beranda HP Anda layaknya aplikasi Play Store.
                </p>
              </div>
            </div>

            {/* Note on Android WebAPK compilation */}
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface-variant flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed text-[11px]">
                <strong className="text-on-surface">Mengapa instalasi di Android memerlukan waktu beberapa detik?</strong>
                <p>
                  Di sistem Android, Google Chrome bekerja sama dengan <em>Google Play Services</em> untuk membuat dan menandatangani paket aplikasi native mini (<strong>WebAPK</strong>) secara otomatis di latar belakang. Proses ini normalnya membutuhkan waktu sekitar <strong>15–30 detik</strong> (bisa dicek di bilah notifikasi HP: <em>&quot;Menginstal TrackCapi...&quot;</em>). Setelah terpasang, aplikasi dapat dibuka secara instan tanpa loading browser.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: iOS (Safari) */}
        {activeTab === "ios" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-amber-400/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Khusus Pengguna Apple iOS:</strong> Fitur instalasi PWA di iPhone dan iPad harus dibuka menggunakan browser resmi <strong>Safari</strong> (bukan aplikasi in-app browser seperti WhatsApp atau Instagram).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-code-metric">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  01
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  1
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Buka di Safari &amp; Ketuk Share
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Pastikan halaman terbuka di <strong>Safari</strong>, lalu ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas <Share className="inline w-3 h-3 text-primary" />) di bar bawah layar.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  02
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  2
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Pilih &quot;Add to Home Screen&quot;
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Gulir menu share ke bawah dan ketuk opsi <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (*Add to Home Screen* <PlusSquare className="inline w-3 h-3 text-primary" />).
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-tertiary/30 absolute top-2 right-3">
                  03
                </span>
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary font-bold text-xs">
                  3
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Ketuk &quot;Tambah&quot; (*Add*)
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Ketuk tombol <strong>Tambah (*Add*)</strong> di pojok kanan atas. Ikon TrackCapi siap digunakan di layar beranda iPhone Anda dengan tampilan penuh tanpa navigasi Safari!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Desktop (Windows / Mac) */}
        {activeTab === "desktop" && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-primary/20 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <Monitor className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Mendukung browser desktop modern: <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, dan <strong>Brave</strong> pada Windows 10/11, macOS, dan Linux.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-code-metric">
              {/* Step 1 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  01
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  1
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Cek Ikon Install di URL Bar
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Perhatikan ujung kanan bilah alamat URL browser (address bar). Anda akan melihat ikon <strong>Install Aplikasi</strong> (simbol komputer berpanah ke bawah atau tombol &quot;Install&quot;).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-primary/30 absolute top-2 right-3">
                  02
                </span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                  2
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Klik Tombol &quot;Install&quot;
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  Klik ikon tersebut, lalu konfirmasikan dengan memilih <strong>&quot;Install&quot;</strong> pada jendela pop-up browser Anda.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-2 relative overflow-hidden">
                <span className="text-2xl font-bold text-tertiary/30 absolute top-2 right-3">
                  03
                </span>
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary font-bold text-xs">
                  3
                </div>
                <h4 className="font-bold text-on-surface text-xs font-sans">
                  Buka Sebagai Window Mandiri
                </h4>
                <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                  TrackCapi kini akan terbuka dalam jendela aplikasi tersendiri tanpa tab dan URL bar browser, serta memiliki shortcut di Start Menu / Desktop / Dock Mac Anda.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Keunggulan Menggunakan PWA TrackCapi */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="pb-2 border-b border-outline-variant/20">
          <h3 className="text-sm sm:text-headline-sm font-semibold text-on-surface flex items-center gap-2">
            <Zap className="w-4 h-4 text-tertiary" />
            <span>Keunggulan Aplikasi Progressive Web App (PWA)</span>
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Mengapa menggunakan PWA lebih praktis daripada membuka web biasa:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-on-surface text-xs">Akses Instan 1 Ketuk</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Langsung masuk ke pemantauan CTWA dari layar depan ponsel tanpa perlu mengetik alamat URL lagi.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-on-surface text-xs">Super Ringan (&lt; 2 MB)</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Tidak menghabiskan kapasitas memori HP seperti aplikasi raksasa di Play Store atau App Store.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-on-surface text-xs">Tampilan Bersih Fullscreen</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Bebas dari bilah navigasi atau address bar browser yang mengganggu, memberi ruang pantau yang lebih leluasa.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="font-semibold text-on-surface text-xs">Update Otomatis</h4>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Fitur baru dan pembaruan Meta CAPI langsung otomatis aktif tanpa harus repot download update secara manual.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Live Technical Diagnostic Card */}
      <div className="p-4 sm:p-5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-code-metric">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-primary" />
            <span className="text-outline">Service Worker:</span>
            <span className="text-tertiary font-bold">
              {swActive ? "ACTIVE (sw.js)" : "REGISTERED"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-outline">Manifest:</span>
            <span className="text-primary font-bold">CONNECTED</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-outline">
          <span>Mode Tampilan:</span>
          <span className="text-on-surface font-semibold">
            {isStandalone ? "Standalone (App Window)" : "Browser Window"}
          </span>
        </div>
      </div>
    </div>
  );
}
