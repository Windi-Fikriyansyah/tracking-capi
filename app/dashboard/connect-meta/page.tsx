"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Share2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Radio,
  Key,
  Send,
  Sparkles,
  RefreshCw,
  LogOut,
  UserCheck,
  Code2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  getAppSettings,
  saveMetaConnectionToDatabase,
  disconnectMetaFromDatabase,
  getCurrentUser,
} from "@/lib/services/settings-service";

function ConnectMetaContent() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Form State
  const [pixelId, setPixelId] = useState("");
  const [pixelName, setPixelName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Status & Testing State
  const [isConnected, setIsConnected] = useState(false);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Direct Test Event State
  const [testEventPhone, setTestEventPhone] = useState("081234567890");
  const [testEventName, setTestEventName] = useState("Lead");
  const [sendingTestEvent, setSendingTestEvent] = useState(false);
  const [testEventResult, setTestEventResult] = useState<string | null>(null);

  // Load existing settings
  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        const { settings } = await getAppSettings(user.id);
        if (settings) {
          setPixelId(settings.meta_pixel_id || "");
          setPixelName(settings.meta_pixel_name || "");
          setAccessToken(settings.meta_access_token || "");
          setTestCode(settings.meta_test_code || "");
          setIsConnected(Boolean(settings.is_meta_connected));
          setConnectedAt(settings.meta_connected_at || null);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data pengaturan";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Test Meta Pixel Connection via Graph API
  const handleTestConnection = async () => {
    if (!pixelId.trim()) {
      setFeedback({ type: "error", message: "Masukkan Pixel / Dataset ID terlebih dahulu." });
      return;
    }
    if (!accessToken.trim()) {
      setFeedback({ type: "error", message: "Masukkan Meta CAPI Access Token terlebih dahulu." });
      return;
    }

    setTestingConnection(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/meta/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: pixelId.trim(),
          accessToken: accessToken.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const pName = data.pixel?.name || "Meta Pixel";
        setPixelName(pName);
        setFeedback({
          type: "success",
          message: `Koneksi Berhasil! Terhubung ke Pixel: "${pName}" (ID: ${data.pixel?.id}). Token valid untuk Conversions API.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Gagal menguji koneksi Pixel. Periksa kembali ID dan Token Anda.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Terjadi kesalahan jaringan saat menguji koneksi Meta Graph API.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixelId.trim() || !accessToken.trim()) {
      setFeedback({
        type: "error",
        message: "Pixel ID dan Access Token wajib diisi untuk menghubungkan Meta Ads.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await saveMetaConnectionToDatabase({
        pixelId: pixelId.trim(),
        pixelName: pixelName.trim() || undefined,
        accessToken: accessToken.trim(),
        testCode: testCode.trim() || undefined,
        isConnected: true,
        userId: currentUser?.id,
      });

      if (res.success) {
        setIsConnected(true);
        setConnectedAt(new Date().toISOString());
        setFeedback({
          type: "success",
          message: "Konfigurasi Meta Ads berhasil disimpan! Nomor WhatsApp organik kini dapat mengirim event ke Pixel ini.",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan konfigurasi ke database.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan penyimpanan.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Disconnect Meta
  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan integrasi Meta Ads? Leads organik tidak akan dapat mengirim event ke Pixel sampai dihubungkan kembali.")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await disconnectMetaFromDatabase(currentUser?.id);
      if (res.success) {
        setIsConnected(false);
        setConnectedAt(null);
        setFeedback({
          type: "info",
          message: "Koneksi Meta Ads telah diputuskan.",
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Gagal memutuskan koneksi." });
      }
    } catch {
      setFeedback({ type: "error", message: "Gagal memutuskan koneksi." });
    } finally {
      setDisconnecting(false);
    }
  };

  // Send Direct Test Event to Meta
  const handleSendTestEvent = async () => {
    if (!pixelId.trim() || !accessToken.trim()) {
      setTestEventResult("Error: Pixel ID dan Access Token belum diisi.");
      return;
    }

    setSendingTestEvent(true);
    setTestEventResult(null);

    try {
      const res = await fetch("/api/meta/conversions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pixelId: pixelId.trim(),
          accessToken: accessToken.trim(),
          testCode: testCode.trim() || undefined,
          eventName: testEventName,
          phone: testEventPhone,
          name: "Test Prospect",
          value: testEventName === "Purchase" ? 150000 : undefined,
          actionSource: "chat",
          userId: currentUser?.id,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTestEventResult(
          `SUKSES: Event '${testEventName}' berhasil dikirim ke Meta Pixel ${pixelId}! (Trace ID: ${data.traceId || data.eventId || "OK"}). Cek tab 'Uji Peristiwa' (Test Events) di Meta Events Manager.`
        );
      } else {
        setTestEventResult(`GAGAL: ${data.error || "Event ditolak oleh Meta Graph API."}`);
      }
    } catch {
      setTestEventResult("GAGAL: Terjadi gangguan jaringan.");
    } finally {
      setSendingTestEvent(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 md:p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary glow-cyan">
              <Share2 className="w-5 h-5" />
            </div>
            <h1 className="text-title-lg md:text-headline-sm font-bold text-on-surface">
              Connect Meta Ads (CAPI)
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                isConnected
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "bg-surface-container-high text-on-surface-variant border-outline-variant/40"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-primary glow-dot animate-pulse" : "bg-outline"
                }`}
              />
              {isConnected ? "Meta Ads Terhubung" : "Belum Terhubung"}
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant max-w-3xl pt-1">
            Kirim sinyal konversi prospek WhatsApp Organik (tanpa CTWA CLID) secara real-time langsung ke Meta Pixel / Dataset pilihan Anda menggunakan <strong>Conversions API (Graph API v19.0)</strong> dengan standard Advanced Matching SHA-256.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loadingData}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container border border-outline-variant/40 text-on-surface text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin text-primary" : ""}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-body-sm ${
            feedback.type === "success"
              ? "bg-primary/10 border-primary/40 text-primary"
              : feedback.type === "error"
              ? "bg-error/10 border-error/40 text-error"
              : "bg-tertiary/10 border-tertiary/40 text-tertiary"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{feedback.message}</div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline opacity-80 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Grid: Form & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Configuration */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div className="flex items-center gap-2.5">
                <Radio className="w-5 h-5 text-primary" />
                <h2 className="font-headline-sm text-body-lg font-semibold text-on-surface">
                  Konfigurasi Pixel & CAPI Token
                </h2>
              </div>
              <span className="text-xs font-code-metric text-on-surface-variant flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-primary" />
                User Isolated
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Pixel ID Input */}
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-on-surface flex items-center justify-between">
                  <span>Meta Pixel / Dataset ID <span className="text-error">*</span></span>
                  <a
                    href="https://business.facebook.com/events_manager2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Events Manager <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  placeholder="Contoh: 1469138511709885"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface placeholder:text-outline text-body-sm focus:outline-none focus:border-primary font-code-metric"
                  required
                />
                <p className="text-[11px] text-on-surface-variant">
                  Temukan di <em>Meta Events Manager &gt; Kelola Sumber Data (Data Sources)</em>.
                </p>
              </div>

              {/* Pixel Name (Optional) */}
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-on-surface">
                  Nama Label Pixel (Opsional)
                </label>
                <input
                  type="text"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                  placeholder="Contoh: Pixel Toko Online Utama"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface placeholder:text-outline text-body-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* System User Access Token Input */}
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-on-surface flex items-center justify-between">
                  <span>CAPI Access Token (System User Token) <span className="text-error">*</span></span>
                  <span className="text-[11px] text-tertiary font-code-metric">Permanen (No Expiry)</span>
                </label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="EAAG... (Token System User dari Meta Business Manager)"
                    className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface placeholder:text-outline text-body-sm focus:outline-none focus:border-primary font-code-metric"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer"
                    title={showToken ? "Sembunyikan Token" : "Tampilkan Token"}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-outline" />}
                  </button>
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Gunakan Token dari <strong>Pengguna Sistem (System User)</strong> di Pengaturan Bisnis Meta agar tidak kadaluarsa setiap 60 hari.
                </p>
              </div>

              {/* Test Event Code (Optional) */}
              <div className="space-y-1.5">
                <label className="text-body-sm font-medium text-on-surface flex items-center justify-between">
                  <span>Test Event Code (Opsional)</span>
                  <span className="text-[11px] text-outline">Untuk Tab Uji Peristiwa</span>
                </label>
                <input
                  type="text"
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  placeholder="Contoh: TEST12345 (Kosongkan jika iklan aktif)"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface placeholder:text-outline text-body-sm focus:outline-none focus:border-primary font-code-metric uppercase"
                />
                <p className="text-[11px] text-on-surface-variant">
                  Isi hanya jika Anda ingin memantau pengiriman event langsung di tab <em>Uji Peristiwa (Test Events)</em> Meta Events Manager. Hapus saat menjalankan kampanye riil.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !pixelId.trim() || !accessToken.trim()}
                  className="px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container border border-outline-variant/40 text-on-surface text-body-sm font-medium flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {testingConnection ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <Activity className="w-4 h-4 text-primary" />
                  )}
                  <span>{testingConnection ? "Menguji..." : "Tes Koneksi Pixel"}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving || !pixelId.trim() || !accessToken.trim()}
                  className="px-5 py-2.5 rounded-xl bg-primary text-surface text-body-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-primary/20"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>{saving ? "Menyimpan..." : "Simpan & Hubungkan"}</span>
                </button>

                {isConnected && (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="ml-auto px-3.5 py-2 rounded-xl bg-error/10 hover:bg-error/20 border border-error/30 text-error text-body-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {disconnecting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                    <span>Putuskan</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Quick Direct Event Tester */}
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Send className="w-4 h-4" />
                <h3 className="font-headline-sm text-body-md font-semibold text-on-surface">
                  Uji Coba Pengiriman Event CAPI Langsung
                </h3>
              </div>
              <span className="text-[11px] font-code-metric px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Direct Graph API
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Kirim 1 event simulasi langsung ke Pixel Anda untuk memverifikasi apakah event muncul di dashboard Meta Events Manager.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-on-surface-variant font-medium block mb-1">
                  Pilih Nama Event
                </label>
                <select
                  value={testEventName}
                  onChange={(e) => setTestEventName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Lead">Lead</option>
                  <option value="ViewContent">ViewContent</option>
                  <option value="InitiateCheckout">InitiateCheckout</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Contact">Contact</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-on-surface-variant font-medium block mb-1">
                  Nomor WA Pengujian
                </label>
                <input
                  type="text"
                  value={testEventPhone}
                  onChange={(e) => setTestEventPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs focus:outline-none focus:border-primary font-code-metric"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendTestEvent}
                disabled={sendingTestEvent || !pixelId.trim() || !accessToken.trim()}
                className="px-4 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/30 border border-secondary/40 text-secondary text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {sendingTestEvent ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{sendingTestEvent ? "Mengirim Event..." : `Kirim Uji Coba '${testEventName}'`}</span>
              </button>
            </div>

            {testEventResult && (
              <div
                className={`p-3 rounded-lg text-xs font-code-metric leading-relaxed ${
                  testEventResult.startsWith("SUKSES")
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "bg-error/10 border border-error/30 text-error"
                }`}
              >
                {testEventResult}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Status & Integration Guide */}
        <div className="lg:col-span-5 space-y-6">
          {/* Status Card */}
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-4">
            <h3 className="font-headline-sm text-body-md font-semibold text-on-surface flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Status Integrasi Meta
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-high border border-outline-variant/20">
                <span className="text-xs text-on-surface-variant font-medium">Koneksi Pixel</span>
                <span
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    isConnected ? "text-primary" : "text-outline"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-primary animate-pulse" : "bg-outline"
                    }`}
                  />
                  {isConnected ? "Aktif & Siap Kirim" : "Belum Aktif"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-high border border-outline-variant/20 space-y-2 text-xs">
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Pixel ID:</span>
                  <span className="font-code-metric text-on-surface font-medium">
                    {pixelId ? pixelId : "Belum diatur"}
                  </span>
                </div>
                {pixelName && (
                  <div className="flex justify-between items-center text-on-surface-variant">
                    <span>Nama Pixel:</span>
                    <span className="text-on-surface font-medium">{pixelName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Graph API:</span>
                  <span className="font-code-metric text-primary font-medium">v19.0 (Direct)</span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant">
                  <span>Hashing Standar:</span>
                  <span className="font-code-metric text-tertiary font-medium">SHA-256 (ph, fn, em)</span>
                </div>
                {connectedAt && (
                  <div className="flex justify-between items-center text-on-surface-variant pt-1 border-t border-outline-variant/20">
                    <span>Terhubung Sejak:</span>
                    <span className="font-code-metric text-on-surface">
                      {new Date(connectedAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 text-xs text-on-surface-variant">
              <span className="font-semibold text-primary flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Cara Kerja untuk WA Organik:
              </span>
              <p>
                Ketika ada prospek chat WhatsApp tanpa parameter iklan CTWA (Organik), tombol event pada halaman <strong>Tracking WhatsApp</strong> otomatis mengirim event ke Pixel ini melalui Conversions API dengan nomor telepon yang sudah dienkripsi SHA-256 E.164.
              </p>
            </div>
          </div>

          {/* Tutorial Step-by-Step */}
          <div className="p-5 md:p-6 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-4">
            <h3 className="font-headline-sm text-body-md font-semibold text-on-surface flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-tertiary" />
              Panduan Menghubungkan Meta Ads
            </h3>

            <ol className="space-y-3.5 text-xs text-on-surface-variant">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-on-surface block">Buka Meta Events Manager</strong>
                  Masuk ke <a href="https://business.facebook.com/events_manager2" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Events Manager <ExternalLink className="w-3 h-3" /></a>, lalu pilih Pixel atau Dataset yang ingin digunakan. Salin nomor <strong>Dataset / Pixel ID</strong>.
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-on-surface block">Dapatkan Token CAPI Meta</strong>
                  <div className="mt-1 space-y-1 text-on-surface-variant">
                    <p>
                      <strong>Cara 1 (Paling Mudah):</strong> Buka <em>Events Manager &gt; Pilih Pixel / Dataset Anda &gt; Tab Pengaturan (Settings) &gt; Gulir ke Conversions API &gt; Klik "Hasilkan token akses" (Generate access token)</em>. Salin token tersebut.
                    </p>
                    <p>
                      <strong>Cara 2 (System User):</strong> Jika menggunakan Pengguna Sistem (System User) di Pengaturan Bisnis, pastikan Anda telah mengklik <strong>Tambahkan Aset (Assign Assets)</strong> dan memberikan akses <em>Kelola Penuh (Full Control)</em> pada Pixel/Dataset tersebut agar token memiliki izin.
                    </p>
                  </div>
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-on-surface block">Tempel Token &amp; Uji Koneksi</strong>
                  Tempelkan Pixel ID dan Access Token di formulir sebelah kiri. Klik tombol <strong>Tes Koneksi Pixel</strong> untuk memastikan Token valid.
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div>
                  <strong className="text-on-surface block">Simpan &amp; Mulai Kirim Event</strong>
                  Klik <strong>Simpan &amp; Hubungkan</strong>. Anda kini dapat membuka menu <strong>Tracking WhatsApp</strong> dan mengirim event Lead / Purchase untuk prospek organik kapan saja.
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectMetaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center text-primary">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <ConnectMetaContent />
    </Suspense>
  );
}
