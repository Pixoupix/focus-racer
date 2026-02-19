"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// ─── Types ───────────────────────────────────────────────────────────────

interface TrendItem {
  month: string;
  count: number;
}

interface RevenueMonth {
  month: string;
  revenue: number;
  orders: number;
  fees: number;
}

interface CreditFlowMonth {
  month: string;
  deductions: number;
  refunds: number;
  purchases: number;
  grants: number;
}

interface DataResponse {
  generatedAt: string;
  period: string;
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    recentlyActive: number;
    signupTrend: TrendItem[];
    newInPeriod: number;
    stripeOnboarded: number;
    byReferralSource: Record<string, number>;
  };
  events: {
    total: number;
    byStatus: Record<string, number>;
    bySportType: Record<string, number>;
    withPhotos: number;
    avgPhotosPerEvent: number;
    creationTrend: TrendItem[];
    newInPeriod: number;
  };
  photos: {
    total: number;
    processed: number;
    blurry: number;
    autoEdited: number;
    faceIndexed: number;
    withBibs: number;
    orphans: number;
    ocrSuccessRate: number;
    avgQualityScore: number;
    qualityDistribution: { range: string; count: number }[];
    byOcrProvider: Record<string, number>;
    creditDeducted: number;
    creditRefunded: number;
    newInPeriod: number;
  };
  bibs: {
    totalDetections: number;
    uniqueBibs: number;
    bySource: Record<string, number>;
    confidenceDistribution: { range: string; count: number }[];
    avgPhotosPerBib: number;
    coverageRate: number;
    topBibs: { number: string; photoCount: number }[];
  };
  sales: {
    totalRevenue: number;
    totalPlatformFees: number;
    netPhotographerRevenue: number;
    ordersByStatus: Record<string, number>;
    totalOrders: number;
    paidOrders: number;
    avgOrderValue: number;
    refundRate: number;
    guestVsRegistered: { guest: number; registered: number };
    revenueByMonth: RevenueMonth[];
    topEventsByRevenue: { eventId: string; eventName: string; revenue: number; orders: number }[];
    revenueByPackType: Record<string, { count: number; revenue: number }>;
    revenueInPeriod: number;
    ordersInPeriod: number;
  };
  credits: {
    totalInCirculation: number;
    transactionsByType: Record<string, { count: number; totalAmount: number }>;
    recentFlow: CreditFlowMonth[];
    transactionsInPeriod: number;
  };
  marketplace: {
    totalListings: number;
    listingsByStatus: Record<string, number>;
    totalApplications: number;
    applicationsByStatus: Record<string, number>;
    acceptanceRate: number;
    avgRating: number;
    totalReviews: number;
    avgBudget: number;
    listingsBySportType: Record<string, number>;
  };
  gdpr: {
    totalRequests: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    totalPhotosDeleted: number;
    totalFacesDeleted: number;
    avgProcessingTimeHours: number;
    pendingCount: number;
  };
  storage: {
    totalPhotos: number;
    withS3Key: number;
    localOnly: number;
    withWebPath: number;
    withThumbnail: number;
    estimatedStorageMB: number;
  };
  downloads: {
    totalDownloads: number;
    ordersWithDownloads: number;
    avgDownloadsPerOrder: number;
    expiredOrders: number;
    neverDownloaded: number;
    downloadDistribution: { range: string; count: number }[];
  };
}

// ─── Constants ───────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "users", label: "Comptes" },
  { id: "events", label: "Events" },
  { id: "photos", label: "Photos & IA" },
  { id: "bibs", label: "Dossards" },
  { id: "sales", label: "Ventes" },
  { id: "credits", label: "Credits" },
  { id: "marketplace", label: "Marketplace" },
  { id: "gdpr", label: "RGPD" },
  { id: "storage", label: "Stockage" },
  { id: "downloads", label: "Downloads" },
];

const QUICK_RANGES = [
  { label: "Aujourd'hui", days: 0 },
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
  { label: "Tout", days: -1 },
];

