"use client";

import React, { useState } from "react";
import {
  TrendingUp,
  BadgeCheck,
  CheckCircle2,
  ShieldCheck,
  LineChart,
  Download,
  Check,
  Terminal,
  Server,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export default function DashboardOverview() {
  const [activePayloadFilter, setActivePayloadFilter] = useState<
    "all" | "success" | "dropped" | "warnings"
  >("all");
  const [isRotating, setIsRotating] = useState(false);
  const [rotateMessage, setRotateMessage] = useState<string | null>(null);

  const handleRotateCredentials = () => {
    setIsRotating(true);
    setRotateMessage(null);
    setTimeout(() => {
      setIsRotating(false);
      setRotateMessage("Kredensial berhasil dirotasi & Redis cache dibersihkan!");
      setTimeout(() => setRotateMessage(null), 3500);
    }, 1200);
  };

  const payloadLogs = [
    {
      id: "pay-1",
      type: "success",
      event: "Purchase",
      endpoint: "graph.facebook.com/v19.0",
      status: "200 OK",
      time: "14:23:48.102 UTC",
      eventId: "ord_98412894_ch7",
      ip: "172.56.21.90 (Cloudflare Edge)",
      hash: "9a8e0f1...48b (SHA-256 Valid)",
      fbp: "fb.1.171292.89410",
      fbc: "fb.1...",
      borderClass: "border-tertiary",
    },
    {
      id: "pay-2",
      type: "success",
      event: "AddToCart",
      endpoint: "graph.facebook.com/v19.0",
      status: "200 OK",
      time: "14:23:47.884 UTC",
      eventId: "cart_481940_p9",
      ip: "198.51.100.44 (US East)",
      ua: "Mozilla/5.0 (iPhone; CPU OS 17...)",
      fbp: "fb.1.171092.33921",
      borderClass: "border-primary",
    },
    {
      id: "pay-3",
      type: "dropped",
      event: "InitiateCheckout",
      endpoint: "Redis Cache Evaluator",
      status: "DEDUPED",
      time: "14:23:46.901 UTC",
      note: "status: Identical event_id (checkout_884920) observed via Web Pixel within 420ms window. Server event enriched, browser instance resolved.",
      borderClass: "border-secondary-container",
    },
    {
      id: "pay-4",
      type: "success",
      event: "ViewContent",
      endpoint: "graph.facebook.com/v19.0",
      status: "200 OK",
      time: "14:23:45.319 UTC",
      eventId: "vc_001928_live",
      contentName: "Pro Performance Runner Sneakers",
      fbp: "fb.1.171292.00192",
      latency: "34ms (Meta ACK)",
      borderClass: "border-primary",
    },
  ];

  const filteredLogs = payloadLogs.filter((log) => {
    if (activePayloadFilter === "all") return true;
    if (activePayloadFilter === "success") return log.type === "success";
    if (activePayloadFilter === "dropped") return log.type === "dropped";
    if (activePayloadFilter === "warnings") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* TOP METRIC CARDS (Bento Grid: 4 Core CAPI Metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Metric Card 1: Total Processed Events */}
        <div className="bg-surface-container-low border border-primary/20 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-sm font-label-sm text-outline tracking-wider uppercase font-semibold">
                Total Processed Events
              </span>
              <span className="flex items-center gap-1 font-code-metric text-[11px] text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3 h-3" />
                +12.4% vs browser
              </span>
            </div>
            <div className="text-display-lg font-display-lg text-on-surface tracking-tight font-code-metric">
              1,420,890
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <div className="flex justify-between text-body-sm font-body-sm text-on-surface-variant font-code-metric mb-1.5">
              <span>Server CAPI (58%)</span>
              <span>Browser (42%)</span>
            </div>
            {/* Dual-tone Pipeline Distribution Bar */}
            <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex">
              <div className="h-full bg-primary-container glow-cyan" style={{ width: "58%" }} />
              <div className="h-full bg-secondary-container" style={{ width: "42%" }} />
            </div>
          </div>
        </div>

        {/* Metric Card 2: EMQ Average Score */}
        <div className="bg-surface-container-low border border-primary/20 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-sm font-label-sm text-outline tracking-wider uppercase font-semibold">
                Event Match Quality (EMQ)
              </span>
              <span className="flex items-center gap-1 font-code-metric text-[11px] text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded font-semibold">
                <BadgeCheck className="w-3 h-3" />
                HIGH QUALITY
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-display-lg font-display-lg text-on-surface tracking-tight font-code-metric">
                8.7
              </span>
              <span className="text-headline-sm font-headline-sm text-outline font-code-metric">
                / 10.0
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <div className="flex flex-wrap gap-1 text-[10px] font-code-metric text-on-surface-variant">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-tertiary">
                em: 89%
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-tertiary">
                ph: 74%
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-primary">
                fbp: 99%
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/30 text-primary">
                fbc: 81%
              </span>
            </div>
          </div>
        </div>

        {/* Metric Card 3: Deduplication Rate */}
        <div className="bg-surface-container-low border border-primary/20 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-sm font-label-sm text-outline tracking-wider uppercase font-semibold">
                Deduplication Success
              </span>
              <span className="flex items-center gap-1 font-code-metric text-[11px] text-tertiary bg-tertiary/10 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3" />
                Optimal
              </span>
            </div>
            <div className="text-display-lg font-display-lg text-on-surface tracking-tight font-code-metric">
              99.4%
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <div className="flex items-center justify-between text-body-sm font-body-sm font-code-metric">
              <span className="text-on-surface-variant">Duplicate Merged:</span>
              <span className="text-primary font-semibold">14,200 events</span>
            </div>
            <p className="text-[11px] text-outline font-code-metric mt-1 truncate">
              Key: event_name + event_id match
            </p>
          </div>
        </div>

        {/* Metric Card 4: Attributed Synced Revenue */}
        <div className="bg-surface-container-low border border-primary/20 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-primary/40 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-sm font-label-sm text-outline tracking-wider uppercase font-semibold">
                Attributed Synced Revenue
              </span>
              <span className="flex items-center gap-1 font-code-metric text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">
                +18.6% ROAS
              </span>
            </div>
            <div className="text-display-lg font-display-lg text-on-surface tracking-tight font-code-metric text-tertiary">
              $482,920
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-outline-variant/20">
            <div className="flex items-center justify-between text-body-sm font-body-sm font-code-metric">
              <span className="text-on-surface-variant">Verified Server Purchases:</span>
              <span className="text-on-surface font-semibold">24,190 orders</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-tertiary">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Cryptographic Payload Integrity</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN SECTION 1: Standard Meta Events EMQ Breakdown & Deduplication Matrix */}
      <section
        className="bg-surface-container-low border border-primary/20 rounded-xl p-5 space-y-4"
        id="emq-breakdown"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
          <div>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface flex items-center gap-2">
              <LineChart className="text-primary w-5 h-5" />
              Meta Standard Events Telemetry &amp; EMQ Breakdown
            </h2>
            <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
              Breakdown of primary conversion funnel endpoints evaluated by Meta Graph Event Match Quality scoring algorithms.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-code-metric">
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface border border-outline-variant/30 flex items-center gap-1 hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <span className="text-outline">Sync interval: 500ms</span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left font-body-md border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-outline-variant/30 text-label-sm font-label-sm text-outline uppercase font-code-metric">
                <th className="py-2.5 px-3">Event Name</th>
                <th className="py-2.5 px-3">Processed Count</th>
                <th className="py-2.5 px-3">EMQ Score</th>
                <th className="py-2.5 px-3">Key Match Parameters</th>
                <th className="py-2.5 px-3">Deduplication</th>
                <th className="py-2.5 px-3">Meta Graph Response</th>
                <th className="py-2.5 px-3 text-right">Avg Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs font-code-metric">
              {/* Row 1: Purchase */}
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="py-3 px-3 font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span>Purchase</span>
                  <span className="text-[10px] text-tertiary bg-tertiary/10 px-1 py-0.5 rounded">
                    Primary KPI
                  </span>
                </td>
                <td className="py-3 px-3 font-medium text-on-surface">24,190</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-tertiary text-sm">9.1</span>
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary" style={{ width: "91%" }} />
                    </div>
                    <span className="text-[10px] text-tertiary font-medium">Excellent</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-on-surface-variant">
                  <span className="text-on-surface font-semibold">em, ph, fbp, fbc, ip, ua</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-tertiary font-semibold">99.8%</span>{" "}
                  <span className="text-outline text-[11px]">(48 dups dropped)</span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-on-surface font-medium">38ms</td>
              </tr>

              {/* Row 2: InitiateCheckout */}
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="py-3 px-3 font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span>InitiateCheckout</span>
                </td>
                <td className="py-3 px-3 font-medium text-on-surface">68,430</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">8.6</span>
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "86%" }} />
                    </div>
                    <span className="text-[10px] text-primary font-medium">Good</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-on-surface-variant">
                  <span className="text-on-surface">em, ph, fbp, fbc, ip</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-tertiary font-semibold">99.2%</span>{" "}
                  <span className="text-outline text-[11px]">(547 dups dropped)</span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-on-surface font-medium">41ms</td>
              </tr>

              {/* Row 3: AddToCart */}
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="py-3 px-3 font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>AddToCart</span>
                </td>
                <td className="py-3 px-3 font-medium text-on-surface">142,500</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">8.4</span>
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "84%" }} />
                    </div>
                    <span className="text-[10px] text-primary font-medium">Good</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-on-surface-variant">
                  <span className="text-on-surface">fbp, fbc, client_ip, ua</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-tertiary font-semibold">98.9%</span>{" "}
                  <span className="text-outline text-[11px]">(1,568 dups dropped)</span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-on-surface font-medium">44ms</td>
              </tr>

              {/* Row 4: ViewContent */}
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="py-3 px-3 font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>ViewContent</span>
                </td>
                <td className="py-3 px-3 font-medium text-on-surface">890,200</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary text-sm">8.2</span>
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "82%" }} />
                    </div>
                    <span className="text-[10px] text-primary font-medium">Good</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-on-surface-variant">
                  <span className="text-on-surface">fbp, client_ip, user_agent</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-tertiary font-semibold">99.5%</span>{" "}
                  <span className="text-outline text-[11px]">(4,450 dups dropped)</span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-on-surface font-medium">39ms</td>
              </tr>

              {/* Row 5: Lead */}
              <tr className="hover:bg-primary/5 transition-colors group">
                <td className="py-3 px-3 font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary" />
                  <span>Lead</span>
                </td>
                <td className="py-3 px-3 font-medium text-on-surface">15,300</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-tertiary text-sm">9.4</span>
                    <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary" style={{ width: "94%" }} />
                    </div>
                    <span className="text-[10px] text-tertiary font-medium">Great</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-on-surface-variant">
                  <span className="text-on-surface font-semibold">em, ph, fn, ln, fbp, fbc</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-tertiary font-semibold">99.9%</span>{" "}
                  <span className="text-outline text-[11px]">(15 dups dropped)</span>
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 text-tertiary bg-tertiary/10 px-2 py-0.5 rounded">
                    <Check className="w-3 h-3" />
                    200 OK
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-on-surface font-medium">35ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* TWO COLUMN SECTION: Live Payload Inspector & Infrastructure Topology */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: Live Payload Inspector & Diagnostic Log */}
        <section
          className="lg:col-span-2 bg-surface-container-low border border-primary/20 rounded-xl p-5 flex flex-col justify-between"
          id="payload-logs"
        >
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Terminal className="text-primary w-5 h-5" />
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Live Payload Inspector &amp; Diagnostic Stream
                </h3>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center gap-1.5 text-xs font-code-metric">
                <button
                  type="button"
                  onClick={() => setActivePayloadFilter("all")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activePayloadFilter === "all"
                      ? "bg-primary/20 text-primary font-medium border border-primary/30"
                      : "bg-surface-container-high text-outline hover:text-on-surface"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActivePayloadFilter("success")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activePayloadFilter === "success"
                      ? "bg-primary/20 text-primary font-medium border border-primary/30"
                      : "bg-surface-container-high text-outline hover:text-on-surface"
                  }`}
                >
                  Success (200)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePayloadFilter("dropped")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activePayloadFilter === "dropped"
                      ? "bg-primary/20 text-primary font-medium border border-primary/30"
                      : "bg-surface-container-high text-outline hover:text-on-surface"
                  }`}
                >
                  Dropped (Deduplicated)
                </button>
                <button
                  type="button"
                  onClick={() => setActivePayloadFilter("warnings")}
                  className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    activePayloadFilter === "warnings"
                      ? "bg-primary/20 text-primary font-medium border border-primary/30"
                      : "bg-surface-container-high text-outline hover:text-on-surface"
                  }`}
                >
                  Warnings
                </button>
              </div>
            </div>

            {/* Terminal / Event Stream Container */}
            <div className="space-y-2 font-code-metric text-xs custom-scrollbar max-h-[360px] overflow-y-auto pr-1">
              {filteredLogs.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded bg-surface-container-lowest border-l-2 ${item.borderClass} border-r border-t border-b border-outline-variant/20 hover:bg-surface-container-high/40 transition-colors`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          item.status === "DEDUPED"
                            ? "text-secondary"
                            : "text-tertiary"
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-outline">{item.endpoint}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          item.status === "DEDUPED"
                            ? "bg-secondary-container/20 text-secondary"
                            : "bg-surface-container text-on-surface"
                        }`}
                      >
                        {item.event}
                      </span>
                    </div>
                    <span className="text-outline text-[11px]">{item.time}</span>
                  </div>

                  {item.note ? (
                    <div className="text-[11px] text-on-surface-variant">
                      <p>{item.note}</p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-on-surface-variant grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-0.5">
                      {item.eventId && (
                        <div>
                          <span className="text-outline">event_id:</span>{" "}
                          <span className="text-primary font-medium">{item.eventId}</span>
                        </div>
                      )}
                      {item.ip && (
                        <div>
                          <span className="text-outline">client_ip:</span>{" "}
                          <span className="text-on-surface">{item.ip}</span>
                        </div>
                      )}
                      {item.hash && (
                        <div>
                          <span className="text-outline">em_hash:</span>{" "}
                          <span className="text-on-surface truncate">{item.hash}</span>
                        </div>
                      )}
                      {item.contentName && (
                        <div>
                          <span className="text-outline">content_name:</span>{" "}
                          <span className="text-on-surface">{item.contentName}</span>
                        </div>
                      )}
                      {item.fbp && (
                        <div>
                          <span className="text-outline">fbp:</span>{" "}
                          <span className="text-on-surface">{item.fbp}</span>
                          {item.fbc ? (
                            <>
                              {" "}
                              | <span className="text-outline">fbc:</span>{" "}
                              <span className="text-on-surface">{item.fbc}</span>
                            </>
                          ) : null}
                        </div>
                      )}
                      {item.latency && (
                        <div>
                          <span className="text-outline">latency:</span>{" "}
                          <span className="text-tertiary">{item.latency}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Micro Tools */}
          <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs font-code-metric">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <CheckCircle2 className="w-4 h-4 text-tertiary" />
              <span>Payload schema matches Meta Conversions API specifications strictly.</span>
            </div>
            <button
              type="button"
              className="text-primary hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Launch Live Debugger Shell</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* SECTION 3: Server Infrastructure & Redundancy Widget */}
        <section
          className="bg-surface-container-low border border-primary/20 rounded-xl p-5 flex flex-col justify-between space-y-4"
          id="infrastructure"
        >
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4">
              <div className="flex items-center gap-2">
                <Server className="text-primary w-5 h-5" />
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Infrastructure Health
                </h3>
              </div>
              <span className="text-[10px] font-code-metric px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-semibold">
                ALL OPERATIONAL
              </span>
            </div>

            {/* Health Stacks */}
            <div className="space-y-3 font-code-metric text-xs">
              {/* Stack 1: Cloudflare Gateway Worker */}
              <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    Cloudflare Gateway Endpoint
                  </span>
                  <span className="text-tertiary font-medium">100% Active</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Routing: Global Edge (275+ PoPs)</span>
                  <span>Avg RTT: 12ms</span>
                </div>
              </div>

              {/* Stack 2: Redis Deduplication Layer */}
              <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    Redis Event Deduplication Cluster
                  </span>
                  <span className="text-tertiary font-medium">Synced</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>TTL Cache Window: 48 Hours</span>
                  <span>Memory: 1.4 GB / 8 GB</span>
                </div>
              </div>

              {/* Stack 3: Meta CAPI Access Token Sentinel */}
              <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    System User Access Token
                  </span>
                  <span className="text-primary font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>Permissions: ads_management</span>
                  <span className="text-tertiary font-medium">Expires in 58 days</span>
                </div>
              </div>

              {/* Stack 4: Fallback Queue Buffer */}
              <div className="p-3 rounded bg-surface-container-lowest border border-outline-variant/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    AWS SQS Dead-Letter Buffer
                  </span>
                  <span className="text-outline">0 queued (Clear)</span>
                </div>
                <div className="text-[11px] text-on-surface-variant">
                  <span>Zero packet loss auto-retry configured.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <div className="pt-3 border-t border-outline-variant/20 space-y-2">
            {rotateMessage && (
              <div className="p-2 rounded bg-tertiary-container/20 border border-tertiary/40 text-tertiary text-xs font-code-metric flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{rotateMessage}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleRotateCredentials}
              disabled={isRotating}
              className="w-full py-2 px-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-code-metric font-medium border border-outline-variant/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-75"
            >
              <RotateCcw className={`w-4 h-4 text-primary ${isRotating ? "animate-spin" : ""}`} />
              <span>
                {isRotating
                  ? "Rotating Credentials & Purging Cache..."
                  : "Rotate Credentials & Purge Dedup Cache"}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
