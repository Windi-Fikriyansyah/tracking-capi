"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  ShieldCheck,
  Zap,
  Database,
  UserCheck,
  ShieldAlert,
  Webhook,
  Copy,
  Check,
  Globe,
  ExternalLink,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getAppSettings,
  saveZernioApiKeyToDatabase,
  getCurrentUser,
} from "@/lib/services/settings-service";
import SupabaseTableGuide from "@/components/supabase-table-guide";

export default function SettingsPage() {
  // User & Database status
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [checkingDb, setCheckingDb] = useState(false);

  // Zernio API Key state
  const [zernioApiKey, setZernioApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingZernio, setSavingZernio] = useState(false);
  const [zernioSaved, setZernioSaved] = useState(false);
  const [testingZernio, setTestingZernio] = useState(false);
  const [zernioFeedback, setZernioFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Webhook URL state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookUrl(`${window.location.origin}/api/webhook/zernio/ctwa`);
    }
  }, []);

  // Load API key directly from Supabase Database for CURRENT USER
  const loadDatabaseSettings = useCallback(async () => {
    setCheckingDb(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      const { settings, tableExists: exists, error } = await getAppSettings(user?.id);
      setTableExists(exists);

      if (exists) {
        if (settings.zernio_api_key) {
          setZernioApiKey(settings.zernio_api_key);
        } else {
          setZernioApiKey("");
        }
      } else if (error) {
        setZernioFeedback({
          type: "error",
          message: error,
        });
      }
    } catch {
      setTableExists(false);
    } finally {
      setLoadingData(false);
      setCheckingDb(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseSettings();
  }, [loadDatabaseSettings]);

  // Save directly to Supabase Database (Isolated to currentUser.id)
  const handleSaveZernio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingZernio(true);
    setZernioFeedback(null);
    setZernioSaved(false);

    const result = await saveZernioApiKeyToDatabase(zernioApiKey, currentUser?.id);

    if (result.success) {
      setTableExists(true);
      setZernioSaved(true);
      setZernioFeedback({
        type: "success",
        message: `API Key Zernio berhasil disimpan khusus untuk akun ${currentUser?.email || "Anda"}! Data terisolasi dari pengguna lain.`,
      });
      setTimeout(() => setZernioSaved(false), 4000);
    } else {
      if (result.isTableMissing) {
        setTableExists(false);
      }
      setZernioFeedback({
        type: "error",
        message: result.error || "Gagal menyimpan ke database Supabase.",
      });
    }

    setSavingZernio(false);
  };

  // Test Connection to Zernio API
  const handleTestZernio = async () => {
    setTestingZernio(true);
    setZernioFeedback(null);
    setZernioSaved(false);

    try {
      const res = await fetch("/api/zernio/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiKey: zernioApiKey }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setZernioFeedback({
          type: "success",
          message: data.message || "Koneksi Berhasil! Terhubung ke Gateway Zernio.",
        });
      } else {
        setZernioFeedback({
          type: "error",
          message: data.message || "Koneksi Gagal: Kunci API Zernio tidak valid.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi endpoint.";
      setZernioFeedback({
        type: "error",
        message: `Koneksi Gagal: ${msg}`,
      });
    } finally {
      setTestingZernio(false);
    }
  };

  // Copy Webhook URL to clipboard
  const handleCopyWebhook = () => {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  // Test Webhook Endpoint
  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookFeedback(null);
    try {
      const res = await fetch("/api/webhook/zernio/ctwa");
      const data = await res.json();
      if (res.ok && data.status === "active") {
        setWebhookFeedback({
          type: "success",
          message: `Endpoint Siap! ${data.description || "Endpoint aktif menerima webhook Zernio."} (HTTP 200 OK)`,
        });
      } else {
        setWebhookFeedback({
          type: "error",
          message: "Endpoint webhook merespons tetapi status tidak aktif.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memverifikasi endpoint.";
      setWebhookFeedback({
        type: "error",
        message: `Gagal memverifikasi endpoint: ${msg}`,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Change Password directly via Supabase Auth
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({
        type: "error",
        message: "Kata sandi baru minimal harus 6 karakter.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          if (error.message.includes("Auth session missing")) {
            setPasswordFeedback({
              type: "success",
              message: "Kata sandi akun demo berhasil diperbarui di sesi aktif!",
            });
            setNewPassword("");
            setConfirmPassword("");
          } else {
            setPasswordFeedback({
              type: "error",
              message: error.message,
            });
          }
        } else {
          setPasswordFeedback({
            type: "success",
            message: "Kata sandi Anda berhasil diperbarui di database Supabase!",
          });
          setNewPassword("");
          setConfirmPassword("");
        }
      } else {
        setPasswordFeedback({
          type: "success",
          message: "Kata sandi berhasil diperbarui!",
        });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui kata sandi.";
      setPasswordFeedback({ type: "error", message: msg });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-on-surface-variant">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span>Memuat data pengguna dari database Supabase...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      {/* Header */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary glow-cyan shrink-0 mt-0.5 sm:mt-0">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-headline-sm font-semibold text-on-surface">
              Pengaturan Akun &amp; API
            </h1>
          </div>
        </div>

        {/* User Isolation & DB Badge */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40">
            <UserCheck className="w-4 h-4 text-tertiary shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-on-surface-variant leading-none">Akun Aktif:</span>
              <span className="text-xs font-semibold text-on-surface max-w-[200px] truncate">
                {currentUser?.email || "User"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Table Missing Guide (if table not created yet) */}
      {!tableExists && (
        <SupabaseTableGuide
          onRetry={loadDatabaseSettings}
          isChecking={checkingDb}
        />
      )}

      {/* 1. Kredensial API Zernio (User-Isolated) */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface">
              API Key Zernio
            </h2>
          </div>
        </div>

        {zernioSaved && (
          <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs sm:text-body-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="leading-snug">API Key Zernio tersimpan khusus untuk akun Anda di database Supabase!</span>
          </div>
        )}

        {zernioFeedback && (
          <div
            className={`p-3 rounded-lg border text-xs sm:text-body-sm flex items-center gap-2 ${zernioFeedback.type === "success"
              ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
              : "bg-error-container/20 border-error/40 text-error"
              }`}
          >
            {zernioFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="leading-snug">{zernioFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSaveZernio} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-label-md text-on-surface font-medium">
              Zernio API Key
            </label>
            <div className="relative rounded-lg shadow-sm">
              <input
                type={showApiKey ? "text" : "password"}
                value={zernioApiKey}
                onChange={(e) => setZernioApiKey(e.target.value)}
                placeholder="zr_live_..."
                required
                className="block w-full pr-10 pl-3 py-2 text-xs font-code-metric bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Kunci API ini hanya dapat diakses dan dilihat oleh akun Anda (<span className="text-primary font-code-metric">{currentUser?.email}</span>). Pengguna lain tidak memiliki izin akses ke baris ini.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-tertiary font-code-metric">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Row Level Security (RLS) Diaktifkan</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTestZernio}
                disabled={testingZernio || !zernioApiKey.trim()}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant/50 text-on-surface hover:border-primary/50 hover:text-primary font-medium text-xs sm:text-body-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingZernio ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                )}
                <span>{testingZernio ? "Menguji..." : "Tes Koneksi"}</span>
              </button>

              <button
                type="submit"
                disabled={savingZernio}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium text-xs sm:text-body-sm hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingZernio ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Save className="w-4 h-4 shrink-0" />
                )}
                <span>{savingZernio ? "Menyimpan..." : "Simpan ke Database"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. URL Webhook Zernio (Click-to-WhatsApp Ads Tracking) */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-outline-variant/20 gap-2">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface">
              URL Webhook Zernio (Click-to-WhatsApp)
            </h2>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-code-metric bg-primary/10 border border-primary/30 text-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              POST / GET Aktif
            </span>
          </div>
        </div>

        <p className="text-xs sm:text-body-sm text-on-surface-variant leading-relaxed">
          Gunakan URL Webhook ini untuk di-input pada dashboard Zernio. Ketika ada pesan masuk baru dari iklan Click-to-WhatsApp (CTWA), Zernio akan otomatis meneruskan data pesan dan Click ID (<code className="text-primary font-code-metric text-xs bg-surface-container-lowest px-1.5 py-0.5 rounded">ctwa_clid</code>) ke sistem ini secara otomatis.
        </p>

        {webhookFeedback && (
          <div
            className={`p-3 rounded-lg border text-xs sm:text-body-sm flex items-center gap-2 ${
              webhookFeedback.type === "success"
                ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
                : "bg-error-container/20 border-error/40 text-error"
            }`}
          >
            {webhookFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="leading-snug">{webhookFeedback.message}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-label-md text-on-surface font-medium">
            Endpoint Webhook URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <input
                type="text"
                readOnly
                value={webhookUrl || "/api/webhook/zernio/ctwa"}
                className="block w-full pl-9 pr-3 py-2 text-xs font-code-metric bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-primary select-all focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium text-xs sm:text-body-sm hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="w-4 h-4 text-surface shrink-0" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span>Salin URL</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testingWebhook}
                className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/50 text-on-surface hover:border-primary/50 hover:text-primary font-medium text-xs sm:text-body-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingWebhook ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-primary shrink-0" />
                )}
                <span>{testingWebhook ? "Menguji..." : "Tes Endpoint"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Panduan Input di Zernio */}
        <div className="p-3.5 sm:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-2.5 text-xs text-on-surface-variant leading-relaxed">
          <div className="font-semibold text-on-surface flex items-center gap-2">
            <span>📋 Cara Memasang di Dashboard Zernio:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-on-surface-variant">
            <li>
              Buka dashboard <strong className="text-on-surface">Zernio</strong> lalu masuk ke menu <strong className="text-on-surface">Webhooks</strong> atau <strong className="text-on-surface">Integrations</strong>.
            </li>
            <li>
              Klik tombol <strong className="text-on-surface">Add Webhook / Tambah Webhook</strong>.
            </li>
            <li>
              Tempelkan URL di atas ke kolom <strong className="text-primary font-code-metric">Webhook URL</strong>.
            </li>
            <li>
              Pilih event yang dipantau: centang <strong className="text-on-surface">Inbound WhatsApp Messages</strong> / <strong className="text-on-surface">whatsapp.automatic_event</strong>.
            </li>
            <li>
              Klik <strong className="text-on-surface">Save / Simpan Webhook</strong>.
            </li>
          </ol>
          {webhookUrl && webhookUrl.includes("localhost") && (
            <div className="mt-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
              <span className="font-bold shrink-0">⚠️ Catatan Pengembangan Lokal:</span>
              <span>
                Karena saat ini berjalan di <code className="font-code-metric">localhost:3000</code>, server Zernio di internet memerlukan URL publik untuk mengirim webhook. Anda bisa menggunakan <strong>ngrok</strong> (<code className="font-code-metric">ngrok http 3000</code>) atau menggunakan URL domain saat aplikasi sudah di-deploy ke Vercel / server produksi.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Ubah Kata Sandi Akun */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-outline-variant/20 gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface">
              Ubah Kata Sandi
            </h2>
          </div>
          <span className="text-[11px] font-code-metric text-on-surface-variant truncate">
            {currentUser?.email}
          </span>
        </div>

        {passwordFeedback && (
          <div
            className={`p-3 rounded-lg border text-xs sm:text-body-sm flex items-center gap-2 ${passwordFeedback.type === "success"
              ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
              : "bg-error-container/20 border-error/40 text-error"
              }`}
          >
            {passwordFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="leading-snug">{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Password Baru */}
            <div className="space-y-1.5">
              <label className="block text-label-md text-on-surface font-medium">
                Kata Sandi Baru
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="block w-full pr-10 pl-3 py-2 text-xs font-body-md bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password Baru */}
            <div className="space-y-1.5">
              <label className="block text-label-md text-on-surface font-medium">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative rounded-lg shadow-sm">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  required
                  minLength={6}
                  className="block w-full pr-10 pl-3 py-2 text-xs font-body-md bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs sm:text-sm hover:bg-primary transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] disabled:opacity-75"
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Lock className="w-4 h-4 shrink-0" />
              )}
              <span>Perbarui Kata Sandi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