const ROLE_LABELS: Record<string, string> = {
  PHOTOGRAPHER: "Photographe",
  ORGANIZER: "Organisateur",
  AGENCY: "Agence",
  CLUB: "Club",
  FEDERATION: "Federation",
  ADMIN: "Admin",
  RUNNER: "Coureur",
};

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacle",
  OTHER: "Autre",
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Paye",
  DELIVERED: "Livre",
  REFUNDED: "Rembourse",
  EXPIRED: "Expire",
};

const PACK_TYPE_LABELS: Record<string, string> = {
  SINGLE: "Photo unique",
  PACK_5: "Pack 5",
  PACK_10: "Pack 10",
  ALL_INCLUSIVE: "Tout inclus",
  SANS_PACK: "Sans pack",
};

const LISTING_STATUS_LABELS: Record<string, string> = {
  OPEN: "Ouverte",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminee",
  CANCELLED: "Annulee",
};

const APP_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  ACCEPTED: "Acceptee",
  REJECTED: "Refusee",
  WITHDRAWN: "Retiree",
};

const GDPR_TYPE_LABELS: Record<string, string> = {
  DELETION: "Suppression",
  ACCESS: "Acces",
  RECTIFICATION: "Rectification",
};

const GDPR_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PROCESSING: "En cours",
  COMPLETED: "Terminee",
  REJECTED: "Rejetee",
};

const SOURCE_LABELS: Record<string, string> = {
  ocr: "OCR",
  ocr_aws: "AWS Rekognition",
  ocr_tesseract: "Tesseract",
  face_cluster: "Face Cluster",
  face_recognition: "Face Recognition",
  manual: "Manuel",
};

const REFERRAL_LABELS: Record<string, string> = {
  word_of_mouth: "Bouche a oreille",
  google: "Recherche Google",
  social_media: "Reseaux sociaux",
  event: "Salon / Evenement",
  friend: "Ami / Collegue",
  other: "Autre",
  null: "Non renseigne",
};

const TX_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "Achat",
  DEDUCTION: "Deduction",
  REFUND: "Remboursement",
  ADMIN_GRANT: "Attribution admin",
};

