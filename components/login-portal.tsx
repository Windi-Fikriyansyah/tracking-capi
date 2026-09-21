"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
  LogOut,
  Radio,
  Server,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

// Dummy credentials for testing
const DUMMY_EMAIL = "admin@signalpulse.io";
const DUMMY_PASSWORD = "PasswordCapi2026!";

function LoginPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard/tracking";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);

  // Check if user was redirected here due to unauthorized access
  useEffect(() => {
    if (searchParams.get("unauthorized") === "true") {
      setFeedback({
        type: "error",
        message:
          "Akses Dibatasi: Anda harus login terlebih dahulu untuk mengakses halaman tersebut.",
      });
    }
  }, [searchParams]);

  const [currentUser, setCurrentUser] = useState<User | { email: string; id: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Check active user session on load
  useEffect(() => {
    async function checkSession() {
      try {
        // Check local storage for demo session first
        const storedDemo = localStorage.getItem("signalpulse_demo_session");
        if (storedDemo) {
          try {
            const parsed = JSON.parse(storedDemo);
            setCurrentUser(parsed);
            router.push(redirectTarget);
            return;
          } catch {
            // ignore
          }
        }

        if (!isSupabaseConfigured) {
          setCheckingAuth(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setCurrentUser(session.user);
          router.push(redirectTarget);
          return;
        }

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setCurrentUser(session.user);
            router.push(redirectTarget);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setCheckingAuth(false);
      }
    }

    checkSession();
  }, [router]);

  const fillDummyCredentials = () => {
    setEmail(DUMMY_EMAIL);
    setPassword(DUMMY_PASSWORD);
    setFeedback({
      type: "info",
      message: "Kredensial demo terisi! Klik tombol 'Masuk ke Dashboard CAPI'.",
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);

    // 1. Handle Sign Up mode
    if (authMode === "signup") {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        setFeedback({
          type: "info",
          message: "Supabase belum terkonfigurasi pada file .env.local.",
        });
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setFeedback({ type: "error", message: error.message });
        } else if (data.session?.user) {
          setCurrentUser(data.session.user);
          setFeedback({
            type: "success",
            message: "Akun baru berhasil dibuat! Membuka dashboard...",
          });
          router.push(redirectTarget);
        } else {
          setFeedback({
            type: "success",
            message: "Pendaftaran berhasil! Silakan masuk dengan akun baru Anda.",
          });
          setAuthMode("signin");
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Gagal mendaftar.";
        setFeedback({ type: "error", message: errorMsg });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 2. Check if user is logging in with the dummy account
    if (
      email.trim().toLowerCase() === DUMMY_EMAIL.toLowerCase() &&
      password === DUMMY_PASSWORD
    ) {
      setTimeout(() => {
        const demoUser = {
          id: "75eecdf5-4f1c-4a7e-b8e2-8750e3ce7020",
          email: DUMMY_EMAIL,
          role: "Super Admin (CAPI Engineer)",
        };
        if (rememberMe) {
          localStorage.setItem("signalpulse_demo_session", JSON.stringify(demoUser));
        }
        setCurrentUser(demoUser);
        setIsLoading(false);
        router.push(redirectTarget);
      }, 500);
      return;
    }

    // 2. Check if customer has an active paid subscription credential from checkout
    try {
      const orderAuthRes = await fetch("/api/auth/order-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (orderAuthRes.ok) {
        const orderAuthData = await orderAuthRes.json();
        if (orderAuthData.success && orderAuthData.user) {
          localStorage.setItem(
            "signalpulse_demo_session",
            JSON.stringify(orderAuthData.user)
          );
          setCurrentUser(orderAuthData.user);
          setFeedback({
            type: "success",
            message: `Selamat datang, ${orderAuthData.user.name}! Membuka dashboard...`,
          });
          setIsLoading(false);
          router.push(redirectTarget);
          return;
        }
      }
    } catch {
      // Continue to Supabase auth
    }

    // 3. Supabase auth
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        setIsLoading(false);
        setFeedback({
          type: "error",
          message:
            "Email atau kata sandi tidak cocok. Pastikan Anda memasukkan kredensial yang dikirimkan ke email Anda, atau gunakan Akun Demo.",
        });
      }, 400);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          // If Supabase email confirmation is enabled, allow demo access or show clear advice
          setFeedback({
            type: "error",
            message:
              "Email belum dikonfirmasi di Supabase. Anda dapat menonaktifkan 'Confirm email' di Supabase Auth Settings, atau gunakan Akun Demo.",
          });
        } else if (error.message === "Invalid login credentials") {
          setFeedback({
            type: "error",
            message: "Email atau kata sandi tidak sesuai. Silakan coba lagi.",
          });
        } else {
          setFeedback({ type: "error", message: error.message });
        }
      } else if (data.user) {
        setCurrentUser(data.user);
        setFeedback({
          type: "success",
          message: "Otentikasi berhasil. Membuka portal CAPI...",
        });
        router.push(redirectTarget);
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Terjadi kesalahan tidak terduga.";
      setFeedback({ type: "error", message: errorMsg });
    } finally {
      setIsLoading(false);
    }

  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;

    if (!isSupabaseConfigured) {
      setFeedback({
        type: "info",
        message: "Supabase belum terkonfigurasi pada .env.local.",
      });
      setShowResetModal(false);
      return;
    }

    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });

      if (error) {
        setFeedback({ type: "error", message: error.message });
      } else {
        setFeedback({
          type: "success",
          message: "Tautan reset kata sandi telah dikirim ke email Anda.",
        });
        setShowResetModal(false);
        setResetEmail("");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal mengirim email reset.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      localStorage.removeItem("signalpulse_demo_session");
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      setCurrentUser(null);
      setEmail("");
      setPassword("");
      setFeedback({
        type: "info",
        message: "Anda telah keluar dari akun.",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-body-sm font-medium tracking-wide">
            Menginisialisasi portal...
          </span>
        </div>
      </div>
    );
  }

  // Authenticated State View
  if (currentUser) {
    return (
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl overflow-hidden backdrop-blur-xl p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-high border border-primary/30 shadow-sm">
              <Activity className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-primary">
                TrackCAPI
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface-variant border border-outline-variant/40">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                ONLINE
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/50 space-y-3">
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-primary" /> Pengguna:
              </span>
              <span className="font-medium text-on-surface truncate max-w-[200px]">
                {currentUser.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <Database className="w-4 h-4 text-tertiary" /> Database:
              </span>
              <span className="text-tertiary font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                Supabase PostgreSQL
              </span>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-primary" /> Status Gateway:
              </span>
              <span className="text-primary font-mono text-label-sm">
                v19.0 Telemetry Stream Active
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => router.push("/dashboard/tracking")}
              className="w-full py-3 px-4 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:bg-primary transition-all duration-150 shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer"
              type="button"
            >
              <span>Buka Portal Tracking CAPI</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface font-headline-sm text-headline-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:bg-surface-container-high hover:border-error/50 hover:text-error transition-all duration-150 cursor-pointer"
              type="button"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>

      </main>
    );
  }

  return (
    <>
      {/* Ambient Telemetry Gradient Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="absolute -bottom-48 -right-32 w-[550px] h-[550px] bg-secondary-container/10 rounded-full blur-[160px]" />
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(76,215,246,0.15)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8 lg:p-12">
        <div className="w-full max-w-md rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-2xl overflow-hidden backdrop-blur-xl p-8">
          <div className="w-full space-y-6">
            {/* Brand Badge Header */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-high border border-primary/30 shadow-sm transition-transform duration-300 hover:scale-105">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-primary">
                  TrackCAPI
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container text-on-surface-variant border border-outline-variant/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                  v19.0
                </span>
              </div>
            </div>

            {/* Auth Mode Tabs (Masuk vs Daftar Baru) */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-container-high border border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setFeedback(null);
                }}
                className={`py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${authMode === "signin"
                  ? "bg-primary text-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
                  }`}
              >
                Masuk (Sign In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setFeedback(null);
                }}
                className={`py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${authMode === "signup"
                  ? "bg-primary text-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
                  }`}
              >
                Daftar Akun Baru (Sign Up)
              </button>
            </div>

            {/* Dummy Account Quick-Fill Card */}
            {authMode === "signin" && (
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1.5 text-label-sm font-semibold text-primary">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Akun Demo Tester</span>
                  </div>
                  <p className="text-[12px] font-mono text-on-surface-variant">
                    {DUMMY_EMAIL}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fillDummyCredentials}
                  className="px-2.5 py-1 text-label-sm font-medium rounded-md bg-surface-container hover:bg-surface-container-high border border-primary/40 text-primary transition-colors cursor-pointer shrink-0"
                >
                  Gunakan Akun
                </button>
              </div>
            )}

            {/* Feedback Notifications */}
            {feedback && (
              <div
                className={`p-3.5 rounded-lg border text-body-sm flex items-start gap-2.5 transition-all ${feedback.type === "error"
                  ? "bg-error-container/20 border-error/40 text-error"
                  : feedback.type === "success"
                    ? "bg-tertiary-container/20 border-tertiary/40 text-tertiary"
                    : "bg-surface-container-high border-primary/40 text-on-surface"
                  }`}
              >
                {feedback.type === "error" ? (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                ) : feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <Server className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                )}
                <span className="text-body-sm leading-snug">{feedback.message}</span>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleAuthSubmit}>
              <div className="space-y-1.5">
                <label
                  className="block text-label-md font-label-md text-on-surface font-medium"
                  htmlFor="work-email"
                >
                  Email Kerja
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    className="block w-full pl-10 pr-4 py-2.5 text-body-md font-body-md bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    id="work-email"
                    name="email"
                    placeholder="nama@perusahaan.com"
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-label-md font-label-md text-on-surface font-medium"
                    htmlFor="password"
                  >
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="text-label-md font-label-md text-primary hover:text-primary-fixed-dim transition-colors cursor-pointer"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    className="block w-full pl-10 pr-10 py-2.5 text-body-md font-body-md bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    id="password"
                    name="password"
                    placeholder="••••••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                  />
                  <button
                    aria-label="Tampilkan atau sembunyikan kata sandi"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    id="togglePassword"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" id="toggleIcon" />
                    ) : (
                      <Eye className="w-5 h-5" id="toggleIcon" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    className="w-4 h-4 rounded border-outline-variant/80 bg-surface-container-low text-primary focus:ring-primary/40 focus:ring-offset-0 transition-colors cursor-pointer"
                    name="remember_me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-label-md font-label-md text-on-surface-variant">
                    Ingat saya selama 30 hari
                  </span>
                </label>
                <span className="text-label-sm font-label-sm text-tertiary flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  TLS 1.3 Terenkripsi
                </span>
              </div>

              <button
                className="w-full mt-2 py-3 px-4 rounded-lg bg-primary-container text-on-primary-container font-headline-sm text-headline-sm font-semibold tracking-wide flex items-center justify-center gap-2 hover:bg-primary transition-all duration-150 shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {authMode === "signin"
                        ? "Masuk ke Dashboard CAPI"
                        : "Daftar Akun Baru"}
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                Reset Kata Sandi
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-label-md cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              Masukkan email kerja Anda. Kami akan mengirimkan tautan reset kata sandi melalui Supabase Auth.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  className="block w-full pl-9 pr-3 py-2 text-body-md bg-surface-container-low border border-outline-variant/60 rounded-lg text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  type="email"
                  required
                  placeholder="nama@perusahaan.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-medium text-body-sm hover:bg-primary flex items-center gap-1.5 cursor-pointer"
                >
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Kirim Tautan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function LoginPortal() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-body-sm font-medium tracking-wide">
              Menginisialisasi portal...
            </span>
          </div>
        </div>
      }
    >
      <LoginPortalContent />
    </Suspense>
  );
}
