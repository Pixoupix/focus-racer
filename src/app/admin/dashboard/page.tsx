"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRoleLabel } from "@/lib/role-helpers";

interface RecentOrder {
  id: string;
  totalAmount: number;
  platformFee: number;
  status: string;
  createdAt: string;
  guestEmail: string | null;
  user: { name: string; email: string } | null;
  event: { name: string };
  _count: { items: number };
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

interface AdminStats {
  totalUsers: number;
  roleStats: Record<string, number>;
  totalEvents: number;
  publishedEvents: number;
  totalPhotos: number;
  totalBibNumbers: number;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  revenue: {
    totalCA: number;
    totalPlatformFees: number;
    totalOrders: number;
    avgOrderValue: number;
    pendingOrders: number;
  };
  recentOrders: RecentOrder[];
  monthlyRevenue: MonthlyRevenue[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          setStats(await response.json());
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (!stats) {
    return <p className="text-destructive">Erreur de chargement des statistiques</p>;
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-navy mb-8">Tableau de bord</h1>

      {/* Revenue KPIs */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card border-l-4 border-l-orange overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Chiffre d&apos;affaires</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange">{stats.revenue.totalCA.toFixed(2)}&euro;</p>
            <p className="text-xs text-muted-foreground mt-1">
              dont {stats.revenue.totalPlatformFees.toFixed(2)}&euro; commission
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-blue-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Commandes payees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{stats.revenue.totalOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Panier moyen : {stats.revenue.avgOrderValue.toFixed(2)}&euro;
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{stats.revenue.pendingOrders}</p>
            <p className="text-xs text-muted-foreground mt-1">commandes non finalisees</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-l-4 border-l-navy overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Evenements publies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-navy">{stats.publishedEvents}</p>
            <p className="text-xs text-muted-foreground mt-1">sur {stats.totalEvents} au total</p>
          </CardContent>
        </Card>
      </div>

      {/* Platform stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Utilisateurs", value: stats.totalUsers },
          { label: "Evenements", value: stats.totalEvents },
          { label: "Photos", value: stats.totalPhotos },
          { label: "Dossards detectes", value: stats.totalBibNumbers },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-navy">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly revenue chart */}
      {stats.monthlyRevenue.length > 0 && (
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="text-navy">Revenus mensuels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.monthlyRevenue.map((m) => {
                const maxRevenue = Math.max(...stats.monthlyRevenue.map((r) => r.revenue), 1);
                const pct = (m.revenue / maxRevenue) * 100;
                const [year, month] = m.month.split("-");
                const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("fr-FR", {
                  month: "short",
                  year: "numeric",
                });
                return (
                  <div key={m.month} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">{label}</span>
                    <div className="flex-1 bg-orange-50 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="gradient-orange h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {m.revenue.toFixed(0)}&euro;
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-20 text-right">
                      {m.orders} cmd{m.orders > 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Recent orders */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-navy">Dernieres commandes</CardTitle>
            <Link href="/admin/payments" className="text-sm text-orange hover:text-orange-dark transition-colors">
              Voir tout
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Aucune commande</p>
            ) : (
              <div className="space-y-3">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-navy">
                        {order.user?.name || order.guestEmail || "Invite"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.event.name} &bull; {order._count.items} photo{order._count.items > 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-navy">{order.totalAmount.toFixed(2)}&euro;</p>
                      <Badge
                        className={
                          order.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {order.status === "PAID" ? "Paye" : "Rembourse"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by role */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-navy">Utilisateurs par role</CardTitle>
            <Link href="/admin/users" className="text-sm text-orange hover:text-orange-dark transition-colors">
              Gerer
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.roleStats).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center p-3 rounded-xl bg-white/50">
                  <span className="text-navy">{getRoleLabel(role)}</span>
                  <Badge className="bg-orange/10 text-orange hover:bg-orange/10">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="mb-8">
        <Link href="/admin/gdpr" className="text-sm text-orange hover:text-orange-dark transition-colors">
          RGPD - Demandes de donnees
        </Link>
      </div>

      {/* Recent users */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-navy">Inscriptions recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentUsers.map((user) => (
              <div key={user.id} className="flex justify-between items-center p-3 rounded-xl bg-white/50 hover:bg-white/80 transition-colors">
                <div>
                  <p className="font-medium text-sm text-navy">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange/30 text-orange">{getRoleLabel(user.role)}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
