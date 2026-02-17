"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewData {
  totalEvents: number;
  eventsWithPurchase: number;
  eventsRegistered: number;
  totalPhotos: number;
  totalSpent: number;
  totalOrders: number;
  avgBasket: number;
  favoriteSport: string | null;
  memberSince: string | null;
}

interface MonthlySpending {
  month: string;
  spent: number;
  orders: number;
  photos: number;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
  sportType: string;
  location: string | null;
  photosPurchased: number;
  amountSpent: number;
  registered: boolean;
}

interface PurchaseItem {
  id: string;
  eventName: string;
  eventDate: string;
  sportType: string;
  photos: number;
  amount: number;
  purchasedAt: string;
}

interface RunnerStats {
  overview: OverviewData;
  sportBreakdown: Record<string, number>;
  monthlySpending: MonthlySpending[];
  events: EventItem[];
  purchaseHistory: PurchaseItem[];
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

const SPORT_ICONS: Record<string, string> = {
  RUNNING: "M13 10V3L4 14h7v7l9-11h-7z",
  TRAIL: "M3 17l6-6 4 4 8-8",
  TRIATHLON: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  CYCLING: "M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z",
  SWIMMING: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
  OBSTACLE: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  OTHER: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
};

const SPORT_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
  RUNNING: { bg: "bg-emerald-50", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  TRAIL: { bg: "bg-amber-50", text: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  TRIATHLON: { bg: "bg-blue-50", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  CYCLING: { bg: "bg-rose-50", text: "text-rose-600", badge: "bg-rose-100 text-rose-700" },
  SWIMMING: { bg: "bg-cyan-50", text: "text-cyan-600", badge: "bg-cyan-100 text-cyan-700" },
  OBSTACLE: { bg: "bg-purple-50", text: "text-purple-600", badge: "bg-purple-100 text-purple-700" },
  OTHER: { bg: "bg-gray-50", text: "text-gray-600", badge: "bg-gray-100 text-gray-700" },
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan",
  "02": "Fév",
  "03": "Mar",
  "04": "Avr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Aoû",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dec",
};

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonKPI() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-14 bg-gray-200 rounded" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
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
  valueColor = "text-navy",
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
    <Card className="glass-card rounded-2xl border-0 hover:shadow-glass-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className={`text-3xl font-bold font-display mt-1 ${valueColor}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
            <div className={iconColor}>{icon}</div>
          </div>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function SpendingChart({ data }: { data: MonthlySpending[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Aucun achat enregistré
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => a.month.localeCompare(b.month));
  const maxSpent = Math.max(...sorted.map(d => d.spent), 1);

  return (
    <div className="flex items-end gap-2 h-40">
      {sorted.map(d => {
        const heightPct = (d.spent / maxSpent) * 100;
        const monthKey = d.month.split("-")[1];
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">{d.spent.toFixed(0)}$</span>
            <div className="w-full flex flex-col justify-end" style={{ height: "100px" }}>
              <div
                className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-700 ease-out min-h-[4px]"
                style={{ height: `${Math.max(heightPct, 3)}%` }}
                title={`${d.month}: ${d.spent.toFixed(2)}$ (${d.photos} photos)`}
              />
            </div>
            <span className="text-xs text-gray-400">{MONTH_LABELS[monthKey] || monthKey}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function RunnerStatisticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [stats, setStats] = useState<RunnerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/stats/runner");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching runner stats:", error);
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
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchStats();
    }
  }, [status, router, fetchStats]);

  const overview = stats?.overview;
  const sportBreakdown = stats?.sportBreakdown || {};
  const totalSportEvents = Object.values(sportBreakdown).reduce((s, c) => s + c, 0);

  const favoriteSportLabel = overview?.favoriteSport
    ? SPORT_LABELS[overview.favoriteSport] || overview.favoriteSport
    : "N/A";
  const favoriteSportColors = overview?.favoriteSport
    ? SPORT_COLORS[overview.favoriteSport] || SPORT_COLORS.OTHER
    : SPORT_COLORS.OTHER;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy">Mes statistiques</h1>
            <p className="text-muted-foreground mt-1">
              Retrouvez un résumé de votre activité sur Focus Racer
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <>
                <SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI />
              </>
            ) : (
              <>
                <KPICard
                  label="Événements"
                  value={overview?.totalEvents || 0}
                  subtitle={`${overview?.eventsRegistered || 0} inscrits`}
                  iconBg="bg-teal-50"
                  iconColor="text-teal-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
                />
                <KPICard
                  label="Photos achetées"
                  value={overview?.totalPhotos || 0}
                  subtitle={`${overview?.totalOrders || 0} commandes`}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
                />
                <KPICard
                  label="Total dépensé"
                  value={`${(overview?.totalSpent || 0).toFixed(2)}$`}
                  subtitle={`Panier moyen: ${(overview?.avgBasket || 0).toFixed(2)}$`}
                  iconBg="bg-green-50"
                  iconColor="text-green-600"
                  valueColor="text-emerald-600"
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>}
                />
                <KPICard
                  label="Sport favori"
                  value={favoriteSportLabel}
                  subtitle={overview?.favoriteSport ? `${sportBreakdown[overview.favoriteSport] || 0} événement(s)` : undefined}
                  iconBg={favoriteSportColors.bg}
                  iconColor={favoriteSportColors.text}
                  icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={SPORT_ICONS[overview?.favoriteSport || "OTHER"] || SPORT_ICONS.OTHER} /></svg>}
                />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Spending Chart */}
            <div className="lg:col-span-2">
              <Card className="glass-card rounded-2xl border-0">
                <CardHeader>
                  <CardTitle className="text-lg font-display text-navy">Dépenses mensuelles</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="h-40 animate-pulse bg-gray-100 rounded-lg" />
                  ) : (
                    <SpendingChart data={stats?.monthlySpending || []} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sport Breakdown */}
            <Card className="glass-card rounded-2xl border-0">
              <CardHeader>
                <CardTitle className="text-lg font-display text-navy">Sports pratiqués</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-6 bg-gray-100 rounded" />
                    ))}
                  </div>
                ) : Object.keys(sportBreakdown).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(sportBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([sport, count]) => {
                        const pct = totalSportEvents > 0 ? (count / totalSportEvents) * 100 : 0;
                        const colors = SPORT_COLORS[sport] || SPORT_COLORS.OTHER;
                        return (
                          <div key={sport}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 font-medium">{SPORT_LABELS[sport] || sport}</span>
                              <span className="text-muted-foreground">{count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                  sport === "RUNNING" ? "bg-emerald-500" :
                                  sport === "TRAIL" ? "bg-amber-500" :
                                  sport === "TRIATHLON" ? "bg-blue-500" :
                                  sport === "CYCLING" ? "bg-rose-500" :
                                  sport === "SWIMMING" ? "bg-cyan-500" :
                                  sport === "OBSTACLE" ? "bg-purple-500" :
                                  "bg-gray-400"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">Aucune donnée</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Purchase History Timeline */}
          <Card className="glass-card rounded-2xl border-0 mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display text-navy">Historique d&apos;achats</CardTitle>
              <Link href="/account/purchases">
                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 rounded-lg">
                  Voir tout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-3">
                      <div className="w-3 h-3 rounded-full bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="h-3 w-28 bg-gray-200 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : (stats?.purchaseHistory || []).length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[17px] top-4 bottom-4 w-px bg-gray-200" />

                  <div className="space-y-1">
                    {(stats?.purchaseHistory || []).map((purchase, index) => {
                      const sportColors = SPORT_COLORS[purchase.sportType] || SPORT_COLORS.OTHER;
                      return (
                        <div key={purchase.id} className="flex items-start gap-4 p-3 relative rounded-xl hover:bg-gray-50/50 transition-colors">
                          {/* Timeline dot */}
                          <div className={`w-[9px] h-[9px] rounded-full mt-1.5 flex-shrink-0 z-10 ring-4 ring-white ${
                            index === 0 ? "bg-emerald-500" : "bg-gray-300"
                          }`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{purchase.eventName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(purchase.purchasedAt).toLocaleDateString("fr-FR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                  {" -- "}
                                  {purchase.photos} photo{purchase.photos > 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge className={sportColors.badge}>
                                  {SPORT_LABELS[purchase.sportType] || purchase.sportType}
                                </Badge>
                                <span className="font-semibold text-sm text-navy">{purchase.amount.toFixed(2)}$</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-4">Aucun achat pour le moment</p>
                  <Link href="/runner">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald rounded-lg">
                      Découvrir les courses
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Events Participated */}
          <Card className="glass-card rounded-2xl border-0 mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-display text-navy">Événements</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
                      <div className="w-12 h-12 rounded-lg bg-gray-200" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : (stats?.events || []).length > 0 ? (
                <div className="space-y-2">
                  {(stats?.events || []).map(event => {
                    const sportColors = SPORT_COLORS[event.sportType] || SPORT_COLORS.OTHER;
                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 group"
                      >
                        <div className={`w-12 h-12 rounded-xl ${sportColors.bg} flex items-center justify-center flex-shrink-0`}>
                          <svg className={`w-6 h-6 ${sportColors.text}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d={SPORT_ICONS[event.sportType] || SPORT_ICONS.OTHER} />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{event.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                            {event.location && ` -- ${event.location}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {event.registered && (
                            <Badge className="bg-teal-100 text-teal-700">Inscrit</Badge>
                          )}
                          {event.photosPurchased > 0 && (
                            <div className="text-right">
                              <p className="text-sm font-semibold text-navy">{event.photosPurchased} photo{event.photosPurchased > 1 ? "s" : ""}</p>
                              <p className="text-xs text-muted-foreground">{event.amountSpent.toFixed(2)}$</p>
                            </div>
                          )}
                          <svg className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <p className="text-muted-foreground mb-4">Aucun événement</p>
                  <Link href="/runner">
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald rounded-lg">
                      Explorer les courses
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member since + Refresh */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            {overview?.memberSince && (
              <p className="text-sm text-muted-foreground">
                Membre depuis {new Date(overview.memberSince).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
              </p>
            )}
            <Button
              variant="outline"
              onClick={fetchStats}
              disabled={isLoading}
              className="text-muted-foreground hover:text-emerald-600 border-gray-200 hover:border-emerald-200 rounded-xl"
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
              Actualiser
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
