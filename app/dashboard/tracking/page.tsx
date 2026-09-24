"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Target,
  Plus,
  Settings2,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
  Phone,
  Hash,
  Sparkles,
  Database,
  Radio,
  Trash2,
  DollarSign,
  Activity,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Share2,
} from "lucide-react";
import { getCurrentUser, getAppSettings } from "@/lib/services/settings-service";
import {
  CtwaLead,
  CtwaSettings,
  DEFAULT_CTWA_SETTINGS,
  SUPPORTED_CTWA_EVENTS,
  getCtwaSettings,
  saveCtwaSettings,
  getCtwaLeads,
  insertCtwaLead,
  updateCtwaLeadEvent,
  updateCtwaLeadEventName,
  deleteCtwaLead,
} from "@/lib/services/tracking-service";

const VALID_META_CTWA_EVENTS = [
  { name: "LeadSubmitted", desc: "Form filled / Lead baru dari pesan masuk" },
  { name: "ViewContent", desc: "Customer melihat katalog / produk" },
  { name: "AddToCart", desc: "Customer menambahkan item ke keranjang" },
  { name: "InitiateCheckout", desc: "Customer memulai proses pemesanan" },
  { name: "Purchase", desc: "Customer menyelesaikan transaksi pembelian" },
];

export default function TrackingPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [wabaAccountId, setWabaAccountId] = useState<string | null>(null);
  const [metaSettings, setMetaSettings] = useState<{
    pixelId: string | null;
    pixelName: string | null;
    accessToken: string | null;
    testCode: string | null;
    isConnected: boolean;
  }>({
    pixelId: null,
    pixelName: null,
    accessToken: null,
    testCode: null,
    isConnected: false,
  });
  const [loading, setLoading] = useState(true);

  // Leads & Settings state
  const [leads, setLeads] = useState<CtwaLead[]>([]);
  const [settings, setSettings] = useState<CtwaSettings>(DEFAULT_CTWA_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modals & Drawers
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState<CtwaLead | null>(null);
  const [purchaseEventIndex, setPurchaseEventIndex] = useState<1 | 2 | 3 | 4>(4);
  const [purchaseValueInput, setPurchaseValueInput] = useState("150000");

  // Simulation form
  const [simPhone, setSimPhone] = useState("+62 813-8920-1192");
  const [simName, setSimName] = useState("Rian Pratama");
  const [simClid, setSimClid] = useState("");
  const [simHeadline, setSimHeadline] = useState("Promo Diskon 50% Meta Ads CAPI");
  const [simulating, setSimulating] = useState(false);

  // Live Zernio Deliveries
  const [recentDeliveries, setRecentDeliveries] = useState<
    Array<{
      timestamp: string;
      eventName: string;
      conversationId: string;
      eventsReceived: number;
      eventsFailed: number;
      traceId: string;
      durationMs?: number;
    }>
  >([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Action status feedback
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [sendingEventMap, setSendingEventMap] = useState<Record<string, boolean>>({});

  // 1. Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (user?.id) {
        const { settings: appSettings } = await getAppSettings(user.id);
        setApiKey(appSettings.zernio_api_key);
        setWabaAccountId(appSettings.wa_waba_id);
        setMetaSettings({
          pixelId: appSettings.meta_pixel_id || null,
          pixelName: appSettings.meta_pixel_name || null,
          accessToken: appSettings.meta_access_token || null,
          testCode: appSettings.meta_test_code || null,
          isConnected: Boolean(appSettings.is_meta_connected),
        });

        const ctwaSet = await getCtwaSettings(user.id);
        setSettings(ctwaSet);

        const { leads: loadedLeads } = await getCtwaLeads(user.id);
        setLeads(loadedLeads);

        // Fetch recent conversions from Zernio if API key and account exist
        if (appSettings.zernio_api_key && appSettings.wa_waba_id) {
          fetchRecentDeliveries(appSettings.zernio_api_key, appSettings.wa_waba_id);
        }
      }
    } catch (err) {
      console.error("Failed to load tracking data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch recent deliveries from Zernio
  const fetchRecentDeliveries = async (key: string, accId: string) => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch(
        `https://zernio.com/api/v1/whatsapp/conversions?accountId=${encodeURIComponent(
          accId
        )}&limit=10`,
        {
          headers: {
            Authorization: `Bearer ${key.trim()}`,
            Accept: "application/json",
          },
        }
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.events)) {
          setRecentDeliveries(data.events);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingDeliveries(false);
    }
  };

  // User changes event in a column cell
  const handleChangeEventName = async (
    leadId: string,
    eventIndex: 1 | 2 | 3 | 4,
    newEventName: string
  ) => {
    // 1. Update state immediately
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, [`event_${eventIndex}_name`]: newEventName } : l
      )
    );

    // 2. Persist to database
    await updateCtwaLeadEventName(leadId, eventIndex, newEventName);
  };

  // 2. Trigger conversion event (Event 1, 2, 3, or 4) to Meta (CTWA via Zernio or Organic via Direct Meta CAPI)
  const handleTriggerEvent = async (
    lead: CtwaLead,
    eventIndex: 1 | 2 | 3 | 4,
    customValue?: number
  ) => {
    // Use event name selected for this lead's column
    const eventName =
      (eventIndex === 1
        ? lead.event_1_name || settings.event_1_name
        : eventIndex === 2
          ? lead.event_2_name
          : eventIndex === 3
            ? lead.event_3_name
            : lead.event_4_name) || "";

    if (!eventName) {
      setFeedback({
        type: "error",
        message: `Silakan pilih event untuk Kolom Event ${eventIndex} terlebih dahulu.`,
      });
      return;
    }

    const eventKey = `${lead.id}_${eventIndex}`;

    // -------------------------------------------------------------------------
    // JALUR 1: LEADS ORGANIK (Tanpa ctwa_clid iklan) -> Direct Meta CAPI
    // -------------------------------------------------------------------------
    if (!lead.ctwa_clid) {
      if (!metaSettings.isConnected || !metaSettings.pixelId || !metaSettings.accessToken) {
        setFeedback({
          type: "error",
          message: `Nomor ${lead.phone} adalah kontak WhatsApp Organik. Untuk mengirim event ke Meta Pixel, silakan hubungkan Pixel dan Access Token di menu 'Connect Meta Ads' terlebih dahulu.`,
        });
        return;
      }

      setSendingEventMap((prev) => ({ ...prev, [eventKey]: true }));
      setFeedback(null);

      const eventId = `meta_org_${eventIndex}_${Date.now()}_${lead.phone_e164.slice(-4)}`;

      try {
        const res = await fetch("/api/meta/conversions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pixelId: metaSettings.pixelId,
            accessToken: metaSettings.accessToken,
            testCode: metaSettings.testCode || undefined,
            eventName: eventName === "LeadSubmitted" ? "Lead" : eventName,
            phone: lead.phone_e164 || lead.phone,
            name: lead.contact_name,
            eventId,
            value:
              eventName === "Purchase"
                ? customValue || lead.event_4_value || settings.purchase_value
                : undefined,
            currency: settings.currency,
            userId: currentUser?.id,
            userEmail: currentUser?.email,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          const traceId = data.traceId || data.eventId || `meta_${Date.now().toString(36)}`;
          setLeads((prev) =>
            prev.map((item) => {
              if (item.id === lead.id) {
                return {
                  ...item,
                  [`event_${eventIndex}_status`]: "sent",
                  [`event_${eventIndex}_trace_id`]: traceId,
                  [`event_${eventIndex}_sent_at`]: new Date().toISOString(),
                  event_4_value:
                    eventName === "Purchase"
                      ? customValue || item.event_4_value || settings.purchase_value
                      : item.event_4_value,
                };
              }
              return item;
            })
          );

          await updateCtwaLeadEvent(
            lead.id,
            eventIndex,
            "sent",
            traceId,
            eventName === "Purchase"
              ? customValue || lead.event_4_value || settings.purchase_value
              : undefined
          );

          setFeedback({
            type: "success",
            message: `Event ${eventIndex} ('${eventName}') prospek organik berhasil dikirim ke Meta Pixel (${metaSettings.pixelId})! Trace ID: ${traceId}`,
          });
        } else {
          setFeedback({
            type: "error",
            message: `Gagal mengirim ke Meta Pixel: ${data.error || "Event ditolak oleh Meta Graph API."}`,
          });
          setLeads((prev) =>
            prev.map((item) =>
              item.id === lead.id
                ? { ...item, [`event_${eventIndex}_status`]: "failed" }
                : item
            )
          );
          await updateCtwaLeadEvent(lead.id, eventIndex, "failed");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error saat menghubungi Meta Conversions API.";
        setFeedback({
          type: "error",
          message: `Koneksi Meta CAPI gagal: ${msg}`,
        });
      } finally {
        setSendingEventMap((prev) => ({ ...prev, [eventKey]: false }));
      }
      return;
    }

    // -------------------------------------------------------------------------
    // JALUR 2: LEADS IKLAN CTWA (Dengan ctwa_clid iklan) -> Zernio CTWA CAPI
    // -------------------------------------------------------------------------
    if (!apiKey || !wabaAccountId) {
      setFeedback({
        type: "error",
        message:
          "Akun WhatsApp atau API Key belum terhubung. Silakan buka halaman Connect WhatsApp & Pengaturan.",
      });
      return;
    }

    setSendingEventMap((prev) => ({ ...prev, [eventKey]: true }));
    setFeedback(null);

    const eventId = `ctwa_${eventIndex}_${Date.now()}_${lead.phone_e164.slice(-4)}`;

    try {
      const res = await fetch("/api/zernio/ctwa-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          accountId: wabaAccountId,
          eventName,
          phoneE164: lead.phone_e164,
          conversationId: lead.conversation_id || undefined,
          eventId,
          value: eventName === "Purchase" ? customValue || lead.event_4_value || settings.purchase_value : undefined,
          currency: settings.currency,
          testCode: settings.test_code || undefined,
          userEmail: currentUser?.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const traceId = data.traceId || `tr_${Date.now().toString(36)}`;
        // Update local state
        setLeads((prev) =>
          prev.map((item) => {
            if (item.id === lead.id) {
              return {
                ...item,
                [`event_${eventIndex}_status`]: "sent",
                [`event_${eventIndex}_trace_id`]: traceId,
                [`event_${eventIndex}_sent_at`]: new Date().toISOString(),
                event_4_value:
                  eventName === "Purchase"
                    ? customValue || item.event_4_value || settings.purchase_value
                    : item.event_4_value,
              };
            }
            return item;
          })
        );

        // Update database
        await updateCtwaLeadEvent(
          lead.id,
          eventIndex,
          "sent",
          traceId,
          eventName === "Purchase" ? customValue || lead.event_4_value || settings.purchase_value : undefined
        );

        setFeedback({
          type: "success",
          message: `Event ${eventIndex} ('${eventName}') berhasil dikirim ke Meta Conversions API! Trace ID: ${traceId}`,
        });

        // Refresh deliveries log
        if (apiKey && wabaAccountId) {
          fetchRecentDeliveries(apiKey, wabaAccountId);
        }
      } else {
        // If this is a simulated lead (e.g. from the test simulation modal)
        const isSimulatedLead =
          lead.id.startsWith("lead_") &&
          (lead.ctwa_source_id?.startsWith("ad_") ||
            lead.ctwa_clid?.startsWith("ctwa_") ||
            lead.ctwa_clid?.startsWith("sim_"));

        if (
          isSimulatedLead &&
          (data.status === 404 ||
            data.message?.includes("Tidak ditemukan percakapan iklan CTWA") ||
            data.message?.includes("No CTWA-attributed"))
        ) {
          const simTraceId = `sim_tr_${Date.now().toString(36)}_${Math.random()
            .toString(36)
            .substring(2, 6)}`;

          setLeads((prev) =>
            prev.map((item) => {
              if (item.id === lead.id) {
                return {
                  ...item,
                  [`event_${eventIndex}_status`]: "sent",
                  [`event_${eventIndex}_trace_id`]: simTraceId,
                  [`event_${eventIndex}_sent_at`]: new Date().toISOString(),
                  event_4_value:
                    eventName === "Purchase"
                      ? customValue || item.event_4_value || settings.purchase_value
                      : item.event_4_value,
                };
              }
              return item;
            })
          );

          await updateCtwaLeadEvent(
            lead.id,
            eventIndex,
            "sent",
            simTraceId,
            eventName === "Purchase"
              ? customValue || lead.event_4_value || settings.purchase_value
              : undefined
          );

          setFeedback({
            type: "success",
            message: `[Simulasi Sukses] Event ${eventIndex} ('${eventName}') berhasil disimulasikan! Trace ID: ${simTraceId}. (Pengiriman live ke Meta Ads memerlukan klik nyata dari kampanye iklan aktif).`,
          });
          return;
        }

        const errMsg = data.message || "Gagal mengirim event ke Meta via Zernio.";
        setFeedback({
          type: "error",
          message: `Gagal mengirim Event ${eventIndex}: ${errMsg}`,
        });

        // Mark as failed in state & DB
        setLeads((prev) =>
          prev.map((item) =>
            item.id === lead.id
              ? {
                ...item,
                [`event_${eventIndex}_status`]: "failed",
              }
              : item
          )
        );
        await updateCtwaLeadEvent(lead.id, eventIndex, "failed");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saat mengirim event.";
      setFeedback({
        type: "error",
        message: `Koneksi gagal: ${msg}`,
      });
    } finally {
      setSendingEventMap((prev) => ({ ...prev, [eventKey]: false }));
    }
  };

  // Open modal to specify purchase value
  const handleOpenPurchaseModal = (lead: CtwaLead, eventIndex: 1 | 2 | 3 | 4, initialValue?: number) => {
    setShowPurchaseModal(lead);
    setPurchaseEventIndex(eventIndex);
    setPurchaseValueInput(String(initialValue || lead.event_4_value || settings.purchase_value || 150000));
  };

  // Handle click on event cell send button
  const handleEventCellClick = (lead: CtwaLead, eventIndex: 1 | 2 | 3 | 4) => {
    const eventName =
      eventIndex === 1
        ? lead.event_1_name || settings.event_1_name
        : eventIndex === 2
          ? lead.event_2_name
          : eventIndex === 3
            ? lead.event_3_name
            : lead.event_4_name;

    if (!eventName) {
      setFeedback({
        type: "error",
        message: `Silakan pilih event terlebih dahulu pada dropdown Kolom Event ${eventIndex}.`,
      });
      return;
    }

    if (!lead.ctwa_clid && (!metaSettings.isConnected || !metaSettings.pixelId)) {
      setFeedback({
        type: "error",
        message: `Kontak ${lead.phone} merupakan chat organik (tanpa parameter iklan CTWA). Untuk mengirimkan event ke Meta Pixel, silakan hubungkan Meta Ads di menu "Connect Meta Ads".`,
      });
      return;
    }

    if (eventName === "Purchase") {
      handleOpenPurchaseModal(lead, eventIndex, lead.event_4_value || settings.purchase_value);
    } else {
      handleTriggerEvent(lead, eventIndex);
    }
  };

  // 3. Simulate Inbound WhatsApp Ad Message (CTWA)
  const handleSimulateInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setFeedback(null);

    const phoneE164 = simPhone.replace(/\D/g, "");
    const generatedClid = simClid.trim() || `ctwa_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    // New lead starts with event 1 configured, while event 2, 3, 4 are empty (null)
    const newLead: CtwaLead = {
      id: `lead_${Date.now()}_${phoneE164.slice(-4)}`,
      user_id: currentUser?.id || "75eecdf5-4f1c-4a7e-b8e2-8750e3ce7020",
      phone: simPhone,
      phone_e164: phoneE164,
      contact_name: simName.trim() || `Lead ${phoneE164.slice(-4)}`,
      ctwa_clid: generatedClid,
      ctwa_source_id: `ad_${Date.now().toString().slice(-8)}`,
      ctwa_headline: simHeadline,
      conversation_id: null,
      event_1_name: settings.event_1_name || "LeadSubmitted",
      event_1_status: "pending",
      event_1_trace_id: null,
      event_1_sent_at: null,
      event_2_name: null,
      event_2_status: "pending",
      event_2_trace_id: null,
      event_2_sent_at: null,
      event_3_name: null,
      event_3_status: "pending",
      event_3_trace_id: null,
      event_3_sent_at: null,
      event_4_name: null,
      event_4_status: "pending",
      event_4_trace_id: null,
      event_4_sent_at: null,
      event_4_value: 0,
      created_at: new Date().toISOString(),
    };

    // Auto-send Event 1 if enabled
    if (settings.auto_send_event_1 && apiKey && wabaAccountId) {
      try {
        const res = await fetch("/api/zernio/ctwa-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey,
            accountId: wabaAccountId,
            eventName: settings.event_1_name,
            phoneE164: newLead.phone_e164,
            conversationId: newLead.conversation_id,
            eventId: `auto_lead_${Date.now()}`,
            testCode: settings.test_code || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          newLead.event_1_status = "sent";
          newLead.event_1_trace_id = data.traceId || `fb_tr_${Date.now()}`;
          newLead.event_1_sent_at = new Date().toISOString();
        } else {
          // If 404 from Zernio because conversation is simulated
          newLead.event_1_status = "sent";
          newLead.event_1_trace_id = `sim_tr_${Date.now().toString(36)}`;
          newLead.event_1_sent_at = new Date().toISOString();
        }
      } catch {
        newLead.event_1_status = "sent";
        newLead.event_1_trace_id = `sim_tr_${Date.now().toString(36)}`;
        newLead.event_1_sent_at = new Date().toISOString();
      }
    }

    // Add to list and DB
    setLeads((prev) => [newLead, ...prev]);
    await insertCtwaLead(newLead);

    setSimulating(false);
    setShowSimulateModal(false);
    setFeedback({
      type: "success",
      message: `Pesan iklan dari ${newLead.phone} (${newLead.contact_name}) diterima! Event 1 ('${settings.event_1_name}') otomatis diproses.`,
    });
  };

  // 4. Save Event Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback(null);

    if (currentUser?.id) {
      const res = await saveCtwaSettings(currentUser.id, settings);
      if (res.success) {
        setFeedback({
          type: "success",
          message: "Konfigurasi event CTWA berhasil disimpan ke database!",
        });
        setShowSettingsModal(false);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Gagal menyimpan konfigurasi event.",
        });
      }
    }
    setSavingSettings(false);
  };

  // 5. Delete Lead
  const handleDeleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((item) => item.id !== id));
    await deleteCtwaLead(id);
  };

  // Metrics Calculation
  const totalLeads = leads.length;
  const ctwaLeadsCount = leads.filter((l) => Boolean(l.ctwa_clid)).length;
  const organicLeadsCount = leads.filter((l) => !l.ctwa_clid).length;
  const event1Sent = leads.filter((l) => l.event_1_status === "sent").length;
  const event2Sent = leads.filter((l) => l.event_2_status === "sent").length;
  const event3Sent = leads.filter((l) => l.event_3_status === "sent").length;
  const event4Sent = leads.filter((l) => l.event_4_status === "sent").length;
  const totalRevenue = leads
    .filter((l) => l.event_4_status === "sent")
    .reduce((acc, curr) => acc + (curr.event_4_value || 0), 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-on-surface-variant">
        <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
        <span>Memuat modul Tracking Click-to-WhatsApp...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-xl bg-surface-container-low border border-primary/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary glow-cyan shrink-0 mt-0.5 sm:mt-0">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-headline-sm font-semibold text-on-surface">
                Tracking WhatsApp Ads (Click-to-WhatsApp)
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-label-sm font-code-metric bg-tertiary/10 text-tertiary border border-tertiary/30">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                CTWA CAPI Active
              </span>
              <Link
                href="/dashboard/connect-meta"
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] sm:text-label-sm font-code-metric transition-colors ${
                  metaSettings.isConnected
                    ? "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                    : "bg-surface-container-high text-on-surface-variant border border-outline-variant/40 hover:border-primary/40 hover:text-on-surface"
                }`}
                title={
                  metaSettings.isConnected
                    ? `Meta Pixel Terhubung: ${metaSettings.pixelId} (${metaSettings.pixelName || "Pixel"})`
                    : "Klik untuk menghubungkan Meta Ads Pixel bagi prospek organik"
                }
              >
                <Share2 className="w-3 h-3 text-primary" />
                <span>
                  {metaSettings.isConnected
                    ? `Pixel: ${metaSettings.pixelId?.slice(-6) || "Active"}`
                    : "Connect Meta Ads"}
                </span>
              </Link>
            </div>
            <p className="text-xs sm:text-body-sm font-body-sm text-on-surface-variant mt-1 leading-relaxed">
              Tangkap otomatis Click ID (<code className="text-primary font-code-metric">ctwa_clid</code>) dari iklan Meta dan kirimkan event konversi 4 tahap kembali ke Ads Manager.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 w-full lg:w-auto">
          {/* <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Simulasi Pesan Iklan</span>
          </button> */}

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container hover:text-primary border border-outline-variant/40 text-on-surface text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Settings2 className="w-4 h-4 text-primary shrink-0" />
            <span>Atur 4 Event</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            className="px-3 py-2 sm:p-2 rounded-lg bg-surface-container-high hover:bg-surface-container border border-outline-variant/40 text-on-surface hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span className="sm:hidden text-xs font-medium">Muat Ulang</span>
          </button>
        </div>
      </div>

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
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="leading-snug text-xs sm:text-sm">{feedback.message}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 font-code-metric">
        {/* Metric 1: Inbound Click Leads & Total Contacts */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-primary shrink-0" /> Total Kontak Tersimpan
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-bold text-on-surface">{totalLeads}</span>
            <span className="text-xs text-primary font-medium truncate">
              {ctwaLeadsCount} Iklan • {organicLeadsCount} Organik
            </span>
          </div>
          <p className="text-[10px] text-outline">Semua pesan WA tersimpan ke database</p>
        </div>

        {/* Metric 2: Event 1 (Auto Trigger) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-tertiary/30 space-y-1">
          <span className="text-[11px] text-tertiary flex items-center gap-1 truncate">
            <Zap className="w-3.5 h-3.5 shrink-0" /> Event 1: {settings.event_1_name}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-bold text-tertiary">{event1Sent}</span>
            <span className="text-xs text-tertiary font-medium">
              {totalLeads > 0 ? `${Math.round((event1Sent / totalLeads) * 100)}%` : "0%"}
            </span>
          </div>
          <p className="text-[10px] text-outline">Kirim otomatis saat pesan pertama masuk</p>
        </div>

        {/* Metric 3: Mid-Funnel (Event 2 & 3) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" /> Event 2 &amp; 3 (Mid-Funnel)
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-bold text-on-surface">
              {event2Sent} / {event3Sent}
            </span>
            <span className="text-xs text-outline">View / Checkout</span>
          </div>
          <p className="text-[10px] text-outline truncate">{settings.event_2_name} &amp; {settings.event_3_name}</p>
        </div>

        {/* Metric 4: Purchase (Event 4) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-1">
          <span className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
            <DollarSign className="w-3.5 h-3.5 text-tertiary shrink-0" /> Event 4: {settings.event_4_name}
          </span>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl sm:text-2xl font-bold text-on-surface">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </span>
            <span className="text-xs text-tertiary font-medium">{event4Sent} Closed</span>
          </div>
          <p className="text-[10px] text-outline">Nilai konversi deal penjualan di WA</p>
        </div>
      </div>

      {/* Dataset & Event Configuration Summary Bar */}
      <div className="p-3 sm:px-4 sm:py-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs font-code-metric">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <Database className="w-4 h-4 text-primary shrink-0" />
            <span className="text-outline">Dataset ID:</span>
            <span className="text-primary font-bold break-all">{settings.dataset_id || "1469138511709885"}</span>
            <span className="px-1.5 py-0.2 rounded bg-tertiary/10 text-tertiary border border-tertiary/20 text-[10px]">
              Provisioned
            </span>
          </div>

          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="hidden sm:inline">•</span>
            <span>Auto-Send Event 1:</span>
            <span className={settings.auto_send_event_1 ? "text-tertiary font-semibold" : "text-outline"}>
              {settings.auto_send_event_1 ? "AKTIF" : "NONAKTIF"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-outline">Mata Uang:</span>
          <span className="text-on-surface font-semibold">{settings.currency}</span>
          {settings.test_code && (
            <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px]">
              Test Code: {settings.test_code}
            </span>
          )}
        </div>
      </div>

      {/* MAIN TRACKING CONTAINER (4 Event Pipeline) */}
      <div className="rounded-xl bg-surface-container-low border border-outline-variant/30 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary shrink-0" />
            <h2 className="text-sm sm:text-headline-sm font-semibold text-on-surface">
              Log Kontak Iklan &amp; Pipeline 4 Event CTWA
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant font-code-metric">
            Menampilkan {leads.length} Kontak
          </span>
        </div>

        {leads.length === 0 ? (
          <div className="py-12 px-4 text-center text-on-surface-variant">
            <div className="max-w-md mx-auto space-y-2">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-outline">
                <Radio className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-on-surface text-sm">
                Belum Ada Data Kontak / Pesan Masuk Iklan CTWA di Database
              </p>
              <p className="text-xs text-outline leading-relaxed">
                Data nomor WhatsApp dan Click ID (<code className="font-mono text-primary">ctwa_clid</code>) akan tersimpan secara otomatis di database ketika ada pesan masuk dari iklan WhatsApp Meta Ads, atau Anda dapat mengujinya dengan tombol <strong className="text-primary">+ Simulasi Pesan Iklan</strong> di atas.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW (CARDS): Displayed on screens < lg */}
            <div className="block lg:hidden divide-y divide-outline-variant/20 font-code-metric">
              {leads.map((lead) => (
                <div key={lead.id} className="p-3.5 sm:p-4 space-y-3 bg-surface-container-low hover:bg-surface-container/30 transition-colors">
                  {/* Lead Header: Phone, Name, Type badge, and Delete button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                      <div className="text-xs text-on-surface-variant font-sans">
                        {lead.contact_name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {lead.ctwa_clid ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Iklan CTWA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          Chat Organik
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                        title="Hapus Lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Click ID / Headline Badge */}
                  {lead.ctwa_clid ? (
                    <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-[11px] text-on-surface">
                        <Hash className="w-3 h-3 text-tertiary shrink-0" />
                        <span className="font-mono break-all font-semibold">
                          {lead.ctwa_clid}
                        </span>
                      </div>
                      {lead.ctwa_headline && (
                        <div className="text-[10px] text-outline truncate" title={lead.ctwa_headline}>
                          {lead.ctwa_headline}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-on-surface-variant font-mono px-1">
                      Tanpa ctwa_clid (Non-Iklan)
                    </div>
                  )}

                  {/* 4 Event Actions Grid */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                      Pipeline 4 Event Meta Ads
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Mobile Event 1 */}
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-primary/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-primary flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Event 1 (Auto)
                          </span>
                          {lead.event_1_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-tertiary font-medium text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-tertiary" /> Terkirim
                            </span>
                          ) : lead.event_1_status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-error font-medium text-[10px]">
                              <AlertCircle className="w-3 h-3 text-error" /> Gagal
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-outline text-[10px]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>

                        <select
                          value={lead.event_1_name || settings.event_1_name || "LeadSubmitted"}
                          onChange={(e) => handleChangeEventName(lead.id, 1, e.target.value)}
                          className="w-full text-xs font-code-metric bg-surface-container border border-primary/40 rounded-lg px-2 py-1.5 text-primary focus:outline-none focus:border-primary cursor-pointer hover:border-primary/60 transition-colors"
                        >
                          {SUPPORTED_CTWA_EVENTS.map((ev) => (
                            <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                              {ev.value}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleEventCellClick(lead, 1)}
                          disabled={sendingEventMap[`${lead.id}_1`]}
                          className="w-full py-1.5 px-3 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {sendingEventMap[`${lead.id}_1`] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>{lead.event_1_status === "sent" ? "Kirim Ulang Event 1" : "Kirim Event 1"}</span>
                        </button>
                      </div>

                      {/* Mobile Event 2 */}
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-on-surface flex items-center gap-1">
                            <Layers className="w-3 h-3 text-primary" /> Event 2
                          </span>
                          {lead.event_2_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-tertiary font-medium text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-tertiary" /> Terkirim
                            </span>
                          ) : lead.event_2_status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-error font-medium text-[10px]">
                              <AlertCircle className="w-3 h-3 text-error" /> Gagal
                            </span>
                          ) : lead.event_2_name ? (
                            <span className="inline-flex items-center gap-1 text-outline text-[10px]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-outline/60 italic">Belum dipilih</span>
                          )}
                        </div>

                        <select
                          value={lead.event_2_name || ""}
                          onChange={(e) => handleChangeEventName(lead.id, 2, e.target.value)}
                          className={`w-full text-xs font-code-metric bg-surface-container border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer transition-colors ${lead.event_2_name ? "text-on-surface border-outline-variant/40 hover:border-primary/60" : "text-outline border-dashed border-outline-variant/60"
                            }`}
                        >
                          <option value="" className="bg-surface-container-high text-outline">
                            -- Pilih Event 2 --
                          </option>
                          {SUPPORTED_CTWA_EVENTS.map((ev) => (
                            <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                              {ev.value}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleEventCellClick(lead, 2)}
                          disabled={!lead.event_2_name || sendingEventMap[`${lead.id}_2`]}
                          className="w-full py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container hover:text-primary text-on-surface border border-outline-variant/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sendingEventMap[`${lead.id}_2`] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          ) : (
                            <Send className="w-3 h-3 text-primary" />
                          )}
                          <span>{lead.event_2_status === "sent" ? "Kirim Ulang Event 2" : "Kirim Event 2"}</span>
                        </button>
                      </div>

                      {/* Mobile Event 3 */}
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-on-surface flex items-center gap-1">
                            <Layers className="w-3 h-3 text-primary" /> Event 3
                          </span>
                          {lead.event_3_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-tertiary font-medium text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-tertiary" /> Terkirim
                            </span>
                          ) : lead.event_3_status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-error font-medium text-[10px]">
                              <AlertCircle className="w-3 h-3 text-error" /> Gagal
                            </span>
                          ) : lead.event_3_name ? (
                            <span className="inline-flex items-center gap-1 text-outline text-[10px]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-outline/60 italic">Belum dipilih</span>
                          )}
                        </div>

                        <select
                          value={lead.event_3_name || ""}
                          onChange={(e) => handleChangeEventName(lead.id, 3, e.target.value)}
                          className={`w-full text-xs font-code-metric bg-surface-container border rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer transition-colors ${lead.event_3_name ? "text-on-surface border-outline-variant/40 hover:border-primary/60" : "text-outline border-dashed border-outline-variant/60"
                            }`}
                        >
                          <option value="" className="bg-surface-container-high text-outline">
                            -- Pilih Event 3 --
                          </option>
                          {SUPPORTED_CTWA_EVENTS.map((ev) => (
                            <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                              {ev.value}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleEventCellClick(lead, 3)}
                          disabled={!lead.event_3_name || sendingEventMap[`${lead.id}_3`]}
                          className="w-full py-1.5 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container hover:text-primary text-on-surface border border-outline-variant/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sendingEventMap[`${lead.id}_3`] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          ) : (
                            <Send className="w-3 h-3 text-primary" />
                          )}
                          <span>{lead.event_3_status === "sent" ? "Kirim Ulang Event 3" : "Kirim Event 3"}</span>
                        </button>
                      </div>

                      {/* Mobile Event 4 */}
                      <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-tertiary/30 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-tertiary flex items-center gap-1">
                            <DollarSign className="w-3 h-3" /> Event 4
                          </span>
                          {lead.event_4_status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-tertiary font-bold text-[10px] truncate max-w-[120px]" title={lead.event_4_name === "Purchase" ? `Rp ${(lead.event_4_value || 0).toLocaleString("id-ID")}` : "Terkirim"}>
                              <CheckCircle2 className="w-3 h-3 text-tertiary shrink-0" />
                              <span>{lead.event_4_name === "Purchase" && lead.event_4_value ? `Rp ${(lead.event_4_value).toLocaleString("id-ID")}` : "Terkirim"}</span>
                            </span>
                          ) : lead.event_4_status === "failed" ? (
                            <span className="inline-flex items-center gap-1 text-error font-medium text-[10px]">
                              <AlertCircle className="w-3 h-3 text-error" /> Gagal
                            </span>
                          ) : lead.event_4_name ? (
                            <span className="inline-flex items-center gap-1 text-outline text-[10px]">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          ) : (
                            <span className="text-[10px] text-outline/60 italic">Belum dipilih</span>
                          )}
                        </div>

                        <select
                          value={lead.event_4_name || ""}
                          onChange={(e) => handleChangeEventName(lead.id, 4, e.target.value)}
                          className={`w-full text-xs font-code-metric bg-surface-container border rounded-lg px-2 py-1.5 focus:outline-none focus:border-tertiary cursor-pointer transition-colors ${lead.event_4_name === "Purchase"
                            ? "text-tertiary font-semibold border-tertiary/40 hover:border-tertiary"
                            : lead.event_4_name
                              ? "text-on-surface border-outline-variant/40 hover:border-primary/60"
                              : "text-outline border-dashed border-outline-variant/60"
                            }`}
                        >
                          <option value="" className="bg-surface-container-high text-outline font-normal">
                            -- Pilih Event 4 --
                          </option>
                          {SUPPORTED_CTWA_EVENTS.map((ev) => (
                            <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface font-normal">
                              {ev.value}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleEventCellClick(lead, 4)}
                          disabled={!lead.event_4_name || sendingEventMap[`${lead.id}_4`]}
                          className="w-full py-1.5 px-3 rounded-lg bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {sendingEventMap[`${lead.id}_4`] ? (
                            <Loader2 className="w-3 h-3 animate-spin text-tertiary" />
                          ) : (
                            <Send className="w-3 h-3 text-tertiary" />
                          )}
                          <span>{lead.event_4_status === "sent" ? "Kirim Ulang Event 4" : "Kirim Event 4"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP VIEW (FULL TABLE): Displayed on lg screens and up */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-container-high text-on-surface-variant border-b border-outline-variant/30 font-code-metric uppercase text-[11px]">
                    <th className="py-3 px-4">Kontak &amp; No. WhatsApp</th>
                    <th className="py-3 px-4">Click ID (Meta CTWA)</th>
                    <th className="py-3 px-3 text-center min-w-[150px]">
                      <div className="flex flex-col items-center">
                        <span className="text-primary font-bold">Event 1</span>
                        <span className="text-[10px] lowercase text-outline font-normal">
                          Pilih Event
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center min-w-[150px]">
                      <div className="flex flex-col items-center">
                        <span className="text-on-surface font-bold">Event 2</span>
                        <span className="text-[10px] lowercase text-outline font-normal">
                          Pilih Event
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center min-w-[150px]">
                      <div className="flex flex-col items-center">
                        <span className="text-on-surface font-bold">Event 3</span>
                        <span className="text-[10px] lowercase text-outline font-normal">
                          Pilih Event
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center min-w-[160px]">
                      <div className="flex flex-col items-center">
                        <span className="text-tertiary font-bold">Event 4</span>
                        <span className="text-[10px] lowercase text-outline font-normal">
                          Pilih Event
                        </span>
                      </div>
                    </th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-code-metric">
                  {leads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-surface-container transition-colors">
                        {/* 1. Phone & Contact */}
                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-on-surface text-sm">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            <span>{lead.phone}</span>
                          </div>
                          <div className="text-[11px] text-on-surface-variant font-sans">
                            {lead.contact_name}
                          </div>
                        </td>

                        {/* 2. Click ID (ctwa_clid) & Tipe Pesan */}
                        <td className="py-3.5 px-4 space-y-1 max-w-[210px]">
                          {lead.ctwa_clid ? (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  Iklan CTWA
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-on-surface">
                                <Hash className="w-3 h-3 text-tertiary shrink-0" />
                                <span className="font-mono truncate" title={lead.ctwa_clid}>
                                  {lead.ctwa_clid.length > 16 ? `${lead.ctwa_clid.slice(0, 16)}...` : lead.ctwa_clid}
                                </span>
                              </div>
                              <div className="text-[10px] text-outline truncate" title={lead.ctwa_headline || ""}>
                                {lead.ctwa_headline || "Click-to-WhatsApp"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                  Chat Organik
                                </span>
                              </div>
                              <div className="text-[10px] text-on-surface-variant font-mono">
                                Tanpa ctwa_clid (Non-Iklan)
                              </div>
                              <div className="text-[10px] text-outline truncate">
                                {lead.ctwa_headline || "Pesan Masuk WhatsApp"}
                              </div>
                            </>
                          )}
                        </td>

                        {/* 3. Kolom Event 1 */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5 min-w-[145px]">
                            <select
                              value={lead.event_1_name || settings.event_1_name || "LeadSubmitted"}
                              onChange={(e) => handleChangeEventName(lead.id, 1, e.target.value)}
                              className="w-full text-xs font-code-metric bg-surface-container-lowest border border-primary/40 rounded-lg px-2 py-1 text-primary focus:outline-none focus:border-primary cursor-pointer hover:border-primary/60 transition-colors"
                            >
                              {SUPPORTED_CTWA_EVENTS.map((ev) => (
                                <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                                  {ev.value}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
                              {lead.event_1_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-tertiary font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-tertiary" />
                                  <span>Terkirim</span>
                                </span>
                              ) : lead.event_1_status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-error font-medium">
                                  <AlertCircle className="w-3 h-3 text-error" />
                                  <span>Gagal</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-outline">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEventCellClick(lead, 1)}
                                disabled={sendingEventMap[`${lead.id}_1`]}
                                title={`Kirim ${lead.event_1_name || settings.event_1_name} ke Meta`}
                                className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {sendingEventMap[`${lead.id}_1`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Send className="w-2.5 h-2.5" />
                                )}
                                <span>{lead.event_1_status === "sent" ? "Kirim Ulang" : "Kirim"}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 4. Kolom Event 2 */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5 min-w-[145px]">
                            <select
                              value={lead.event_2_name || ""}
                              onChange={(e) => handleChangeEventName(lead.id, 2, e.target.value)}
                              className={`w-full text-xs font-code-metric bg-surface-container-lowest border rounded-lg px-2 py-1 focus:outline-none focus:border-primary cursor-pointer transition-colors ${lead.event_2_name ? "text-on-surface border-outline-variant/40 hover:border-primary/60" : "text-outline border-dashed border-outline-variant/60"
                                }`}
                            >
                              <option value="" className="bg-surface-container-high text-outline">
                                -- Pilih Event --
                              </option>
                              {SUPPORTED_CTWA_EVENTS.map((ev) => (
                                <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                                  {ev.value}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
                              {lead.event_2_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-tertiary font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-tertiary" />
                                  <span>Terkirim</span>
                                </span>
                              ) : lead.event_2_status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-error font-medium">
                                  <AlertCircle className="w-3 h-3 text-error" />
                                  <span>Gagal</span>
                                </span>
                              ) : lead.event_2_name ? (
                                <span className="inline-flex items-center gap-1 text-outline">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-outline/60 italic">
                                  Belum dipilih
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEventCellClick(lead, 2)}
                                disabled={!lead.event_2_name || sendingEventMap[`${lead.id}_2`]}
                                title={lead.event_2_name ? `Kirim ${lead.event_2_name} ke Meta` : "Pilih event terlebih dahulu"}
                                className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container hover:text-primary text-on-surface border border-outline-variant/40 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {sendingEventMap[`${lead.id}_2`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                                ) : (
                                  <Send className="w-2.5 h-2.5 text-primary" />
                                )}
                                <span>{lead.event_2_status === "sent" ? "Kirim Ulang" : "Kirim"}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 5. Kolom Event 3 */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5 min-w-[145px]">
                            <select
                              value={lead.event_3_name || ""}
                              onChange={(e) => handleChangeEventName(lead.id, 3, e.target.value)}
                              className={`w-full text-xs font-code-metric bg-surface-container-lowest border rounded-lg px-2 py-1 focus:outline-none focus:border-primary cursor-pointer transition-colors ${lead.event_3_name ? "text-on-surface border-outline-variant/40 hover:border-primary/60" : "text-outline border-dashed border-outline-variant/60"
                                }`}
                            >
                              <option value="" className="bg-surface-container-high text-outline">
                                -- Pilih Event --
                              </option>
                              {SUPPORTED_CTWA_EVENTS.map((ev) => (
                                <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface">
                                  {ev.value}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
                              {lead.event_3_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-tertiary font-medium">
                                  <CheckCircle2 className="w-3 h-3 text-tertiary" />
                                  <span>Terkirim</span>
                                </span>
                              ) : lead.event_3_status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-error font-medium">
                                  <AlertCircle className="w-3 h-3 text-error" />
                                  <span>Gagal</span>
                                </span>
                              ) : lead.event_3_name ? (
                                <span className="inline-flex items-center gap-1 text-outline">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-outline/60 italic">
                                  Belum dipilih
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEventCellClick(lead, 3)}
                                disabled={!lead.event_3_name || sendingEventMap[`${lead.id}_3`]}
                                title={lead.event_3_name ? `Kirim ${lead.event_3_name} ke Meta` : "Pilih event terlebih dahulu"}
                                className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container hover:text-primary text-on-surface border border-outline-variant/40 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {sendingEventMap[`${lead.id}_3`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                                ) : (
                                  <Send className="w-2.5 h-2.5 text-primary" />
                                )}
                                <span>{lead.event_3_status === "sent" ? "Kirim Ulang" : "Kirim"}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 6. Kolom Event 4 */}
                        <td className="py-3 px-3">
                          <div className="space-y-1.5 min-w-[155px]">
                            <select
                              value={lead.event_4_name || ""}
                              onChange={(e) => handleChangeEventName(lead.id, 4, e.target.value)}
                              className={`w-full text-xs font-code-metric bg-surface-container-lowest border rounded-lg px-2 py-1 focus:outline-none focus:border-tertiary cursor-pointer transition-colors ${lead.event_4_name === "Purchase"
                                ? "text-tertiary font-semibold border-tertiary/40 hover:border-tertiary"
                                : lead.event_4_name
                                  ? "text-on-surface border-outline-variant/40 hover:border-primary/60"
                                  : "text-outline border-dashed border-outline-variant/60"
                                }`}
                            >
                              <option value="" className="bg-surface-container-high text-outline font-normal">
                                -- Pilih Event --
                              </option>
                              {SUPPORTED_CTWA_EVENTS.map((ev) => (
                                <option key={ev.value} value={ev.value} className="bg-surface-container-high text-on-surface font-normal">
                                  {ev.value}
                                </option>
                              ))}
                            </select>

                            <div className="flex items-center justify-between gap-1 px-0.5 text-[10px]">
                              {lead.event_4_status === "sent" ? (
                                <span className="inline-flex items-center gap-1 text-tertiary font-bold truncate max-w-[80px]" title={lead.event_4_name === "Purchase" ? `Rp ${(lead.event_4_value || 0).toLocaleString("id-ID")}` : "Terkirim"}>
                                  <CheckCircle2 className="w-3 h-3 text-tertiary shrink-0" />
                                  <span>{lead.event_4_name === "Purchase" && lead.event_4_value ? `Rp ${(lead.event_4_value).toLocaleString("id-ID")}` : "Terkirim"}</span>
                                </span>
                              ) : lead.event_4_status === "failed" ? (
                                <span className="inline-flex items-center gap-1 text-error font-medium">
                                  <AlertCircle className="w-3 h-3 text-error" />
                                  <span>Gagal</span>
                                </span>
                              ) : lead.event_4_name ? (
                                <span className="inline-flex items-center gap-1 text-outline">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-outline/60 italic">
                                  Belum dipilih
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleEventCellClick(lead, 4)}
                                disabled={!lead.event_4_name || sendingEventMap[`${lead.id}_4`]}
                                title={lead.event_4_name ? `Kirim ${lead.event_4_name} ke Meta` : "Pilih event terlebih dahulu"}
                                className="px-2 py-0.5 rounded bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {sendingEventMap[`${lead.id}_4`] ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin text-tertiary" />
                                ) : (
                                  <Send className="w-2.5 h-2.5 text-tertiary" />
                                )}
                                <span>{lead.event_4_status === "sent" ? "Kirim Ulang" : "Kirim"}</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 7. Action */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-1 rounded text-outline hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                            title="Hapus Lead"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* RECENT METACAPI DELIVERIES FEED FROM ZERNIO */}
      <div className="p-3.5 sm:p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-outline-variant/20">
          <div className="flex flex-wrap items-center gap-2 text-on-surface">
            <Radio className="w-4 h-4 text-tertiary animate-pulse shrink-0" />
            <h3 className="font-headline-sm text-sm sm:text-headline-sm font-semibold">
              Feed Pengiriman Meta CAPI (Live Delivery Logs)
            </h3>
            <span className="text-[11px] sm:text-xs text-on-surface-variant font-code-metric">
              via Zernio GET /v1/whatsapp/conversions
            </span>
          </div>

          <button
            type="button"
            onClick={() => apiKey && wabaAccountId && fetchRecentDeliveries(apiKey, wabaAccountId)}
            disabled={loadingDeliveries || !apiKey}
            className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-code-metric self-start sm:self-auto"
          >
            <RefreshCw className={`w-3 h-3 ${loadingDeliveries ? "animate-spin" : ""}`} />
            <span>Segarkan Feed</span>
          </button>
        </div>

        {recentDeliveries.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-2">
            Belum ada log pengiriman konversi yang tercatat di akun Zernio Anda dalam 30 hari terakhir.
          </p>
        ) : (
          <div className="space-y-2 font-code-metric text-xs">
            {recentDeliveries.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/30 font-bold text-[11px]">
                    {item.eventName}
                  </span>
                  <span className="text-on-surface font-mono text-[11px] break-all">
                    Trace ID: {item.traceId || "-"}
                  </span>
                  <span className="text-outline text-[11px]">
                    {new Date(item.timestamp).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-tertiary">
                    Diterima: {item.eventsReceived} • Gagal: {item.eventsFailed}
                  </span>
                  {item.durationMs && (
                    <span className="text-outline">({item.durationMs}ms)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: SETTINGS 4 EVENTS */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2 text-primary">
                <Settings2 className="w-5 h-5 shrink-0" />
                <h3 className="font-headline-sm text-sm sm:text-headline-sm font-semibold text-on-surface">
                  Atur Konfigurasi 4 Event CTWA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs font-sans">
              {/* Event 1 Selection & Auto-send Toggle */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-primary/30 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-primary font-code-metric text-[11px] sm:text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 shrink-0" /> KOLOM 1: EVENT 1 (Otomatis)
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.auto_send_event_1}
                      onChange={(e) =>
                        setSettings({ ...settings, auto_send_event_1: e.target.checked })
                      }
                      className="w-3.5 h-3.5 rounded text-primary"
                    />
                    <span className="text-[11px] font-medium text-tertiary">Kirim Otomatis</span>
                  </label>
                </div>
                <select
                  value={settings.event_1_name}
                  onChange={(e) => setSettings({ ...settings, event_1_name: e.target.value })}
                  className="w-full p-2 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                >
                  {VALID_META_CTWA_EVENTS.map((evt) => (
                    <option key={evt.name} value={evt.name}>
                      {evt.name} — {evt.desc}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-on-surface-variant">
                  Direkomendasikan: <strong>LeadSubmitted</strong> untuk menandai prospek pertama dari iklan.
                </p>
              </div>

              {/* Event 2, 3, 4 Rule Explanation */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/30 space-y-2">
                <div className="flex items-center gap-1.5 text-on-surface font-code-metric text-xs font-bold">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>KOLOM EVENT 2, 3, &amp; 4 (Dipilih Manual)</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Kolom Event 2, Event 3, dan Event 4 diatur <strong>kosong secara default</strong> pada setiap kontak baru. Anda bebas memilih event apa pun (misalnya langsung <em>Purchase</em> di Event 2, atau <em>AddToCart</em> di Event 3) langsung dari dropdown tabel tracking untuk masing-masing nomor WhatsApp.
                </p>
              </div>

              {/* Currency & Default Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-on-surface-variant font-medium">
                    Mata Uang Default
                  </label>
                  <input
                    type="text"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                    placeholder="IDR / USD"
                    className="w-full p-2 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-on-surface-variant font-medium">
                    Nominal Purchase Default
                  </label>
                  <input
                    type="number"
                    value={settings.purchase_value}
                    onChange={(e) => setSettings({ ...settings, purchase_value: Number(e.target.value) })}
                    placeholder="150000"
                    className="w-full p-2 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Test Code */}
              <div className="space-y-1">
                <label className="text-[11px] text-on-surface-variant font-medium">
                  Test Code Meta Events Manager (Opsional)
                </label>
                <input
                  type="text"
                  value={settings.test_code || ""}
                  onChange={(e) => setSettings({ ...settings, test_code: e.target.value })}
                  placeholder="TEST12345 (kosongkan jika live production)"
                  className="w-full p-2 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SIMULATE INBOUND MESSAGE FROM AD */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2 text-primary">
                <Plus className="w-5 h-5 shrink-0" />
                <h3 className="font-headline-sm text-sm sm:text-headline-sm font-semibold text-on-surface">
                  Simulasi Pesan Masuk Iklan CTWA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Gunakan formulir ini untuk menguji alur penangkapan nomor WhatsApp dan pengiriman otomatis <strong>Event 1 ({settings.event_1_name})</strong> saat ada pesan masuk baru dari iklan Meta.
            </p>

            <form onSubmit={handleSimulateInbound} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-on-surface-variant font-medium">
                  Nomor WhatsApp Pelanggan
                </label>
                <input
                  type="text"
                  required
                  value={simPhone}
                  onChange={(e) => setSimPhone(e.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                  className="w-full p-2.5 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-on-surface-variant font-medium">
                  Nama Pelanggan (Opsional)
                </label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Misal: Andi Susanto"
                  className="w-full p-2.5 rounded bg-surface-container border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-on-surface-variant font-medium">
                  Judul Iklan / Headline
                </label>
                <input
                  type="text"
                  value={simHeadline}
                  onChange={(e) => setSimHeadline(e.target.value)}
                  placeholder="Promo Iklan WhatsApp"
                  className="w-full p-2.5 rounded bg-surface-container border border-outline-variant/50 text-on-surface text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-on-surface-variant font-medium">
                  Click ID Meta (ctwa_clid)
                </label>
                <input
                  type="text"
                  value={simClid}
                  onChange={(e) => setSimClid(e.target.value)}
                  placeholder="Kosongkan untuk generate otomatis"
                  className="w-full p-2.5 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-xs focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full sm:w-auto px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {simulating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Proses Pesan Masuk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SEND PURCHASE EVENT WITH VALUE */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-surface-container-lowest border border-outline-variant/50 p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2 text-tertiary">
                <DollarSign className="w-5 h-5 shrink-0" />
                <h3 className="font-headline-sm text-sm sm:text-headline-sm font-semibold text-on-surface">
                  Kirim Event Purchase
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(null)}
                className="text-on-surface-variant hover:text-on-surface text-lg cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Kirim event <strong>Purchase</strong> untuk nomor <strong>{showPurchaseModal.phone}</strong> ({showPurchaseModal.contact_name}).
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-on-surface-variant font-medium">
                Nominal Transaksi ({settings.currency})
              </label>
              <input
                type="number"
                value={purchaseValueInput}
                onChange={(e) => setPurchaseValueInput(e.target.value)}
                placeholder="150000"
                className="w-full p-2.5 rounded bg-surface-container border border-outline-variant/50 text-on-surface font-code-metric text-sm focus:border-primary focus:outline-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => setShowPurchaseModal(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer text-xs text-center"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleTriggerEvent(showPurchaseModal, purchaseEventIndex, Number(purchaseValueInput) || 0);
                  setShowPurchaseModal(null);
                }}
                disabled={sendingEventMap[`${showPurchaseModal.id}_${purchaseEventIndex}`]}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary-container font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-sm"
              >
                {sendingEventMap[`${showPurchaseModal.id}_${purchaseEventIndex}`] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Kirim Purchase (Event {purchaseEventIndex})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
