"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalEvents: number;
  publishedEvents: number;
  totalPhotos: number;
  totalBibNumbers: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  monthlyRevenue: { month: string; revenue: number; orders: number }[];
  topEvents: { id: string; name: string; photos: number; orders: number; revenue: number }[];
}

// Skeleton component
function SkeletonStat() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-16 bg-gray-200 rounded" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
      </div>
      <div className="h-3 w-24 bg-gray-200 rounded mt-3" />
    </div>
  );
}

export default function StatisticsPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const eventsRes = await fetch("/api/events");
        if (eventsRes.ok) {
          const events = await eventsRes.json();
          const totalPhotos = events.reduce((sum: number, e: { _count?: { photos?: number } }) => sum + (e._count?.photos || 0), 0);
          const publishedCount = events.filter((e: { status: string }) => e.status === "PUBLISHED").length;

          setStats({
            totalEvents: events.length,
            publishedEvents: publishedCount,
            totalPhotos,
            totalBibNumbers: 0,
            totalOrders: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            monthlyRevenue: [],
            topEvents: events.slice(0, 5).map((e: { id: string; name: string; _count?: { photos?: number } }) => ({
              id: e.id,
              name: e.name,
              photos: e._count?.photos || 0,
              orders: 0,
              revenue: 0,
            })),
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Statistiques</h1>
        <p className="text-gray-500 mt-1">Analysez les performances de vos evenements</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </>
        ) : (
          <>
            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Evenements</p>
                    <p className="text-3xl font-bold font-display text-gray-900 mt-1">{stats?.totalEvents || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-success mt-2">
                  {stats?.publishedEvents || 0} publies
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Photos</p>
                    <p className="text-3xl font-bold font-display text-gray-900 mt-1">{stats?.totalPhotos || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {stats?.totalBibNumbers || 0} dossards detectes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Commandes</p>
                    <p className="text-3xl font-bold font-display text-gray-900 mt-1">{stats?.totalOrders || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Panier moyen: {(stats?.avgOrderValue || 0).toFixed(2)}€
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Revenus</p>
                    <p className="text-3xl font-bold font-display text-emerald mt-1">{(stats?.totalRevenue || 0).toFixed(2)}€</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Revenus totaux
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top events */}
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Top evenements</CardTitle>
            <CardDescription className="text-gray-500">Vos evenements les plus performants</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.topEvents && stats.topEvents.length > 0 ? (
              <div className="space-y-4">
                {stats.topEvents.map((event, index) => (
                  <div key={event.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{event.name}</p>
                      <p className="text-sm text-gray-500">{event.photos} photos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald">{event.revenue.toFixed(2)}€</p>
                      <p className="text-xs text-gray-500">{event.orders} ventes</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 py-4 text-center">Aucune donnee disponible</p>
            )}
          </CardContent>
        </Card>

        {/* Performance tips */}
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Conseils</CardTitle>
            <CardDescription className="text-gray-500">Optimisez vos performances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-teal-50 hover:bg-teal-100 transition-colors">
              <svg className="w-5 h-5 text-teal mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 text-sm">Importez votre start-list</p>
                <p className="text-xs text-gray-600 mt-1">Les coureurs seront notifies automatiquement quand leurs photos seront disponibles.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-success-light hover:bg-green-100 transition-colors">
              <svg className="w-5 h-5 text-success mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 text-sm">Utilisez le mode Live</p>
                <p className="text-xs text-gray-600 mt-1">Uploadez vos photos en direct pendant la course pour maximiser les ventes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-light hover:bg-emerald-100 transition-colors">
              <svg className="w-5 h-5 text-emerald mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
              </svg>
              <div>
                <p className="font-medium text-gray-900 text-sm">Creez des packs attractifs</p>
                <p className="text-xs text-gray-600 mt-1">Les packs all-inclusive generent 3x plus de revenus en moyenne.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
