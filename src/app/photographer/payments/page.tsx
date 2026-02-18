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

interface RevenueData {
  total: number;
  platformFees: number;
  net: number;
  paidOrders: number;
  avgBasket: number;
  serviceFees: number;
  stripeFees: number;
  photographerPayout: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

interface TopEvent {
  name: string;
  date: string;
  revenue: number;
  orders: number;
}

interface ConnectStatus {
  hasAccount: boolean;
  isOnboarded: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

interface OrderRow {
  id: string;
  totalAmount: number;
  serviceFee: number;
  stripeFee: number;
  photographerPayout: number;
  status: string;
  createdAt: string;
  guestEmail: string | null;
  guestName: string | null;
  user: { name: string; email: string } | null;
  event: { id: string; name: string };
  _count: { items: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Avr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Aou",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

function euro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KPICard({
  label, value, subtitle, icon, iconBg, iconColor, valueColor = "text-gray-900",
}: {
  label: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; iconBg: string; iconColor: string; valueColor?: string;
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PhotographerPaymentsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [topEvents, setTopEvents] = useState<TopEvent[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, connectRes, ordersRes] = await Promise.all([
        fetch("/api/stats/photographer"),
        fetch("/api/stripe/connect/status"),
        fetch("/api/orders?limit=10"),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setRevenue(data.revenue);
        setMonthlyRevenue(data.monthlyRevenue || []);
        setTopEvents(data.topEvents || []);
      }
      if (connectRes.ok) {
        setConnectStatus(await connectRes.json());
      }
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchData();
  }, [session, fetchData]);

  const handleConnectStripe = async () => {
    setConnectLoading(true);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.error || "Erreur Stripe", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion.", variant: "destructive" });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleStripeDashboard = async () => {
    setConnectLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/dashboard", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ouvrir le dashboard", variant: "destructive" });
    } finally {
      setConnectLoading(false);
    }
  };

  // Chart data
  const sortedMonthly = [...monthlyRevenue].sort((a, b) => a.month.localeCompare(b.month));
  const maxMonthlyRevenue = Math.max(...sortedMonthly.map(d => d.revenue), 1);

  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    PENDING: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
    PAID: { label: "Paye", className: "bg-emerald-100 text-emerald-700" },
    DELIVERED: { label: "Livre", className: "bg-teal-100 text-teal-800" },
    REFUNDED: { label: "Rembourse", className: "bg-red-100 text-red-700" },
    EXPIRED: { label: "Expire", className: "bg-gray-100 text-gray-600" },
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Paiements</h1>
        <p className="text-gray-500 mt-1">Revenus, frais et historique des transactions</p>
      </div>

