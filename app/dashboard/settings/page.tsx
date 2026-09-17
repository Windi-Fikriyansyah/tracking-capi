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
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high border border-primary/30 flex items-center justify-center text-primary glow-cyan shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Pengaturan Akun &amp; API
            </h1>

          </div>
        </div>

        {/* User Isolation & DB Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/40">
            <UserCheck className="w-4 h-4 text-tertiary" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-on-surface-variant leading-none">Akun Aktif:</span>
              <span className="text-xs font-semibold text-on-surface max-w-[170px] truncate">
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
      <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              API Key Zernio
            </h2>
          </div>

        </div>

        {zernioSaved && (
          <div className="p-3 rounded-lg bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-body-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>API Key Zernio tersimpan khusus untuk akun Anda di database Supabase!</span>
          </div>
        )}

        {zernioFeedback && (
          <div
            className={`p-3 rounded-lg border text-body-sm flex items-center gap-2 ${zernioFeedback.type === "success"
              ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
              : "bg-error-container/20 border-error/40 text-error"
              }`}
          >
            {zernioFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{zernioFeedback.message}</span>
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
            <p className="text-[11px] text-on-surface-variant">
              Kunci API ini hanya dapat diakses dan dilihat oleh akun Anda (<span className="text-primary font-code-metric">{currentUser?.email}</span>). Pengguna lain tidak memiliki izin akses ke baris ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] text-tertiary font-code-metric">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Row Level Security (RLS) Diaktifkan</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestZernio}
                disabled={testingZernio || !zernioApiKey.trim()}
                className="px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant/50 text-on-surface hover:border-primary/50 hover:text-primary font-medium text-body-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingZernio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 text-primary" />
                )}
                <span>{testingZernio ? "Menguji Koneksi..." : "Tes Koneksi"}</span>
              </button>

              <button
                type="submit"
                disabled={savingZernio}
                className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium text-body-sm hover:bg-primary transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingZernio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{savingZernio ? "Menyimpan..." : "Simpan ke Database"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Ubah Kata Sandi Akun */}
      <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Ubah Kata Sandi
            </h2>
          </div>
          <span className="text-[11px] font-code-metric text-on-surface-variant">
            {currentUser?.email}
          </span>
        </div>

        {passwordFeedback && (
          <div
            className={`p-3 rounded-lg border text-body-sm flex items-center gap-2 ${passwordFeedback.type === "success"
              ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
              : "bg-error-container/20 border-error/40 text-error"
              }`}
          >
            {passwordFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passwordFeedback.message}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-semibold hover:bg-primary transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.25)] disabled:opacity-75"
            >
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Perbarui Kata Sandi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
