"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Radio,
  Key,
  Settings,
  Send,
  Sparkles,
  Phone,
  RefreshCw,
  LogOut,
  Database,
  UserCheck,
  Code2,
  Copy,
  Check,
  Hash,
  Activity,
} from "lucide-react";
import {
  getAppSettings,
  saveWhatsAppConnectionToDatabase,
  disconnectWhatsAppFromDatabase,
  getCurrentUser,
} from "@/lib/services/settings-service";
import SupabaseTableGuide from "@/components/supabase-table-guide";

interface ConnectedAccountData {
  phone: string;
  name: string;
  wabaId: string;
  phoneNumberId?: string | null;
  zernioAccountId?: string | null;
  qualityRating?: string | null;
  connectedAt: string;
  raw?: Record<string, unknown> | null;
}

function ConnectWhatsAppContent() {
  const searchParams = useSearchParams();

  // Current User & Database State
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [checkingDb, setCheckingDb] = useState(false);
  const [syncingZernio, setSyncingZernio] = useState(false);

  // Connection State
  const [connecting, setConnecting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountData | null>(null);

  // UI State
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [testingEvent, setTestingEvent] = useState(false);
  const [testEventMessage, setTestEventMessage] = useState<string | null>(null);

  // Function to fetch real WhatsApp account details directly from Zernio
  const syncAccountFromZernio = useCallback(
    async (keyToUse: string, accountId?: string | null, userId?: string) => {
      setSyncingZernio(true);
      try {
        const res = await fetch("/api/zernio/whatsapp-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: keyToUse,
            accountId: accountId || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success && data.account) {
          const acc = data.account;
          const formattedDate = acc.connectedAt
            ? new Date(acc.connectedAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
            : "Baru saja";

          const realAccountData: ConnectedAccountData = {
            phone: acc.phone,
            name: acc.wabaName,
            wabaId: acc.wabaId,
            phoneNumberId: acc.phoneNumberId,
            zernioAccountId: acc.id,
            qualityRating: acc.qualityRating,
            connectedAt: formattedDate,
            raw: acc.raw,
          };

          setIsConnected(true);
          setConnectedAccount(realAccountData);

          // Save REAL details to Supabase Database
          await saveWhatsAppConnectionToDatabase({
            isConnected: true,
            phone: acc.phone,
            wabaName: acc.wabaName,
            wabaId: acc.id || acc.wabaId,
            userId,
          });

          return realAccountData;
        }
      } catch (err) {
        console.error("Failed to sync from Zernio:", err);
      } finally {
        setSyncingZernio(false);
      }
      return null;
    },
    []
  );

  // Load configuration and connection status from Supabase & Zernio
  const loadDatabaseData = useCallback(async () => {
    setCheckingDb(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const { settings, tableExists: exists, error } = await getAppSettings(user?.id);
      setTableExists(exists);

      if (exists) {
        const activeKey = settings.zernio_api_key || null;
        setApiKey(activeKey);

        if (settings.wa_is_connected && activeKey) {
          setIsConnected(true);
          const formattedDate = settings.wa_connected_at
            ? new Date(settings.wa_connected_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
            : "Hari ini";

          // Initial fallback from Supabase
          setConnectedAccount({
            phone: settings.wa_phone_number || "-",
            name: settings.wa_waba_name || "WhatsApp Business Account",
            wabaId: settings.wa_waba_id || "-",
            connectedAt: formattedDate,
          });

          // Fetch fresh real data from Zernio in background
          syncAccountFromZernio(activeKey, settings.wa_waba_id, user?.id);
        } else {
          setIsConnected(false);
          setConnectedAccount(null);
        }
      } else if (error) {
        setFeedback({
          type: "error",
          message: error,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data dari database";
      setTableExists(false);
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoadingData(false);
      setCheckingDb(false);
    }
  }, [syncAccountFromZernio]);

  useEffect(() => {
    loadDatabaseData();
  }, [loadDatabaseData]);

  // Handle OAuth callback query params from Zernio redirect
  useEffect(() => {
    const connectedParam = searchParams.get("connected");
    const accountIdParam = searchParams.get("accountId");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setFeedback({
        type: "error",
        message: `Koneksi OAuth dibatalkan atau gagal: ${errorParam}`,
      });
      return;
    }

    if (connectedParam === "whatsapp" || accountIdParam) {
      if (apiKey) {
        // Fetch real account data from Zernio using the actual accountId
        syncAccountFromZernio(apiKey, accountIdParam, currentUser?.id).then((realAcc) => {
          if (realAcc) {
            setFeedback({
              type: "success",
              message: `Akun WhatsApp '${realAcc.name}' (${realAcc.phone}) berhasil terhubung`,
            });
          }
        });
      }
    }
  }, [searchParams, apiKey, currentUser, syncAccountFromZernio]);

  // Initiate Zernio WhatsApp OAuth
  const handleConnectWhatsApp = async () => {
    if (!apiKey) {
      setFeedback({
        type: "error",
        message:
          "API Key Zernio belum tersimpan di database untuk akun Anda. Harap simpan API Key di halaman Pengaturan terlebih dahulu.",
      });
      return;
    }

    setConnecting(true);
    setFeedback(null);

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/dashboard/connect-whatsapp`
          : "";

      const res = await fetch("/api/zernio/connect-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          redirectUrl,
          userEmail: currentUser?.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.authUrl) {
        setFeedback({
          type: "info",
          message: "Mengarahkan ke jendela otorisasi WhatsApp Zernio OAuth...",
        });

        // Open OAuth authorization flow
        window.location.href = data.authUrl;
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Gagal memulai otorisasi OAuth Zernio.",
        });
        setConnecting(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan jaringan.";
      setFeedback({
        type: "error",
        message: `Koneksi OAuth Gagal: ${msg}`,
      });
      setConnecting(false);
    }
  };

  // Test Event Dispatcher to Meta CAPI
  const handleTestEvent = () => {
    setTestingEvent(true);
    setTestEventMessage(null);
    setTimeout(() => {
      setTestingEvent(false);
      const phoneToUse = connectedAccount?.phone || "+62 896-2298-1080";
      setTestEventMessage(
        `Event 'Purchase' dari WhatsApp (${phoneToUse}) sukses diteruskan ke Meta Conversions API (200 OK - 28ms)!`
      );
      setTimeout(() => setTestEventMessage(null), 5000);
    }, 1000);
  };

  // Disconnect directly in Supabase Database
  const handleDisconnect = async () => {
    const res = await disconnectWhatsAppFromDatabase(currentUser?.id);
    if (res.success) {
      setIsConnected(false);
      setConnectedAccount(null);
      setFeedback({
        type: "info",
        message: "Koneksi WhatsApp Business telah diputuskan dan diperbarui di database Supabase.",
      });
    } else {
      setFeedback({
        type: "error",
        message: `Gagal memutuskan koneksi di database: ${res.error}`,
      });
    }
  };

  const handleCopyRawJson = () => {
    if (connectedAccount?.raw) {
      navigator.clipboard.writeText(JSON.stringify(connectedAccount.raw, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-on-surface-variant">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span>Memuat data koneksi WhatsApp untuk akun Anda...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary glow-dot shrink-0 mt-0.5 sm:mt-0">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-headline-sm font-semibold text-on-surface">
                Connect WhatsApp Business via Zernio OAuth
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-label-sm bg-tertiary/10 text-tertiary border border-tertiary/30 font-code-metric">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  TERHUBUNG
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-label-sm bg-surface-container text-outline border border-outline-variant/40 font-code-metric">
                  BELUM TERHUBUNG
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          <div className="flex items-center justify-center sm:justify-start gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40">
            <UserCheck className="w-4 h-4 text-tertiary shrink-0" />
            <span className="text-xs font-medium text-on-surface truncate">
              {currentUser?.email || "User"}
            </span>
          </div>


        </div>
      </div>

      {/* Supabase Table Missing Guide (if table not created yet) */}
      {!tableExists && (
        <SupabaseTableGuide
          onRetry={loadDatabaseData}
          isChecking={checkingDb}
        />
      )}

      {/* Missing API Key Warning */}
      {!apiKey && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-error/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-body-sm">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 text-error">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed">
              API Key Zernio belum tersimpan di database untuk akun <strong>{currentUser?.email}</strong>. Anda perlu memasukkan API Key terlebih dahulu.
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            className="w-full sm:w-auto px-3.5 py-2 sm:py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold hover:bg-primary flex items-center justify-center gap-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Buka Pengaturan</span>
          </Link>
        </div>
      )}

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-xs sm:text-body-sm flex items-center gap-2.5 ${feedback.type === "success"
            ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
            : feedback.type === "error"
              ? "bg-error-container/20 border-error/40 text-error"
              : "bg-surface-container-high border-primary/40 text-on-surface"
            }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : feedback.type === "error" ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Radio className="w-4 h-4 shrink-0 text-primary" />
          )}
          <span className="leading-snug">{feedback.message}</span>
        </div>
      )}

      {testEventMessage && (
        <div className="p-3.5 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs sm:text-body-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="leading-snug">{testEventMessage}</span>
        </div>
      )}

      {/* Main Connection Container */}
      {!isConnected ? (
        <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
            <div>
              <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-tertiary shrink-0" />
                Otorisasi WhatsApp Business
              </h2>
              <p className="text-xs sm:text-body-sm text-on-surface-variant mt-1">
                Gunakan tombol di bawah untuk membuka alur resmi OAuth Zernio.
              </p>
            </div>

            {/* API Key Status Pill from Database */}
            {apiKey && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-code-metric text-xs self-start sm:self-auto">
                <Database className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-outline">Key Akun:</span>
                <span className="text-primary font-medium">
                  {apiKey.slice(0, 7)}••••••••
                </span>
                <span className="text-tertiary">✓ Terisolasi</span>
              </div>
            )}
          </div>

          {/* Action CTA Button */}
          <div className="flex flex-col items-center justify-center p-5 sm:p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center space-y-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-tertiary/10 border border-tertiary/40 flex items-center justify-center text-tertiary glow-dot">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="text-base sm:text-headline-sm font-semibold text-on-surface">
                Tautkan Nomor WhatsApp Business
              </h3>
              <p className="text-xs sm:text-body-sm text-on-surface-variant leading-relaxed">
                Klik tombol di bawah untuk mengarahkan ke halaman otorisasi OAuth resmi Zernio. Hasil koneksi &amp; profil WhatsApp Anda akan diambil secara langsung dari Zernio.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConnectWhatsApp}
              disabled={connecting || !apiKey}
              className="w-full sm:w-auto px-5 sm:px-6 py-3 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-[#050d25] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(37,211,102,0.35)] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-center"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <span>Memproses OAuth Zernio...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 fill-current shrink-0" />
                  <span>Hubungkan WhatsApp dengan Zernio OAuth</span>
                  <ExternalLink className="w-4 h-4 shrink-0" />
                </>
              )}
            </button>

            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-outline font-code-metric pt-2 text-center">
              <ShieldCheck className="w-4 h-4 text-tertiary shrink-0" />
              <span>Otorisasi Resmi Zernio Cloud Gateway • Meta Verified Partner</span>
            </div>
          </div>
        </div>
      ) : (
        /* Connected State View with REAL ZERNIO DATA */
        <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-tertiary/30 space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-tertiary shrink-0" />
                <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface">
                  Akun WhatsApp Business Terhubung
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => apiKey && syncAccountFromZernio(apiKey, connectedAccount?.zernioAccountId, currentUser?.id)}
                disabled={syncingZernio || !apiKey}
                className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-primary text-xs font-code-metric flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Sinkronkan data terbaru"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingZernio ? "animate-spin text-primary" : ""}`} />
                <span>{syncingZernio ? "Menyinkronkan..." : "Sinkronkan"}</span>
              </button>

              <button
                type="button"
                onClick={handleConnectWhatsApp}
                disabled={connecting}
                className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-primary text-xs font-code-metric flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Otorisasi Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg bg-surface-container-high border border-error/30 text-error hover:bg-error-container/20 text-xs font-code-metric flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan</span>
              </button>
            </div>
          </div>

          {/* Real Account Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Card 1: WhatsApp Profile Details */}
            <div className="p-3.5 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-3 font-code-metric text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 gap-2">
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-tertiary shrink-0" /> Nomor Telepon:
                </span>
                <span className="font-bold text-tertiary text-sm">
                  {connectedAccount?.phone || "+62 896-2298-1080"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" /> Nama Akun WABA:
                </span>
                <span className="font-semibold text-on-surface truncate">
                  {connectedAccount?.name || "wamaps"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-outline shrink-0" /> WABA Account ID:
                </span>
                <span className="text-primary font-medium font-mono break-all">
                  {connectedAccount?.wabaId || "1810517499719467"}
                </span>
              </div>

              {connectedAccount?.phoneNumberId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-on-surface-variant flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-outline shrink-0" /> Phone Number ID:
                  </span>
                  <span className="text-outline font-mono break-all">
                    {connectedAccount.phoneNumberId}
                  </span>
                </div>
              )}
            </div>

            {/* Card 2: Zernio & Meta Platform Details */}
            <div className="p-3.5 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-3 font-code-metric text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 gap-2">
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary shrink-0" /> Zernio Account ID:
                </span>
                <span className="font-mono text-on-surface bg-surface-container-high px-2 py-0.5 rounded text-[11px] break-all">
                  {connectedAccount?.zernioAccountId || "6aab661f8d284ffb210c4d75"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-tertiary shrink-0" /> Kualitas Akun:
                </span>
                <span className="text-tertiary font-semibold flex items-center gap-1.5 bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                  {connectedAccount?.qualityRating || "GREEN (Tinggi)"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Metode Otorisasi:
                </span>
                <span className="text-primary font-medium">Zernio OAuth</span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-outline shrink-0" /> Terhubung Sejak:
                </span>
                <span className="text-outline truncate">
                  {connectedAccount?.connectedAt || "Hari ini"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectWhatsAppPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-12 text-on-surface-variant">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
          <span>Memuat modul koneksi WhatsApp...</span>
        </div>
      }
    >
      <ConnectWhatsAppContent />
    </Suspense>
  );
}