// ─── Color classes (static for Tailwind purge) ──────────────────────────

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string; bar: string; borderL: string }> = {
  users:       { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", bar: "bg-emerald-500", borderL: "border-l-emerald-500" },
  events:      { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    bar: "bg-teal-500",    borderL: "border-l-teal-500" },
  photos:      { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",    bar: "bg-blue-500",    borderL: "border-l-blue-500" },
  bibs:        { bg: "bg-purple-50",  text: "text-purple-600",  border: "border-purple-200",  bar: "bg-purple-500",  borderL: "border-l-purple-500" },
  sales:       { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", bar: "bg-emerald-500", borderL: "border-l-emerald-500" },
  credits:     { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",   bar: "bg-amber-500",   borderL: "border-l-amber-500" },
  marketplace: { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200",  bar: "bg-indigo-500",  borderL: "border-l-indigo-500" },
  gdpr:        { bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200",     bar: "bg-red-500",     borderL: "border-l-red-400" },
  storage:     { bg: "bg-slate-50",   text: "text-slate-600",   border: "border-slate-200",   bar: "bg-slate-500",   borderL: "border-l-slate-500" },
  downloads:   { bg: "bg-cyan-50",    text: "text-cyan-600",    border: "border-cyan-200",    bar: "bg-cyan-500",    borderL: "border-l-cyan-500" },
};

// ─── Sub-components ─────────────────────────────────────────────────────

function SectionHeader({ sectionId, label }: { sectionId: string; label: string }) {
  const c = SECTION_COLORS[sectionId];
  return (
    <div className={`flex items-center gap-3 mb-6 pb-3 border-b ${c.border}`}>
      <div className={`p-2 rounded-lg ${c.bg}`}>
        <div className={`w-5 h-5 rounded ${c.bar} opacity-80`} />
      </div>
      <h2 className="text-xl font-bold text-navy">{label}</h2>
    </div>
  );
}

function KPICard({
  label,
  value,
  subtitle,
  borderColor,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  borderColor: string;
}) {
  return (
    <Card className={`glass-card border-l-4 ${borderColor} overflow-hidden`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-navy">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  label,
  value,
  maxValue,
  barClass,
  suffix,
}: {
  label: string;
  value: number;
  maxValue: number;
  barClass: string;
  suffix?: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-36 shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
        <div
          className={`${barClass} h-5 rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="text-sm font-medium text-navy w-20 text-right shrink-0">
        {value.toLocaleString("fr-FR")}{suffix || ""}
      </span>
    </div>
  );
}

function RecordBars({
  data,
  labelMap,
  barClass,
  suffix,
}: {
  data: Record<string, number>;
  labelMap?: Record<string, string>;
  barClass: string;
  suffix?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {entries.map(([key, val]) => (
        <ProgressBar
          key={key}
          label={labelMap?.[key] || key}
          value={val}
          maxValue={maxVal}
          barClass={barClass}
          suffix={suffix}
        />
      ))}
    </div>
  );
}

function ArrayBars({
  data,
  barClass,
}: {
  data: { range: string; count: number }[];
  barClass: string;
}) {
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <ProgressBar
          key={d.range}
          label={d.range}
          value={d.count}
          maxValue={maxVal}
          barClass={barClass}
        />
      ))}
    </div>
  );
}

function TrendBars({
  data,
  barClass,
  valueKey = "count",
  suffix,
}: {
  data: any[];
  barClass: string;
  valueKey?: string;
  suffix?: string;
}) {
  const maxVal = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const monthLabel = d.month
          ? new Date(d.month + "-01").toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
          : "";
        return (
          <ProgressBar
            key={d.month}
            label={monthLabel}
            value={d[valueKey] || 0}
            maxValue={maxVal}
            barClass={barClass}
            suffix={suffix}
          />
        );
      })}
    </div>
  );
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function fmtEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " \u20ac";
}

function fmtPct(n: number): string {
  return n.toFixed(1) + " %";
}

function fmtStorage(mb: number): string {
  if (mb >= 1024) return (mb / 1024).toFixed(1) + " Go";
  return mb + " Mo";
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function AdminDataPage() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [activeSection, setActiveSection] = useState("users");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange?.from) params.set("from", dateRange.from.toISOString());
      if (dateRange?.to) params.set("to", dateRange.to.toISOString());
      const res = await fetch(`/api/admin/data?${params}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("Failed to fetch data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyQuickRange = (days: number) => {
    if (days === -1) {
      setDateRange(undefined);
    } else {
      const now = new Date();
      const from = days === 0
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getTime() - days * 86400000);
      setDateRange({ from, to: now });
    }
    setCalendarOpen(false);
  };

  // Close calendar on click outside or Escape
  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [calendarOpen]);

  const dateRangeLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM yyyy", { locale: fr })} - ${format(dateRange.to, "dd MMM yyyy", { locale: fr })}`
      : format(dateRange.from, "dd MMM yyyy", { locale: fr })
    : "Toutes les donnees";

  // IntersectionObserver for sticky nav
  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    Object.values(sectionsRef.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [data]);

  const scrollToSection = (id: string) => {
    sectionsRef.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement des donnees...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erreur de chargement des donnees</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-navy">Data</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analytiques plateforme completes
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {new Date(data.generatedAt).toLocaleString("fr-FR")}
          </span>
          <div className="relative" ref={calendarRef}>
            <Button
              variant="outline"
              className="min-w-[240px] justify-start text-left font-normal"
              onClick={() => setCalendarOpen((v) => !v)}
            >
              <svg className="h-4 w-4 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span className="truncate">{dateRangeLabel}</span>
            </Button>
            {calendarOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 rounded-lg border bg-white shadow-lg">
                <div className="flex">
                  <div className="border-r p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Raccourcis</p>
                    {QUICK_RANGES.map((qr) => (
                      <button
                        key={qr.label}
                        onClick={() => applyQuickRange(qr.days)}
                        className="block w-full text-left text-sm px-3 py-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors whitespace-nowrap"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                  <div className="p-3">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        if (range?.from && range?.to) {
                          setTimeout(() => setCalendarOpen(false), 400);
                        }
                      }}
                      numberOfMonths={2}
                      defaultMonth={dateRange?.from || new Date()}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <svg
              className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Rafraichir
          </Button>
        </div>
      </div>

      {/* ─── Sticky Nav ─── */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-200 -mx-8 px-8 mb-8">
        <div className="flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                activeSection === s.id
                  ? `${SECTION_COLORS[s.id].bg} ${SECTION_COLORS[s.id].text}`
                  : "text-muted-foreground hover:bg-slate-100"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Sections ─── */}
      <div className="space-y-16">
        {/* ────── S1: COMPTES / UTILISATEURS ────── */}
        <section id="users" ref={(el) => { sectionsRef.current["users"] = el; }}>
          <SectionHeader sectionId="users" label="Comptes / Utilisateurs" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total comptes" value={fmt(data.users.total)} borderColor="border-l-emerald-500" />
            <KPICard label="Actifs" value={fmt(data.users.active)} borderColor="border-l-emerald-400" subtitle={fmtPct(data.users.total > 0 ? (data.users.active / data.users.total) * 100 : 0)} />
            <KPICard label="Inactifs" value={fmt(data.users.inactive)} borderColor="border-l-red-400" />
            <KPICard label="Actifs 24h" value={fmt(data.users.recentlyActive)} borderColor="border-l-amber-400" subtitle="Derniere activite" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <KPICard label="Nouveaux (periode)" value={fmt(data.users.newInPeriod)} borderColor="border-l-emerald-300" subtitle={dateRangeLabel} />
            <KPICard label="Stripe onboarded" value={fmt(data.users.stripeOnboarded)} borderColor="border-l-indigo-400" subtitle="Photographes connectes Stripe" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Utilisateurs par role</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.users.byRole} labelMap={ROLE_LABELS} barClass="bg-emerald-500" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Inscriptions (12 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.users.signupTrend.length > 0 ? (
                  <TrendBars data={data.users.signupTrend} barClass="bg-emerald-400" />
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnee</p>
                )}
              </CardContent>
            </Card>
          </div>
          {Object.keys(data.users.byReferralSource).length > 0 && (
            <Card className="glass-card mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Source d&apos;acquisition</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.users.byReferralSource} labelMap={REFERRAL_LABELS} barClass="bg-emerald-400" />
              </CardContent>
            </Card>
          )}
        </section>

        {/* ────── S2: EVENEMENTS ────── */}
        <section id="events" ref={(el) => { sectionsRef.current["events"] = el; }}>
          <SectionHeader sectionId="events" label="Evenements" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total" value={fmt(data.events.total)} borderColor="border-l-teal-500" />
            <KPICard label="Publies" value={fmt(data.events.byStatus["PUBLISHED"] || 0)} borderColor="border-l-teal-400" />
            <KPICard label="Brouillons" value={fmt(data.events.byStatus["DRAFT"] || 0)} borderColor="border-l-amber-400" />
            <KPICard label="Archives" value={fmt(data.events.byStatus["ARCHIVED"] || 0)} borderColor="border-l-slate-400" />
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <KPICard label="Avec photos" value={fmt(data.events.withPhotos)} borderColor="border-l-teal-300" />
            <KPICard label="Moy. photos/event" value={data.events.avgPhotosPerEvent} borderColor="border-l-teal-300" />
            <KPICard label="Nouveaux (periode)" value={fmt(data.events.newInPeriod)} borderColor="border-l-teal-300" subtitle={dateRangeLabel} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Par type de sport</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.events.bySportType} labelMap={SPORT_LABELS} barClass="bg-teal-500" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Creation (12 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.events.creationTrend.length > 0 ? (
                  <TrendBars data={data.events.creationTrend} barClass="bg-teal-400" />
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnee</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ────── S3: PHOTOS & IA ────── */}
        <section id="photos" ref={(el) => { sectionsRef.current["photos"] = el; }}>
          <SectionHeader sectionId="photos" label="Photos & Traitement IA" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total photos" value={fmt(data.photos.total)} borderColor="border-l-blue-500" />
            <KPICard label="Traitees" value={fmt(data.photos.processed)} borderColor="border-l-blue-400" subtitle={data.photos.total > 0 ? fmtPct((data.photos.processed / data.photos.total) * 100) : "0 %"} />
            <KPICard label="Floues" value={fmt(data.photos.blurry)} borderColor="border-l-red-400" subtitle={data.photos.total > 0 ? fmtPct((data.photos.blurry / data.photos.total) * 100) : "0 %"} />
            <KPICard label="Faces indexees" value={fmt(data.photos.faceIndexed)} borderColor="border-l-purple-400" subtitle={data.photos.total > 0 ? fmtPct((data.photos.faceIndexed / data.photos.total) * 100) : "0 %"} />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Avec dossards" value={fmt(data.photos.withBibs)} borderColor="border-l-blue-300" />
            <KPICard label="Orphelines" value={fmt(data.photos.orphans)} borderColor="border-l-amber-400" subtitle="Sans dossard" />
            <KPICard label="Taux OCR" value={fmtPct(data.photos.ocrSuccessRate)} borderColor="border-l-blue-300" subtitle="Photos avec dossard / traitees" />
            <KPICard label="Score qualite moy." value={data.photos.avgQualityScore} borderColor="border-l-blue-300" subtitle="Sur 100" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Distribution qualite</CardTitle>
              </CardHeader>
              <CardContent>
                {data.photos.qualityDistribution.length > 0 ? (
                  <ArrayBars data={data.photos.qualityDistribution} barClass="bg-blue-500" />
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnee</p>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Fournisseur OCR</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.photos.byOcrProvider).length > 0 ? (
                  <RecordBars data={data.photos.byOcrProvider} barClass="bg-blue-400" />
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnee</p>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <KPICard label="Credits debites" value={fmt(data.photos.creditDeducted)} borderColor="border-l-amber-400" subtitle="1 credit/photo importee" />
            <KPICard label="Credits rembourses (ancien)" value={fmt(data.photos.creditRefunded)} borderColor="border-l-red-400" subtitle="Historique uniquement" />
          </div>
        </section>

        {/* ────── S4: DOSSARDS ────── */}
        <section id="bibs" ref={(el) => { sectionsRef.current["bibs"] = el; }}>
          <SectionHeader sectionId="bibs" label="Dossards & Detection" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total detections" value={fmt(data.bibs.totalDetections)} borderColor="border-l-purple-500" />
            <KPICard label="Dossards uniques" value={fmt(data.bibs.uniqueBibs)} borderColor="border-l-purple-400" subtitle="Coureurs identifies" />
            <KPICard label="Moy. photos/dossard" value={data.bibs.avgPhotosPerBib} borderColor="border-l-purple-300" />
            <KPICard label="Taux couverture" value={fmtPct(data.bibs.coverageRate)} borderColor="border-l-purple-300" subtitle="Photos avec dossard" />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Par source de detection</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.bibs.bySource} labelMap={SOURCE_LABELS} barClass="bg-purple-500" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Distribution confiance</CardTitle>
              </CardHeader>
              <CardContent>
                <ArrayBars data={data.bibs.confidenceDistribution} barClass="bg-purple-400" />
              </CardContent>
            </Card>
          </div>
          {data.bibs.topBibs.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Top 10 dossards les plus photographies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.bibs.topBibs.map((b, i) => (
                    <div key={b.number} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-navy w-6">{i + 1}.</span>
                      <Badge variant="outline" className="font-mono">
                        #{b.number}
                      </Badge>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="bg-purple-500 h-4 rounded-full"
                          style={{
                            width: `${Math.max(
                              (b.photoCount / (data.bibs.topBibs[0]?.photoCount || 1)) * 100,
                              3
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-navy w-16 text-right">
                        {b.photoCount} photos
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ────── S5: VENTES & FINANCES ────── */}
        <section id="sales" ref={(el) => { sectionsRef.current["sales"] = el; }}>
          <SectionHeader sectionId="sales" label="Ventes & Finances" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Chiffre d'affaires" value={fmtEur(data.sales.totalRevenue)} borderColor="border-l-emerald-500" />
            <KPICard label="Commissions plateforme" value={fmtEur(data.sales.totalPlatformFees)} borderColor="border-l-emerald-400" />
            <KPICard label="Net photographes" value={fmtEur(data.sales.netPhotographerRevenue)} borderColor="border-l-teal-400" />
            <KPICard label="Panier moyen" value={fmtEur(data.sales.avgOrderValue)} borderColor="border-l-teal-300" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total commandes" value={fmt(data.sales.totalOrders)} borderColor="border-l-emerald-300" />
            <KPICard label="Payees" value={fmt(data.sales.paidOrders)} borderColor="border-l-emerald-300" />
            <KPICard label="Taux remboursement" value={fmtPct(data.sales.refundRate)} borderColor="border-l-red-400" />
            <KPICard
              label="Guest vs Inscrit"
              value={`${data.sales.guestVsRegistered.guest} / ${data.sales.guestVsRegistered.registered}`}
              borderColor="border-l-indigo-300"
              subtitle="Acheteurs guest / enregistres"
            />
          </div>
          {data.sales.revenueInPeriod > 0 && (
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <KPICard label="CA (periode)" value={fmtEur(data.sales.revenueInPeriod)} borderColor="border-l-emerald-400" subtitle={dateRangeLabel} />
              <KPICard label="Commandes (periode)" value={fmt(data.sales.ordersInPeriod)} borderColor="border-l-emerald-300" subtitle={dateRangeLabel} />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Commandes par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.sales.ordersByStatus} labelMap={ORDER_STATUS_LABELS} barClass="bg-emerald-500" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Revenue par type de pack</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.sales.revenueByPackType).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(data.sales.revenueByPackType)
                      .sort((a, b) => b[1].revenue - a[1].revenue)
                      .map(([type, info]) => {
                        const maxRev = Math.max(
                          ...Object.values(data.sales.revenueByPackType).map((v) => v.revenue),
                          1
                        );
                        return (
                          <ProgressBar
                            key={type}
                            label={PACK_TYPE_LABELS[type] || type}
                            value={info.revenue}
                            maxValue={maxRev}
                            barClass="bg-emerald-400"
                            suffix={` \u20ac (${info.count})`}
                          />
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune vente</p>
                )}
              </CardContent>
            </Card>
          </div>
          {data.sales.revenueByMonth.length > 0 && (
            <Card className="glass-card mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Revenue mensuel (12 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendBars data={data.sales.revenueByMonth} barClass="bg-emerald-500" valueKey="revenue" suffix=" \u20ac" />
              </CardContent>
            </Card>
          )}
          {data.sales.topEventsByRevenue.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Top 10 evenements par CA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.sales.topEventsByRevenue.map((ev, i) => {
                    const maxRev = data.sales.topEventsByRevenue[0]?.revenue || 1;
                    return (
                      <ProgressBar
                        key={ev.eventId}
                        label={`${i + 1}. ${ev.eventName}`}
                        value={ev.revenue}
                        maxValue={maxRev}
                        barClass="bg-emerald-500"
                        suffix={` \u20ac (${ev.orders} cmd)`}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ────── S6: CREDITS ────── */}
        <section id="credits" ref={(el) => { sectionsRef.current["credits"] = el; }}>
          <SectionHeader sectionId="credits" label="Credits" />
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <KPICard label="Total en circulation" value={fmt(data.credits.totalInCirculation)} borderColor="border-l-amber-500" subtitle="Solde cumule tous utilisateurs" />
            <KPICard label="Transactions (periode)" value={fmt(data.credits.transactionsInPeriod)} borderColor="border-l-amber-400" subtitle={dateRangeLabel} />
            <KPICard
              label="Types de transactions"
              value={Object.keys(data.credits.transactionsByType).length}
              borderColor="border-l-amber-300"
              subtitle="Categories actives"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Transactions par type</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(data.credits.transactionsByType).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(data.credits.transactionsByType).map(([type, info]) => (
                      <div key={type} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="text-sm font-medium">{TX_TYPE_LABELS[type] || type}</span>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{info.count} tx</Badge>
                          <span className="text-sm font-bold text-navy">{fmt(info.totalAmount)} credits</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune transaction</p>
                )}
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Flux credits (12 mois)</CardTitle>
              </CardHeader>
              <CardContent>
                {data.credits.recentFlow.length > 0 ? (
                  <div className="space-y-3">
                    {data.credits.recentFlow.map((m) => {
                      const monthLabel = new Date(m.month + "-01").toLocaleDateString("fr-FR", {
                        month: "short",
                        year: "2-digit",
                      });
                      return (
                        <div key={m.month} className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">{monthLabel}</span>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <span className="text-red-600">-{m.deductions}</span>
                            <span className="text-emerald-600">+{m.refunds}</span>
                            <span className="text-blue-600">+{m.purchases}</span>
                            <span className="text-amber-600">+{m.grants}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <span>Deductions</span>
                      <span>Remb.</span>
                      <span>Achats</span>
                      <span>Grants</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune donnee</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ────── S7: MARKETPLACE ────── */}
        <section id="marketplace" ref={(el) => { sectionsRef.current["marketplace"] = el; }}>
          <SectionHeader sectionId="marketplace" label="Marketplace" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Annonces" value={fmt(data.marketplace.totalListings)} borderColor="border-l-indigo-500" />
            <KPICard label="Candidatures" value={fmt(data.marketplace.totalApplications)} borderColor="border-l-indigo-400" />
            <KPICard label="Taux acceptation" value={fmtPct(data.marketplace.acceptanceRate)} borderColor="border-l-indigo-300" />
            <KPICard label="Note moyenne" value={data.marketplace.avgRating > 0 ? `${data.marketplace.avgRating}/5` : "N/A"} borderColor="border-l-amber-400" subtitle={`${data.marketplace.totalReviews} avis`} />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <KPICard label="Budget moyen" value={data.marketplace.avgBudget > 0 ? fmtEur(data.marketplace.avgBudget) : "N/A"} borderColor="border-l-indigo-300" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Annonces par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.marketplace.listingsByStatus} labelMap={LISTING_STATUS_LABELS} barClass="bg-indigo-500" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Candidatures par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.marketplace.applicationsByStatus} labelMap={APP_STATUS_LABELS} barClass="bg-indigo-400" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Par type de sport</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.marketplace.listingsBySportType} labelMap={SPORT_LABELS} barClass="bg-indigo-300" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ────── S8: RGPD ────── */}
        <section id="gdpr" ref={(el) => { sectionsRef.current["gdpr"] = el; }}>
          <SectionHeader sectionId="gdpr" label="RGPD / Conformite" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total demandes" value={fmt(data.gdpr.totalRequests)} borderColor="border-l-red-400" />
            <KPICard label="En attente" value={fmt(data.gdpr.pendingCount)} borderColor="border-l-amber-400" subtitle={data.gdpr.pendingCount > 0 ? "A traiter" : ""} />
            <KPICard label="Photos supprimees" value={fmt(data.gdpr.totalPhotosDeleted)} borderColor="border-l-red-300" />
            <KPICard label="Faces supprimees" value={fmt(data.gdpr.totalFacesDeleted)} borderColor="border-l-red-300" />
          </div>
          <div className="grid md:grid-cols-1 gap-4 mb-6">
            <KPICard label="Temps traitement moyen" value={data.gdpr.avgProcessingTimeHours > 0 ? `${data.gdpr.avgProcessingTimeHours} h` : "N/A"} borderColor="border-l-slate-400" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Par type de demande</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.gdpr.byType} labelMap={GDPR_TYPE_LABELS} barClass="bg-red-400" />
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <RecordBars data={data.gdpr.byStatus} labelMap={GDPR_STATUS_LABELS} barClass="bg-red-300" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ────── S9: STOCKAGE ────── */}
        <section id="storage" ref={(el) => { sectionsRef.current["storage"] = el; }}>
          <SectionHeader sectionId="storage" label="Stockage" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total photos" value={fmt(data.storage.totalPhotos)} borderColor="border-l-slate-500" />
            <KPICard label="Sur S3" value={fmt(data.storage.withS3Key)} borderColor="border-l-slate-400" subtitle={data.storage.totalPhotos > 0 ? fmtPct((data.storage.withS3Key / data.storage.totalPhotos) * 100) : "0 %"} />
            <KPICard label="Local seul" value={fmt(data.storage.localOnly)} borderColor="border-l-amber-400" />
            <KPICard label="Taille estimee" value={fmtStorage(data.storage.estimatedStorageMB)} borderColor="border-l-slate-300" subtitle="~2.5 Mo/photo (HD+web+thumb)" />
          </div>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Couverture des versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ProgressBar
                  label="Version web"
                  value={data.storage.withWebPath}
                  maxValue={data.storage.totalPhotos}
                  barClass="bg-slate-500"
                  suffix={` (${data.storage.totalPhotos > 0 ? fmtPct((data.storage.withWebPath / data.storage.totalPhotos) * 100) : "0 %"})`}
                />
                <ProgressBar
                  label="Thumbnail"
                  value={data.storage.withThumbnail}
                  maxValue={data.storage.totalPhotos}
                  barClass="bg-slate-400"
                  suffix={` (${data.storage.totalPhotos > 0 ? fmtPct((data.storage.withThumbnail / data.storage.totalPhotos) * 100) : "0 %"})`}
                />
                <ProgressBar
                  label="Sur S3"
                  value={data.storage.withS3Key}
                  maxValue={data.storage.totalPhotos}
                  barClass="bg-slate-300"
                  suffix={` (${data.storage.totalPhotos > 0 ? fmtPct((data.storage.withS3Key / data.storage.totalPhotos) * 100) : "0 %"})`}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ────── S10: TELECHARGEMENTS ────── */}
        <section id="downloads" ref={(el) => { sectionsRef.current["downloads"] = el; }}>
          <SectionHeader sectionId="downloads" label="Telechargements" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard label="Total downloads" value={fmt(data.downloads.totalDownloads)} borderColor="border-l-cyan-500" />
            <KPICard label="Commandes telechargees" value={fmt(data.downloads.ordersWithDownloads)} borderColor="border-l-cyan-400" />
            <KPICard label="Moy. / commande" value={data.downloads.avgDownloadsPerOrder} borderColor="border-l-cyan-300" />
            <KPICard label="Jamais telecharge" value={fmt(data.downloads.neverDownloaded)} borderColor="border-l-amber-400" subtitle="Commandes payees sans download" />
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <KPICard label="Commandes expirees" value={fmt(data.downloads.expiredOrders)} borderColor="border-l-red-400" />
          </div>
          {data.downloads.downloadDistribution.length > 0 && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Distribution des telechargements</CardTitle>
              </CardHeader>
              <CardContent>
                <ArrayBars data={data.downloads.downloadDistribution} barClass="bg-cyan-500" />
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
