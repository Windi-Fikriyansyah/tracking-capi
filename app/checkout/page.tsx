"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  HelpCircle,
  Lock,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

/* ───────────────────────────────────────────────
   PLAN DEFINITIONS
   ─────────────────────────────────────────────── */
interface Plan {
  id: "6-bulan" | "1-tahun";
  name: string;
  duration: string;
  price: number;
  monthlyEquivalent: number;
  badge?: string;
  savings?: string;
  features: string[];
}

const SHARED_FEATURES = [
  "Unlimited Event Tracking CAPI (Tanpa Batas Kuota)",
  "Meta Conversions API Server-Side Engine (<40ms)",
  "Akurasi Deduplikasi Event 99.4%",
  "Support 4 Level Funnel CTWA (Lead s/d Purchase)",
  "Integrasi WhatsApp API / Zernio Partner",
  "Live Telemetry Dashboard & Log Status Meta Graph",
  "Panduan Setup Lengkap & Bantuan Teknis",
];

const PLANS: Record<"6-bulan" | "1-tahun", Plan> = {
  "6-bulan": {
    id: "6-bulan",
    name: "Paket 6 Bulan",
    duration: "6 Bulan Akses Penuh",
    price: 149000,
    monthlyEquivalent: 24833,
    badge: "Durasi 6 Bulan",
    features: SHARED_FEATURES,
  },
  "1-tahun": {
    id: "1-tahun",
    name: "Paket 1 Tahun",
    duration: "12 Bulan Akses Penuh",
    price: 249000,
    monthlyEquivalent: 20750,
    badge: "🔥 PALING HEMAT • REKOMENDASI",
    savings: "Hemat Rp 49.000",
    features: SHARED_FEATURES,
  },
};

/* ───────────────────────────────────────────────
   PAKASIR PAYMENT METHODS LIST
   ─────────────────────────────────────────────── */
interface PaymentMethodItem {
  id: string;
  name: string;
  category: "qris" | "va";
  description: string;
  badge?: string;
  logoUrl: string;
}

const PAKASIR_METHODS: PaymentMethodItem[] = [
  // QRIS
  {
    id: "qris",
    name: "QRIS",
    category: "qris",
    description: "GoPay, OVO, DANA, ShopeePay, LinkAja, BCA Mobile, Livin' Mandiri, BRImo, BNI",
    logoUrl: "/asset/QRIS Logo - Black - zonalogo.com (1).svg",
  },
  // VIRTUAL ACCOUNT
  {
    id: "bni_va",
    name: "BNI Virtual Account",
    category: "va",
    description: "Transfer via BNI Mobile Banking, ATM, atau Internet Banking",
    logoUrl: "/asset/Bank Negara Indonesia (BNI) Logo - Colored - zonalogo.com.svg",
  },
  {
    id: "bri_va",
    name: "BRI Virtual Account (BRIVA)",
    category: "va",
    description: "Transfer via BRImo, ATM BRI, atau Internet Banking BRI",
    logoUrl: "/asset/Bank Rakyat Indonesia (BRI) Logo - Horizontal With Full Name Colored - zonalogo.com.svg",
  },
  {
    id: "cimb_niaga_va",
    name: "CIMB Niaga Virtual Account",
    category: "va",
    description: "Transfer via OCTO Mobile, OCTO Clicks, atau ATM CIMB",
    logoUrl: "/asset/Bank CIMB Niaga Logo - Colored - zonalogo.com.svg",
  },
  {
    id: "permata_va",
    name: "Permata Bank Virtual Account",
    category: "va",
    description: "Transfer via PermataMobile X, ATM Permata, atau Alto",
    logoUrl: "/asset/Bank Permata Logo - Colored - zonalogo.com.svg",
  },
  {
    id: "maybank_va",
    name: "Maybank Virtual Account",
    category: "va",
    description: "Transfer via M2U ID App, Maybank2u, atau ATM Maybank",
    logoUrl: "/asset/Maybank Logo - Colored - zonalogo.com.svg",
  },
  {
    id: "bnc_va",
    name: "Bank Neo Commerce (BNC) VA",
    category: "va",
    description: "Transfer via Neo+ App atau Transfer Antar Bank",
    logoUrl: "/asset/Bank Neo Commerce Logo - Colored - zonalogo.com.svg",
  },
  {
    id: "artha_graha_va",
    name: "Bank Artha Graha VA",
    category: "va",
    description: "Transfer Virtual Account Bank Artha Graha",
    logoUrl: "/asset/Bank Artha Graha Logo - Colored - zonalogo.com.png",
  },
];

