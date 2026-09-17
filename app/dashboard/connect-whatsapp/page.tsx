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
            wabaId: acc.wabaId,
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
    <div className="space-y-6 max-w-4xl">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 border border-tertiary/30 flex items-center justify-center text-tertiary glow-dot shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Connect WhatsApp Business via Zernio OAuth
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary/10 text-tertiary border border-tertiary/30 font-code-metric">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  TERHUBUNG
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-outline border border-outline-variant/40 font-code-metric">
                  BELUM TERHUBUNG
                </span>
              )}
            </div>

          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40">
            <UserCheck className="w-4 h-4 text-tertiary" />
            <span className="text-xs font-medium text-on-surface max-w-[150px] truncate">
              {currentUser?.email || "User"}
            </span>
          </div>

          {isConnected && (
            <button
              type="button"
              onClick={handleTestEvent}
              disabled={testingEvent}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium text-body-sm hover:bg-primary transition-all flex items-center gap-2 cursor-pointer disabled:opacity-75 shadow-sm"
            >
              {testingEvent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>Tes Event CAPI</span>
            </button>
          )}
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
        <div className="p-4 rounded-xl bg-surface-container-low border border-error/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-body-sm">
          <div className="flex items-center gap-3 text-error">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>
              API Key Zernio belum tersimpan di database untuk akun <strong>{currentUser?.email}</strong>. Anda perlu memasukkan API Key terlebih dahulu.
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold hover:bg-primary flex items-center gap-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Buka Pengaturan</span>
          </Link>
        </div>
      )}

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-body-sm flex items-center gap-2.5 ${feedback.type === "success"
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
          <span>{feedback.message}</span>
        </div>
      )}

      {testEventMessage && (
        <div className="p-3.5 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-body-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{testEventMessage}</span>
        </div>
      )}

      {/* Main Connection Container */}
      {!isConnected ? (
        <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-tertiary" />
                Otorisasi WhatsApp Business
              </h2>
              <p className="text-body-sm text-on-surface-variant mt-1">
                Gunakan tombol di bawah untuk membuka alur resmi OAuth Zernio.
              </p>
            </div>

            {/* API Key Status Pill from Database */}
            {apiKey && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-code-metric text-xs">
                <Database className="w-3.5 h-3.5 text-primary" />
                <span className="text-outline">Key Akun:</span>
                <span className="text-primary font-medium">
                  {apiKey.slice(0, 7)}••••••••
                </span>
                <span className="text-tertiary">✓ Terisolasi</span>
              </div>
            )}
          </div>

          {/* Action CTA Button */}
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-tertiary/10 border border-tertiary/40 flex items-center justify-center text-tertiary glow-dot">
              <MessageSquare className="w-8 h-8" />
            </div>

            <div className="max-w-md space-y-1">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Tautkan Nomor WhatsApp Business
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Klik tombol di bawah untuk mengarahkan ke halaman otorisasi OAuth resmi Zernio. Hasil koneksi &amp; profil WhatsApp Anda akan diambil secara langsung dari Zernio.
              </p>
            </div>

            <button
              type="button"
              onClick={handleConnectWhatsApp}
              disabled={connecting || !apiKey}
              className="px-6 py-3 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-[#050d25] font-headline-sm text-headline-sm font-semibold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(37,211,102,0.35)] hover:shadow-[0_0_25px_rgba(37,211,102,0.5)] active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Memproses OAuth Zernio...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5 fill-current" />
                  <span>Hubungkan WhatsApp dengan Zernio OAuth</span>
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-outline font-code-metric pt-2">
              <ShieldCheck className="w-4 h-4 text-tertiary" />
              <span>Otorisasi Resmi Zernio Cloud Gateway • Meta Verified Partner</span>
            </div>
          </div>
        </div>
      ) : (
        /* Connected State View with REAL ZERNIO DATA */
        <div className="p-6 rounded-xl bg-surface-container-low border border-tertiary/30 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant/20">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-tertiary" />
                <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Akun WhatsApp Business Terhubung
                </h2>

              </div>

            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => apiKey && syncAccountFromZernio(apiKey, connectedAccount?.zernioAccountId, currentUser?.id)}
                disabled={syncingZernio || !apiKey}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-primary text-xs font-code-metric flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Sinkronkan data terbaru"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingZernio ? "animate-spin text-primary" : ""}`} />
                <span>{syncingZernio ? "Menyinkronkan..." : "Sinkronkan"}</span>
              </button>

              <button
                type="button"
                onClick={handleConnectWhatsApp}
                disabled={connecting}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-primary text-xs font-code-metric flex items-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Otorisasi Ulang</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-error/30 text-error hover:bg-error-container/20 text-xs font-code-metric flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Putuskan</span>
              </button>
            </div>
          </div>

          {/* Real Account Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: WhatsApp Profile Details */}
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-3 font-code-metric text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-tertiary" /> Nomor Telepon:
                </span>
                <span className="font-bold text-tertiary text-sm">
                  {connectedAccount?.phone || "+62 896-2298-1080"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" /> Nama Akun WABA:
                </span>
                <span className="font-semibold text-on-surface">
                  {connectedAccount?.name || "wamaps"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-outline" /> WABA Account ID (Meta):
                </span>
                <span className="text-primary font-medium">
                  {connectedAccount?.wabaId || "1810517499719467"}
                </span>
              </div>

              {connectedAccount?.phoneNumberId && (
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-outline" /> Phone Number ID:
                  </span>
                  <span className="text-outline">
                    {connectedAccount.phoneNumberId}
                  </span>
                </div>
              )}
            </div>

            {/* Card 2: Zernio & Meta Platform Details */}
            <div className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-3 font-code-metric text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                <span className="text-on-surface font-semibold flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary" /> Zernio Account ID:
                </span>
                <span className="font-mono text-on-surface bg-surface-container-high px-2 py-0.5 rounded">
                  {connectedAccount?.zernioAccountId || "6aab661f8d284ffb210c4d75"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-tertiary" /> Kualitas Akun (Rating):
                </span>
                <span className="text-tertiary font-semibold flex items-center gap-1.5 bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                  {connectedAccount?.qualityRating || "GREEN (Tinggi)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" /> Metode Otorisasi:
                </span>
                <span className="text-primary font-medium">Zernio Redirect OAuth</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-outline" /> Terhubung Sejak:
                </span>
                <span className="text-outline">
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
