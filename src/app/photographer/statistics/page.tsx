"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  totalEvents: number;
  publishedEvents: number;
  totalPhotos: number;
  processedPhotos: number;
  blurryPhotos: number;
  faceIndexedPhotos: number;
  avgQuality: number;
  totalRunners: number;
  credits: number;
  rating: number;
  totalReviews: number;
  memberSince: string | null;
  stripeOnboarded: boolean;
}

interface DetectionData {
  totalBibs: number;
  uniqueBibs: number;
  ocrRate: string;
}

interface SportBreakdownItem {
  sportType: string;
  _count: number;
}

interface EventItem {
  id: string;
  name: string;
  status: string;
  sportType: string;
  date: string;
  _count: { photos: number; orders: number; startListEntries: number };
}

interface StatsData {
  overview: OverviewData;
  credits: { balance: number; totalTransactions: number; totalSpent: number };
  detection: DetectionData;
  sportBreakdown: SportBreakdownItem[];
  events: EventItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course à pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacles",
  OTHER: "Autre",
};

const SPORT_COLORS: Record<string, string> = {
  RUNNING: "bg-emerald-500",
  TRAIL: "bg-amber-500",
  TRIATHLON: "bg-blue-500",
  CYCLING: "bg-rose-500",
  SWIMMING: "bg-cyan-500",
  OBSTACLE: "bg-purple-500",
  OTHER: "bg-gray-400",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PUBLISHED: { label: "Publié", className: "bg-emerald-100 text-emerald-700" },
  DRAFT: { label: "Brouillon", className: "bg-gray-100 text-gray-600" },
  ARCHIVED: { label: "Archivé", className: "bg-teal-100 text-teal-700" },
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonKPI() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
      </div>
      <div className="h-3 w-20 bg-gray-200 rounded mt-3" />
    </div>
  );
}