      {/* Stripe Connect Status Card */}
      <Card className="bg-white border-0 shadow-card rounded-2xl mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">Stripe Connect</p>
                  {connectStatus?.isOnboarded ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Actif</Badge>
                  ) : connectStatus?.hasAccount ? (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">En cours</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">Non configure</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {connectStatus?.isOnboarded
                    ? "Les paiements de vos ventes sont verses directement sur votre compte"
                    : "Connectez votre compte pour recevoir les paiements de vos ventes"}
                </p>
              </div>
            </div>
            {connectStatus?.isOnboarded ? (
              <Button
                className="text-[#635BFF] border-[#635BFF]/30 hover:bg-[#635BFF]/5 rounded-xl"
                variant="outline"
                onClick={handleStripeDashboard}
                disabled={connectLoading}
              >
                {connectLoading ? "..." : "Dashboard Stripe"}
              </Button>
            ) : (
              <Button
                className="bg-[#635BFF] hover:bg-[#5249d9] text-white rounded-xl"
                onClick={handleConnectStripe}
                disabled={connectLoading}
              >
                {connectLoading ? "..." : connectStatus?.hasAccount ? "Reprendre" : "Connecter"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /><SkeletonKPI /></>
        ) : (
          <>
            <KPICard
              label="Revenu brut"
              value={euro(revenue?.total || 0)}
              subtitle={`${revenue?.paidOrders || 0} commandes`}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              valueColor="text-emerald-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>}
            />
            <KPICard
              label="Vous recevez"
              value={euro(revenue?.photographerPayout || 0)}
              subtitle="Net apres frais Stripe"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              valueColor="text-blue-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KPICard
              label="Frais Stripe"
              value={euro(revenue?.stripeFees || 0)}
              subtitle="~1,5% + 0,25 EUR/transaction"
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <KPICard
              label="Panier moyen"
              value={euro(revenue?.avgBasket || 0)}
              subtitle={`${revenue?.paidOrders || 0} commandes payees`}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" /></svg>}
            />
          </>
        )}
      </div>

      {/* Revenue Breakdown Bar */}
      {!isLoading && revenue && revenue.total > 0 && (
        <Card className="bg-white border-0 shadow-card rounded-2xl mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Repartition des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${Math.max((revenue.photographerPayout / revenue.total) * 100, 2)}%` }}
                  title={`Vous recevez: ${euro(revenue.photographerPayout)}`}
                />
                <div
                  className="h-full bg-violet-400 transition-all duration-700"
                  style={{ width: `${Math.max((revenue.stripeFees / revenue.total) * 100, 1)}%` }}
                  title={`Frais Stripe: ${euro(revenue.stripeFees)}`}
                />
                <div
                  className="h-full bg-gray-400 transition-all duration-700"
                  style={{ width: `${Math.max((revenue.serviceFees / revenue.total) * 100, 1)}%` }}
                  title={`Frais de service: ${euro(revenue.serviceFees)}`}
                />
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Vous recevez</span>
                  <span className="font-semibold text-gray-900">{euro(revenue.photographerPayout)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-violet-400" />
                  <span className="text-gray-600">Frais Stripe</span>
                  <span className="font-semibold text-gray-900">{euro(revenue.stripeFees)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-gray-600">Frais de service</span>
                  <span className="font-semibold text-gray-900">{euro(revenue.serviceFees)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-card rounded-2xl h-full">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Revenus mensuels</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />
              ) : sortedMonthly.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  Aucune donnee de revenus
                </div>
              ) : (
                <div className="flex items-end gap-2 h-48">
                  {sortedMonthly.map(d => {
                    const heightPct = (d.revenue / maxMonthlyRevenue) * 100;
                    const monthKey = d.month.split("-")[1];
                    return (
                      <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500 font-medium">{euro(d.revenue)}</span>
                        <div className="w-full flex flex-col justify-end" style={{ height: "140px" }}>
                          <div
                            className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-700 ease-out min-h-[4px]"
                            style={{ height: `${Math.max(heightPct, 3)}%` }}
                            title={`${d.month}: ${euro(d.revenue)} (${d.orders} commandes)`}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{MONTH_LABELS[monthKey] || monthKey}</span>
                        <span className="text-[10px] text-gray-400">{d.orders} cmd</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Events */}
        <Card className="bg-white border-0 shadow-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Top evenements</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topEvents.length > 0 ? (
              <div className="space-y-3">
                {topEvents.map((event, index) => (
                  <div key={`${event.name}-${index}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm font-bold text-emerald-600">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{event.name}</p>
                      <p className="text-xs text-gray-500">{event.orders} commande{event.orders > 1 ? "s" : ""}</p>
                    </div>
                    <p className="font-semibold text-emerald-600 text-sm">{euro(event.revenue)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-8">Aucune vente</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="bg-white border-0 shadow-card rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display text-gray-900">Dernieres commandes</CardTitle>
          <Badge className="bg-gray-100 text-gray-600 border-0">{orders.length} affichees</Badge>
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
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <p className="text-gray-400 mt-3">Aucune commande pour le moment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Client</th>
                    <th className="text-left py-3 px-2 text-gray-500 font-medium">Evenement</th>
                    <th className="text-center py-3 px-2 text-gray-500 font-medium">Photos</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Montant</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Frais</th>
                    <th className="text-right py-3 px-2 text-gray-500 font-medium">Net</th>
                    <th className="text-center py-3 px-2 text-gray-500 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
                    const clientName = order.user?.name || order.guestName || "Invite";
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-3 px-2">
                          <p className="font-medium text-gray-900 truncate max-w-[140px]">{clientName}</p>
                        </td>
                        <td className="py-3 px-2 text-gray-600 truncate max-w-[160px]">{order.event.name}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{order._count.items}</td>
                        <td className="py-3 px-2 text-right font-medium text-gray-900">{euro(order.totalAmount)}</td>
                        <td className="py-3 px-2 text-right text-gray-500">
                          {order.stripeFee > 0 ? euro(order.stripeFee + order.serviceFee) : "-"}
                        </td>
                        <td className="py-3 px-2 text-right font-semibold text-blue-600">
                          {order.photographerPayout > 0 ? euro(order.photographerPayout) : "-"}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge className={`${statusInfo.className} border-0 text-xs`}>{statusInfo.label}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh */}
      <div className="mt-8 flex justify-center">
        <Button
          variant="outline"
          onClick={fetchData}
          disabled={isLoading}
          className="text-gray-500 hover:text-emerald-600 border-gray-200 hover:border-emerald-200 rounded-xl"
        >
          <svg className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Actualiser
        </Button>
      </div>
    </div>
  );
}