/* ───────────────────────────────────────────────
   CHECKOUT CONTENT COMPONENT
   ─────────────────────────────────────────────── */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const initialPlanParam = searchParams.get("plan");

  const [selectedPlanId, setSelectedPlanId] = useState<"6-bulan" | "1-tahun">(
    initialPlanParam === "6-bulan" ? "6-bulan" : "1-tahun"
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string>("qris");
  const [methodFilter, setMethodFilter] = useState<"all" | "qris" | "va">("all");

  // Buyer information
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Loading & payment states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [transactionData, setTransactionData] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPaidSuccess, setIsPaidSuccess] = useState(false);

  // Pakasir v2 Dynamic Admin Fee State
  const [feeMap, setFeeMap] = useState<Record<string, number>>({
    qris: 1490,
    bni_va: 3500,
    bri_va: 3500,
    cimb_niaga_va: 3500,
    permata_va: 3500,
    maybank_va: 3500,
    bnc_va: 3500,
    artha_graha_va: 2000,
  });

  // Synchronize if query param changes
  useEffect(() => {
    if (initialPlanParam === "6-bulan") {
      setSelectedPlanId("6-bulan");
    } else if (initialPlanParam === "1-tahun") {
      setSelectedPlanId("1-tahun");
    }
  }, [initialPlanParam]);

  // Fetch dynamic fee from Pakasir v2 API whenever plan changes
  useEffect(() => {
    const planAmount = PLANS[selectedPlanId].price;
    fetch(`/api/pakasir/fee?amount=${planAmount}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.fees) {
          setFeeMap(data.fees);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch real-time Pakasir fee, using default:", err);
      });
  }, [selectedPlanId]);

  const currentPlan = PLANS[selectedPlanId];
  const selectedMethod =
    PAKASIR_METHODS.find((m) => m.id === selectedMethodId) || PAKASIR_METHODS[0];

  const currentFee = feeMap[selectedMethodId] ?? 0;
  const totalPayment = currentPlan.price + currentFee;

  const filteredMethods =
    methodFilter === "all"
      ? PAKASIR_METHODS
      : PAKASIR_METHODS.filter((m) => m.category === methodFilter);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Silakan masukkan Nama Lengkap Anda.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Silakan masukkan alamat Email yang valid.");
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, "").length < 9) {
      setErrorMsg("Silakan masukkan nomor WhatsApp yang aktif (min. 10 digit).");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pakasir/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          method: selectedMethodId,
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Gagal memproses transaksi Pakasir.");
      }

      setTransactionData(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan koneksi ke payment gateway Pakasir.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a122a] text-[#dbe1ff]">
      {/* ───── CHECKOUT HEADER ───── */}
      <header className="border-b border-[#1e2847]/80 bg-[#0d1632]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4cd7f6] to-[#06b6d4] flex items-center justify-center shadow-[0_0_16px_rgba(76,215,246,0.3)]">
              <Activity className="w-4.5 h-4.5 text-[#050d25]" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">
              Signal<span className="text-[#4cd7f6]">Pulse</span>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-xs text-[#869397]">
            <span className="hidden sm:flex items-center gap-1.5 text-[#4edea3]">
              <ShieldCheck className="w-4 h-4" />
              Checkout Aman Terenkripsi SSL 256-Bit
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[#869397] hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ───── CHECKOUT CONTAINER ───── */}
      <main className="max-w-6xl mx-auto px-6 py-10 md:py-14">
        {/* SUCCESS CONFIRMATION SCREEN */}
        {isPaidSuccess ? (
          <div className="max-w-xl mx-auto text-center py-12 px-8 rounded-2xl border border-[#4edea3]/40 bg-[#0d1632]/90 shadow-[0_0_50px_rgba(78,222,163,0.15)]">
            <div className="w-16 h-16 rounded-full bg-[#4edea3]/20 border border-[#4edea3]/40 flex items-center justify-center mx-auto mb-6 text-[#4edea3]">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <span className="inline-block px-3.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 text-xs text-[#4edea3] font-semibold uppercase tracking-wider mb-3">
              Pembayaran Berhasil Diverifikasi
            </span>
            <h1 className="text-3xl font-bold text-white mb-3">Selamat Datang di SignalPulse!</h1>
            <p className="text-[#869397] text-sm leading-relaxed mb-6">
              Langganan <strong className="text-white">{currentPlan.name}</strong> Anda telah aktif.
              Detail akses dan receipt telah dikirimkan ke email{" "}
              <strong className="text-[#4cd7f6]">{email || "Anda"}</strong>.
            </p>

            <div className="p-4 rounded-xl border border-[#1e2847] bg-[#090f23] text-left text-xs space-y-2 mb-8 font-mono">
              <div className="flex justify-between">
                <span className="text-[#869397]">ID Transaksi:</span>
                <span className="text-white">{transactionData?.order_id || "SP-ACTIVE"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#869397]">Paket:</span>
                <span className="text-[#4edea3]">{currentPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#869397]">Total Pembayaran:</span>
                <span className="text-white font-bold">
                  Rp {currentPlan.price.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#869397]">Gateway:</span>
                <span className="text-[#4cd7f6]">Pakasir Payment Gateway</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-sm shadow-[0_0_25px_rgba(76,215,246,0.3)] hover:scale-[1.02] transition-all"
              >
                <span>Buka Dashboard Telemetry</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-[#1e2847] text-[#869397] hover:text-white hover:border-[#2d3a5c] text-sm transition-colors"
              >
                <span>Halaman Utama</span>
              </Link>
            </div>
          </div>
        ) : transactionData ? (
          /* PAYMENT ACTIVE / DETAILS SCREEN (QRIS / VA / LINK) */
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-[#1e2847] bg-[#0d1632]/80 backdrop-blur-md p-6 md:p-8 shadow-2xl">
              {/* Header Details */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-[#1e2847] mb-6">
                <div>
                  <span className="text-xs text-[#869397] uppercase tracking-wider block mb-1">
                    Invoice Order ID
                  </span>
                  <div className="flex items-center gap-2 font-mono font-bold text-white text-base">
                    <span>{transactionData.order_id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(transactionData.order_id, "order_id")}
                      className="text-[#4cd7f6] hover:text-white transition-colors"
                      title="Salin Order ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {copiedField === "order_id" && (
                      <span className="text-[11px] text-[#4edea3]">Tersalin!</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#869397] uppercase tracking-wider block mb-1">
                    Total Pembayaran
                  </span>
                  <span className="text-2xl font-black text-[#4cd7f6] font-mono">
                    Rp {(transactionData.total_payment || transactionData.amount).toLocaleString("id-ID")}
                  </span>
                  {transactionData.fee > 0 && (
                    <span className="text-[11px] text-[#869397] block font-mono">
                      (Termasuk Biaya Admin Rp {transactionData.fee.toLocaleString("id-ID")})
                    </span>
                  )}
                </div>
              </div>

              {/* Status Alert */}
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 text-xs text-[#dbe1ff] mb-6">
                <Clock className="w-4 h-4 text-[#4cd7f6] shrink-0" />
                <p>
                  Selesaikan pembayaran Anda dalam{" "}
                  <strong className="text-[#4cd7f6]">15:00 menit</strong> untuk aktivasi otomatis
                  melalui sistem Pakasir.
                </p>
              </div>

              {/* QRIS PAYMENT VIEW */}
              {transactionData.method === "qris" && (
                <div className="text-center py-4 mb-6">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#1e2847] text-xs text-[#bcc9cd] font-medium mb-4">
                    Scan QRIS dengan Aplikasi Apapun
                  </span>

                  <div className="w-64 h-64 mx-auto p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4">
                    {/* QR Code image generated via public qr renderer */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                        transactionData.qr_string ||
                        transactionData.payment_url ||
                        `https://app.pakasir.com/pay-v2/${transactionData.order_id}`
                      )}`}
                      alt="QRIS Pakasir SignalPulse"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  <p className="text-xs text-[#869397] max-w-sm mx-auto leading-relaxed">
                    Buka GoPay, OVO, DANA, BCA Mobile, Livin Mandiri, ShopeePay, atau m-Banking Anda,
                    lalu scan QR code di atas.
                  </p>
                </div>
              )}

              {/* VIRTUAL ACCOUNT PAYMENT VIEW */}
              {transactionData.method.endsWith("_va") && (
                <div className="py-4 mb-6">
                  <div className="p-5 rounded-xl border border-[#1e2847] bg-[#090f23] mb-4">
                    <span className="text-xs text-[#869397] block mb-1">
                      Nomor Virtual Account ({selectedMethod.name})
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-2xl font-mono font-bold tracking-wider text-white">
                        {transactionData.va_number || "8888" + phone.slice(-8)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            transactionData.va_number || "8888" + phone.slice(-8),
                            "va_number"
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4cd7f6]/10 text-[#4cd7f6] hover:bg-[#4cd7f6] hover:text-[#050d25] text-xs font-semibold transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedField === "va_number" ? "Tersalin!" : "Salin No VA"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[#1e2847]/60 bg-[#0d1632]/50 text-xs text-[#869397] space-y-1.5">
                    <p className="font-semibold text-white mb-2">Panduan Pembayaran Virtual Account:</p>
                    <p>1. Buka aplikasi m-Banking atau kunjungi ATM bank Anda.</p>
                    <p>2. Pilih menu <strong>Transfer / Pembayaran</strong> → <strong>Virtual Account</strong>.</p>
                    <p>3. Masukkan nomor Virtual Account di atas.</p>
                    <p>4. Pastikan nama penerima tertera <strong>SignalPulse / Pakasir</strong> dan nominal sesuai (Rp {(transactionData.total_payment || transactionData.amount).toLocaleString("id-ID")}).</p>
                    <p>5. Konfirmasi transaksi dan simpan bukti transfer.</p>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS & SIMULATION */}
              <div className="space-y-3 pt-4 border-t border-[#1e2847]">
                <a
                  href={transactionData.payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4cd7f6] to-[#06b6d4] text-[#050d25] font-semibold text-sm hover:shadow-[0_0_24px_rgba(76,215,246,0.4)] transition-all"
                >
                  <span>Buka Halaman Pembayaran Pakasir</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Simulation button for demo testing */}
                <button
                  type="button"
                  onClick={() => setIsPaidSuccess(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#4edea3]/40 bg-[#4edea3]/10 text-[#4edea3] hover:bg-[#4edea3] hover:text-[#050d25] text-xs font-semibold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran Selesai (Cek Status)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionData(null)}
                  className="w-full text-center text-xs text-[#869397] hover:text-white transition-colors py-2"
                >
                  Ganti Metode Pembayaran Lain
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* MAIN CHECKOUT FORM */
          <div>
            {/* Page Title */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-[#4cd7f6] mb-3">
                <Lock className="w-3.5 h-3.5" />
                Proses Checkout Instan
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                Selesaikan Pesanan SignalPulse
              </h1>
              <p className="text-[#869397] text-sm leading-relaxed">
                Pilih paket langganan dan metode pembayaran yang Anda inginkan.
              </p>
            </div>

            <form onSubmit={handleCreatePayment}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* ───── LEFT COLUMN: PLAN, CUSTOMER DATA, PAYMENT METHODS (8 COLS) ───── */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                  {/* STEP 1: PILIH PAKET */}
                  <div className="rounded-2xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm p-6 md:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6] text-xs font-bold font-mono">
                        1
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        Pilih Durasi Langganan
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 6 BULAN CARD */}
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId("6-bulan")}
                        className={`text-left p-5 rounded-xl border transition-all relative ${selectedPlanId === "6-bulan"
                          ? "border-[#4cd7f6] bg-[#4cd7f6]/10 shadow-[0_0_20px_rgba(76,215,246,0.15)]"
                          : "border-[#1e2847] bg-[#090f23]/60 hover:border-[#2d3a5c]"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#869397]">
                            6 Bulan
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlanId === "6-bulan"
                              ? "border-[#4cd7f6] bg-[#4cd7f6]"
                              : "border-[#5a6480]"
                              }`}
                          >
                            {selectedPlanId === "6-bulan" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#050d25]" />
                            )}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-white mb-1">Rp 149.000</p>
                        <p className="text-xs text-[#869397]">Setara Rp 24.833 / bulan</p>
                      </button>

                      {/* 1 TAHUN CARD */}
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId("1-tahun")}
                        className={`text-left p-5 rounded-xl border transition-all relative ${selectedPlanId === "1-tahun"
                          ? "border-[#4edea3] bg-[#4edea3]/10 shadow-[0_0_25px_rgba(78,222,163,0.15)]"
                          : "border-[#1e2847] bg-[#090f23]/60 hover:border-[#2d3a5c]"
                          }`}
                      >
                        <span className="absolute -top-2.5 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#4cd7f6] to-[#4edea3] text-[#050d25]">
                          Hemat Rp 49.000
                        </span>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#4edea3]">
                            1 Tahun (Best Value)
                          </span>
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedPlanId === "1-tahun"
                              ? "border-[#4edea3] bg-[#4edea3]"
                              : "border-[#5a6480]"
                              }`}
                          >
                            {selectedPlanId === "1-tahun" && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#050d25]" />
                            )}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-white mb-1">Rp 249.000</p>
                        <p className="text-xs text-[#4edea3]">Setara Rp 20.750 / bulan</p>
                      </button>
                    </div>
                  </div>

                  {/* STEP 2: DATA PEMBELI */}
                  <div className="rounded-2xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm p-6 md:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-7 h-7 rounded-lg bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6] text-xs font-bold font-mono">
                        2
                      </div>
                      <h2 className="text-lg font-semibold text-white">
                        Informasi Pembeli & Lisensi
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-[#bcc9cd] mb-1.5">
                          Nama Lengkap <span className="text-[#ffb4ab]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Contoh: Budi Santoso"
                          className="w-full px-4 py-3 rounded-xl border border-[#1e2847] bg-[#090f23] text-white text-sm placeholder-[#5a6480] focus:outline-none focus:border-[#4cd7f6] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-[#bcc9cd] mb-1.5">
                            Email Aktif <span className="text-[#ffb4ab]">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="budi@example.com"
                            className="w-full px-4 py-3 rounded-xl border border-[#1e2847] bg-[#090f23] text-white text-sm placeholder-[#5a6480] focus:outline-none focus:border-[#4cd7f6] transition-colors"
                          />
                          <p className="text-[11px] text-[#5a6480] mt-1">
                            Akses login otomatis dikirim ke email ini.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#bcc9cd] mb-1.5">
                            Nomor WhatsApp <span className="text-[#ffb4ab]">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="081234567890"
                            className="w-full px-4 py-3 rounded-xl border border-[#1e2847] bg-[#090f23] text-white text-sm placeholder-[#5a6480] focus:outline-none focus:border-[#4cd7f6] transition-colors"
                          />

                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: SEMUA METODE PEMBAYARAN PAKASIR */}
                  <div className="rounded-2xl border border-[#1e2847] bg-[#0d1632]/60 backdrop-blur-sm p-6 md:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#4cd7f6]/10 border border-[#4cd7f6]/30 flex items-center justify-center text-[#4cd7f6] text-xs font-bold font-mono">
                          3
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-white">
                            Pilih Metode Pembayaran
                          </h2>
                          <p className="text-xs text-[#869397]">
                            Pilih saluran pembayaran yang Anda inginkan
                          </p>
                        </div>
                      </div>

                      {/* Filter Tabs */}
                      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#090f23] border border-[#1e2847] text-xs">
                        <button
                          type="button"
                          onClick={() => setMethodFilter("all")}
                          className={`px-3 py-1 rounded-md transition-colors ${methodFilter === "all"
                            ? "bg-[#4cd7f6] text-[#050d25] font-semibold"
                            : "text-[#869397] hover:text-white"
                            }`}
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethodFilter("qris")}
                          className={`px-3 py-1 rounded-md transition-colors ${methodFilter === "qris"
                            ? "bg-[#4cd7f6] text-[#050d25] font-semibold"
                            : "text-[#869397] hover:text-white"
                            }`}
                        >
                          QRIS
                        </button>
                        <button
                          type="button"
                          onClick={() => setMethodFilter("va")}
                          className={`px-3 py-1 rounded-md transition-colors ${methodFilter === "va"
                            ? "bg-[#4cd7f6] text-[#050d25] font-semibold"
                            : "text-[#869397] hover:text-white"
                            }`}
                        >
                          Virtual Account
                        </button>
                      </div>
                    </div>

                    {/* Payment Channel List */}
                    <div className="space-y-2.5">
                      {filteredMethods.map((method) => {
                        const isSelected = selectedMethodId === method.id;
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${isSelected
                              ? "border-[#4cd7f6] bg-[#4cd7f6]/10 shadow-[0_0_15px_rgba(76,215,246,0.12)]"
                              : "border-[#1e2847] bg-[#090f23]/60 hover:border-[#2d3a5c] hover:bg-[#090f23]"
                              }`}
                          >
                            <div className="flex items-center gap-3.5 pr-4">
                              <div
                                className={`w-14 h-10 rounded-xl px-2 py-1.5 bg-white flex items-center justify-center shrink-0 border transition-all ${isSelected
                                  ? "border-[#4cd7f6] shadow-[0_0_15px_rgba(76,215,246,0.3)]"
                                  : "border-[#1e2847]"
                                  }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={method.logoUrl}
                                  alt={method.name}
                                  className="max-h-7 max-w-full object-contain"
                                />
                              </div>

                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-sm text-white">
                                    {method.name}
                                  </span>
                                  {method.badge && (
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${method.category === "qris"
                                        ? "bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20"
                                        : "bg-[#1e2847] text-[#869397]"
                                        }`}
                                    >
                                      {method.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#869397] line-clamp-1">
                                  {method.description}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center">
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected
                                  ? "border-[#4cd7f6] bg-[#4cd7f6]"
                                  : "border-[#5a6480]"
                                  }`}
                              >
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#050d25]" />
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ───── RIGHT COLUMN: ORDER SUMMARY & SUBMIT (4 COLS) ───── */}
                <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-6">
                  <div className="rounded-2xl border border-[#1e2847] bg-[#0d1632]/80 backdrop-blur-md p-6 md:p-7 shadow-xl">
                    <h3 className="text-base font-bold text-white mb-4 pb-3 border-b border-[#1e2847]">
                      Ringkasan Pesanan
                    </h3>

                    {/* Plan Info */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-sm font-semibold text-white">{currentPlan.name}</p>
                        <p className="text-xs text-[#869397]">{currentPlan.duration}</p>
                      </div>
                      <span className="text-sm font-mono font-bold text-white">
                        Rp {currentPlan.price.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {/* Method Info */}
                    <div className="flex justify-between items-start mb-6 pb-4 border-b border-[#1e2847] text-xs">
                      <div>
                        <p className="text-[#869397]">Metode Pembayaran:</p>
                        <p className="text-[#4cd7f6] font-medium">{selectedMethod.name}</p>
                      </div>
                      <span className="text-[#4cd7f6] font-mono font-semibold">
                        {currentFee === 0 ? "Rp 0" : `+Rp ${currentFee.toLocaleString("id-ID")}`}
                      </span>
                    </div>

                    {/* Price Calculation */}
                    <div className="space-y-2.5 text-xs mb-6">
                      <div className="flex justify-between text-[#869397]">
                        <span>Subtotal Paket</span>
                        <span className="font-mono text-white">
                          Rp {currentPlan.price.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#869397]">
                        <span>Biaya Admin (Pakasir)</span>
                        <span className="font-mono text-[#4cd7f6] font-medium">
                          {currentFee === 0 ? "Rp 0" : `+Rp ${currentFee.toLocaleString("id-ID")}`}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-[#1e2847] flex justify-between items-baseline">
                        <span className="text-sm font-bold text-white">Total Bayar</span>
                        <div className="text-right">
                          <span className="text-2xl font-black font-mono text-[#4cd7f6]">
                            Rp {totalPayment.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Error Notice */}
                    {errorMsg && (
                      <div className="p-3.5 rounded-xl bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-xs text-[#ffb4ab] mb-4">
                        {errorMsg}
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-gradient-to-r from-[#4cd7f6] via-[#06b6d4] to-[#4edea3] text-[#050d25] font-bold text-base shadow-[0_0_28px_rgba(76,215,246,0.35)] hover:shadow-[0_0_40px_rgba(76,215,246,0.5)] transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Menghubungkan ke Pakasir...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          <span>
                            Bayar Sekarang • Rp {totalPayment.toLocaleString("id-ID")}
                          </span>
                        </>
                      )}
                    </button>

                    {/* Trust Badges */}
                    <div className="mt-6 pt-5 border-t border-[#1e2847]/80 space-y-2 text-[11px] text-[#869397]">

                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-[#4cd7f6] shrink-0" />
                        <span>Pembayaran Resmi & Terverifikasi</span>
                      </div>
                    </div>
                  </div>

                  {/* Feature Checklist Box */}

                </div>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

/* ───────────────────────────────────────────────
   ROOT CHECKOUT EXPORT WITH SUSPENSE
   ─────────────────────────────────────────────── */
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a122a] flex items-center justify-center text-[#4cd7f6]">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="text-sm font-mono">Memuat halaman checkout Pakasir...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