function SkeletonBlock({ height = "h-48" }: { height?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-card p-6 animate-pulse ${height}`}>
      <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-3/4 bg-gray-100 rounded" />
        <div className="h-4 w-1/2 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPICard({
  label,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  valueColor = "text-gray-900",
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <Card className="bg-white border-0 shadow-card rounded-2xl hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className={`text-3xl font-bold font-display mt-1 ${valueColor}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
        {subtitle && <p className="text-sm text-gray-500 mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({
  label,
  value,
  max,
  color = "bg-emerald-500",
  suffix = "%",
}: {
  label: string;
  value: number;
  max: number;
  color?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-900 font-semibold">
          {suffix === "%" ? `${pct.toFixed(1)}%` : `${value}${suffix}`}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function StatisticsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "events">("overview");

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/stats/photographer");
      if (!res.ok) {
        throw new Error("Erreur serveur");
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session, fetchStats]);

  // Derived metrics
  const overview = stats?.overview;
  const detection = stats?.detection;
  const events = stats?.events || [];

  const draftEvents = events.filter(e => e.status === "DRAFT").length;
  const archivedEvents = events.filter(e => e.status === "ARCHIVED").length;

  const avgRunnersPerEvent = overview && overview.totalEvents > 0
    ? (overview.totalRunners / overview.totalEvents).toFixed(1)
    : "0";
  const avgPhotosPerEvent = overview && overview.totalEvents > 0
    ? (overview.totalPhotos / overview.totalEvents).toFixed(0)
    : "0";

  const totalSportEvents = (stats?.sportBreakdown || []).reduce((s, b) => s + b._count, 0);

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  const tabs = [
    { id: "overview" as const, label: "Vue d'ensemble", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )},
    { id: "ai" as const, label: "Performance IA", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    )},
    { id: "events" as const, label: "Événements", icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    )},
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900">Statistiques</h1>
        <p className="text-gray-500 mt-1">Analysez les performances de vos événements et de votre activité</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================= */}
      {/* TAB: Vue d'ensemble */}
      {/* ============================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
                <SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
              </>
            ) : (
              <>
                <KPICard
                  label="Événements"
                  value={overview?.totalEvents || 0}
                  subtitle={`${overview?.publishedEvents || 0} publiés`}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
                />
                <KPICard
                  label="Photos"
                  value={overview?.totalPhotos || 0}
                  subtitle={`${overview?.processedPhotos || 0} traitées`}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
                />
                <KPICard
                  label="Qualité moyenne"
                  value={`${(overview?.avgQuality || 0).toFixed(0)}%`}
                  subtitle={`${overview?.blurryPhotos || 0} floues détectées`}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
                />
                <KPICard
                  label="Dossards détectés"
                  value={detection?.totalBibs || 0}
                  subtitle={`${detection?.uniqueBibs || 0} uniques`}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" /></svg>}
                />
                <KPICard
                  label="Coureurs inscrits"
                  value={overview?.totalRunners || 0}
                  subtitle={`~${avgRunnersPerEvent} par événement`}
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
                />
                <KPICard
                  label="Note moyenne"
                  value={overview?.rating ? `${overview.rating.toFixed(1)}/5` : "N/A"}
                  subtitle={`${overview?.totalReviews || 0} avis`}
                  iconBg="bg-yellow-50"
                  iconColor="text-yellow-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>}
                />
              </>
            )}
          </div>

          {/* Engagement Section */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="bg-white border-0 shadow-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-display text-gray-900">Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-4 bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4 rounded-xl bg-gray-50">
                      <p className="text-2xl font-bold font-display text-gray-900">{avgRunnersPerEvent}</p>
                      <p className="text-sm text-gray-500 mt-1">Coureurs / événement</p>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-gray-50">
                      <p className="text-2xl font-bold font-display text-gray-900">{avgPhotosPerEvent}</p>
                      <p className="text-sm text-gray-500 mt-1">Photos / événement</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credits */}
            <Card className="bg-white border-0 shadow-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-display text-gray-900">Crédits IA</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-xl" />
                    <div className="h-4 bg-gray-100 rounded" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50">
                      <p className="text-sm text-gray-500">Solde actuel</p>
                      <p className="text-3xl font-bold font-display text-emerald-600">{stats?.credits.balance || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">crédits</p>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Transactions totales</span>
                      <span className="font-medium text-gray-900">{stats?.credits.totalTransactions || 0}</span>
                    </div>
                    {overview?.memberSince && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Membre depuis</span>
                        <span className="font-medium text-gray-900">
                          {new Date(overview.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                        </span>
                      </div>
                    )}
                    {!overview?.stripeOnboarded && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <p className="text-xs text-amber-700">
                          Stripe Connect non configuré. Configurez-le pour recevoir vos paiements.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Performance IA */}
      {/* ============================================================= */}
      {activeTab === "ai" && (
        <div className="space-y-8">
          {/* AI KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              <>
                <SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
              </>
            ) : (
              <>
                <KPICard
                  label="Photos traitées"
                  value={overview?.processedPhotos || 0}
                  subtitle={`sur ${overview?.totalPhotos || 0} total`}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <KPICard
                  label="Photos floues"
                  value={overview?.blurryPhotos || 0}
                  subtitle={overview && overview.totalPhotos > 0 ? `${((overview.blurryPhotos / overview.totalPhotos) * 100).toFixed(1)}% du total` : "0%"}
                  iconBg="bg-red-50"
                  iconColor="text-red-500"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
                />
                <KPICard
                  label="Visages indexés"
                  value={overview?.faceIndexedPhotos || 0}
                  subtitle="Reconnaissance faciale"
                  iconBg="bg-purple-50"
                  iconColor="text-purple-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>}
                />
                <KPICard
                  label="Taux OCR"
                  value={`${detection?.ocrRate || "0"}%`}
                  subtitle={`${detection?.totalBibs || 0} dossards détectés`}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /></svg>}
                />
              </>
            )}
          </div>

          {/* Progress bars */}
          <Card className="bg-white border-0 shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Métriques de traitement</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-6 animate-pulse">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i}>
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                      <div className="h-2.5 bg-gray-100 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <ProgressBar
                    label="Photos traitées"
                    value={overview?.processedPhotos || 0}
                    max={overview?.totalPhotos || 1}
                    color="bg-emerald-500"
                  />
                  <ProgressBar
                    label="Taux de flou"
                    value={overview?.blurryPhotos || 0}
                    max={overview?.totalPhotos || 1}
                    color="bg-red-400"
                  />
                  <ProgressBar
                    label="Visages indexés"
                    value={overview?.faceIndexedPhotos || 0}
                    max={overview?.totalPhotos || 1}
                    color="bg-purple-500"
                  />
                  <ProgressBar
                    label="Détection OCR"
                    value={detection?.totalBibs || 0}
                    max={overview?.totalPhotos || 1}
                    color="bg-amber-500"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Tips */}
          <Card className="bg-white border-0 shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Conseils pour améliorer la détection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Dossards bien visibles</p>
                  <p className="text-xs text-gray-600 mt-1">Photographiez les coureurs de face ou de 3/4 pour maximiser la détection des dossards par l&apos;IA.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Bonne luminosité</p>
                  <p className="text-xs text-gray-600 mt-1">Évitez les contre-jours et les zones trop sombres. L&apos;IA fonctionne mieux avec un éclairage uniforme.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50">
                <svg className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Reconnaissance faciale incluse</p>
                  <p className="text-xs text-gray-600 mt-1">Le traitement IA (1 crédit/photo) inclut l&apos;OCR dossards et la reconnaissance faciale pour lier automatiquement les photos orphelines.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB: Événements */}
      {/* ============================================================= */}
      {activeTab === "events" && (
        <div className="space-y-8">
          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {isLoading ? (
              <>
                <SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
              </>
            ) : (
              <>
                <Card className="bg-white border-0 shadow-card rounded-2xl">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold font-display text-gray-900">{overview?.publishedEvents || 0}</p>
                    <p className="text-sm text-gray-500 mt-1">Publiés</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-0 shadow-card rounded-2xl">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold font-display text-gray-900">{draftEvents}</p>
                    <p className="text-sm text-gray-500 mt-1">Brouillons</p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-0 shadow-card rounded-2xl">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                    <p className="text-3xl font-bold font-display text-gray-900">{archivedEvents}</p>
                    <p className="text-sm text-gray-500 mt-1">Archivés</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Sport Type Breakdown */}
          <Card className="bg-white border-0 shadow-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Répartition par sport</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-gray-100 rounded" />
                  ))}
                </div>
              ) : (stats?.sportBreakdown || []).length > 0 ? (
                <div className="space-y-3">
                  {(stats?.sportBreakdown || [])
                    .sort((a, b) => b._count - a._count)
                    .map(item => {
                      const pct = totalSportEvents > 0 ? (item._count / totalSportEvents) * 100 : 0;
                      return (
                        <div key={item.sportType}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 font-medium">{SPORT_LABELS[item.sportType] || item.sportType}</span>
                            <span className="text-gray-500">{item._count} événement{item._count > 1 ? "s" : ""} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${SPORT_COLORS[item.sportType] || "bg-gray-400"} transition-all duration-700 ease-out`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">Aucun événement</p>
              )}
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="bg-white border-0 shadow-card rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display text-gray-900">Vos événements</CardTitle>
              <Badge className="bg-gray-100 text-gray-600">{events.length} total</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="space-y-2">
                  {events.map(event => {
                    const statusInfo = STATUS_LABELS[event.status] || STATUS_LABELS.DRAFT;
                    return (
                      <div key={event.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                          {event.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(event.date).toLocaleDateString("fr-FR")} -- {SPORT_LABELS[event.sportType] || event.sportType}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500">{event._count.photos} photos</p>
                            <p className="text-xs text-gray-500">{event._count.orders} ventes</p>
                          </div>
                          <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">Aucun événement</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          onClick={fetchStats}
          disabled={isLoading}
          className="text-gray-500 hover:text-emerald-600 border-gray-200 hover:border-emerald-200 rounded-xl"
        >
          {isLoading ? (
            <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          )}
          Actualiser les statistiques
        </Button>
      </div>
    </div>
  );
}
