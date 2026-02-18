"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderRow {
  id: string;
  status: string;
  totalAmount: number;
  guestEmail: string | null;
  guestName: string | null;
  stripeSessionId: string | null;
  stripePaymentId: string | null;
  downloadCount: number;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  event: { id: string; name: string };
  pack: { name: string; type: string } | null;
  _count: { items: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  orders: number;
}

interface PackBreakdown {
  pack_type: string | null;
  revenue: number;
  orders: number;
}

interface TopEvent {
  id: string;
  name: string;
  date: string;
  revenue: number;
  orders: number;
}

interface PaymentStats {
  revenue: {
    total: number;
    avgBasket: number;
    paidOrders: number;
  };
  totalOrders: number;
  refundedOrders: number;
  refundRate: string;
  monthlyRevenue: MonthlyRevenue[];
  packBreakdown: PackBreakdown[];
  topEvents: TopEvent[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  DELIVERED: { label: "Livré", color: "bg-teal-100 text-teal-800" },
  REFUNDED: { label: "Remboursé", color: "bg-red-100 text-red-700" },
  EXPIRED: { label: "Expiré", color: "bg-gray-100 text-gray-600" },
};

const PACK_LABELS: Record<string, string> = {
  SINGLE: "Photo unique",
  PACK_5: "Pack 5",
  PACK_10: "Pack 10",
  ALL_INCLUSIVE: "All inclusive",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function euro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function dateFR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
    "fr-FR",
    { month: "short", year: "numeric" }
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPaymentsPage() {
  /* ----- state ----- */
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  /* ----- data fetching ----- */
  const fetchStats = useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/admin/payments-stats?${params}`);
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [dateFrom, dateTo]);

  const fetchOrders = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (search) params.set("search", search);
        if (statusFilter && statusFilter !== "all")
          params.set("status", statusFilter);
        if (dateFrom) params.set("from", dateFrom);
        if (dateTo) params.set("to", dateTo);

        const res = await fetch(`/api/admin/orders?${params}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setPagination(data.pagination);
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, dateFrom, dateTo]
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  /* ----- CSV export ----- */
  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter && statusFilter !== "all")
      params.set("status", statusFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    window.location.href = `/api/admin/export/orders?${params}`;
  };

  /* ----- refund handler ----- */
  const handleRefund = async (orderId: string) => {
    if (
      !window.confirm(
        "Confirmer le remboursement de cette commande ? Cette action est irreversible."
      )
    )
      return;
    setRefundingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "refund" }),
      });
      if (res.ok) {
        fetchOrders(pagination.page);
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors du remboursement");
      }
    } catch {
      alert("Erreur reseau");
    } finally {
      setRefundingId(null);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Derived values                                                   */
  /* ---------------------------------------------------------------- */

  const maxMonthlyRevenue =
    stats && stats.monthlyRevenue.length > 0
      ? Math.max(...stats.monthlyRevenue.map((m) => m.revenue), 1)
      : 1;

  const totalPackRevenue =
    stats && stats.packBreakdown.length > 0
      ? stats.packBreakdown.reduce((s, p) => s + p.revenue, 0)
      : 1;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Paiements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble du chiffre d&apos;affaires et gestion des
            commandes
          </p>
        </div>
        <Button
          onClick={handleExport}
          className="gradient-emerald text-white hover:opacity-90 rounded-xl gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
            />
          </svg>
          Exporter CSV
        </Button>
      </div>

      {/* ============================================================ */}
      {/*  1) Revenue KPI Cards (6 cards)                              */}
      {/* ============================================================ */}
      {isStatsLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="glass-card rounded-2xl animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CA total */}
          <Card className="glass-card rounded-2xl border-l-4 border-l-emerald overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Chiffre d&apos;affaires
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-emerald">
                {euro(stats.revenue.total)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Total commandes payées
              </p>
            </CardContent>
          </Card>

          {/* Panier moyen */}
          <Card className="glass-card rounded-2xl border-l-4 border-l-amber-500 overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Panier moyen
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-amber-600">
                {euro(stats.revenue.avgBasket)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Par commande payée
              </p>
            </CardContent>
          </Card>

          {/* Commandes payées */}
          <Card className="glass-card rounded-2xl border-l-4 border-l-navy overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Commandes payées
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-navy">
                {stats.revenue.paidOrders}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                sur {stats.totalOrders} total
              </p>
            </CardContent>
          </Card>

          {/* Taux de remboursement */}
          <Card className="glass-card rounded-2xl border-l-4 border-l-red-400 overflow-hidden">
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Taux remboursement
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold text-red-500">
                {stats.refundRate}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats.refundedOrders} remboursée
                {stats.refundedOrders > 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/*  2) Revenue Chart + Pack Breakdown + Top Events              */}
      {/* ============================================================ */}
      {stats && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Monthly revenue chart */}
          <Card className="glass-card rounded-2xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-emerald"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
                Revenus mensuels
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.monthlyRevenue.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Aucune donnée disponible
                </p>
              ) : (
                <div className="flex items-end gap-3 h-48">
                  {stats.monthlyRevenue.map((m) => {
                    const pct = (m.revenue / maxMonthlyRevenue) * 100;
                    return (
                      <div
                        key={m.month}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        {/* Value label */}
                        <span className="text-xs font-semibold text-navy whitespace-nowrap">
                          {euro(m.revenue)}
                        </span>
                        {/* Bar */}
                        <div className="w-full bg-emerald-50 rounded-t-lg relative flex-1 flex items-end">
                          <div
                            className="w-full gradient-emerald rounded-t-lg transition-all duration-700 ease-out"
                            style={{
                              height: `${Math.max(pct, 4)}%`,
                              minHeight: "4px",
                            }}
                          />
                        </div>
                        {/* Month label */}
                        <span className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">
                          {monthLabel(m.month)}
                        </span>
                        {/* Orders count */}
                        <span className="text-[10px] text-muted-foreground">
                          {m.orders} cmd{m.orders > 1 ? "s" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by pack type */}
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-navy flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-teal-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
                  />
                </svg>
                Revenus par pack
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.packBreakdown.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Aucune donnée
                </p>
              ) : (
                <div className="space-y-3">
                  {stats.packBreakdown.map((pack) => {
                    const label =
                      PACK_LABELS[pack.pack_type || ""] ||
                      pack.pack_type ||
                      "Sans pack";
                    const pct =
                      totalPackRevenue > 0
                        ? ((pack.revenue / totalPackRevenue) * 100).toFixed(1)
                        : "0";
                    return (
                      <div key={pack.pack_type || "none"}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-navy">
                            {label}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {euro(pack.revenue)}{" "}
                            <span className="text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-emerald-50 rounded-full h-2.5">
                          <div
                            className="gradient-emerald h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(parseFloat(pct), 2)}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {pack.orders} commande{pack.orders > 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top events by revenue */}
      {stats && stats.topEvents.length > 0 && (
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 01-2.77.894m0 0a6.023 6.023 0 01-2.77-.894"
                />
              </svg>
              Top 5 événements par revenu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-3">
              {stats.topEvents.map((evt, idx) => (
                <div
                  key={evt.id}
                  className="relative p-4 rounded-xl bg-white/60 hover:bg-white/80 transition-colors border border-white/40"
                >
                  {/* Rank badge */}
                  <div
                    className={`absolute -top-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      idx === 0
                        ? "bg-amber-500"
                        : idx === 1
                          ? "bg-gray-400"
                          : idx === 2
                            ? "bg-amber-700"
                            : "bg-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p
                    className="font-semibold text-sm text-navy truncate mt-1"
                    title={evt.name}
                  >
                    {evt.name}
                  </p>
                  <p className="text-lg font-bold text-emerald mt-1">
                    {euro(evt.revenue)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {evt.orders} commande{evt.orders > 1 ? "s" : ""} &middot;{" "}
                    {dateFR(evt.date)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================ */}
      {/*  3) Filters Row                                              */}
      {/* ============================================================ */}
      <Card className="glass-card rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <CardTitle className="text-navy">Liste des commandes</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <Input
                  placeholder="Rechercher client, email, ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64 pl-9 rounded-xl"
                />
              </div>

              {/* Status filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 rounded-xl">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="PAID">Payé</SelectItem>
                  <SelectItem value="DELIVERED">Livré</SelectItem>
                  <SelectItem value="REFUNDED">Remboursé</SelectItem>
                  <SelectItem value="EXPIRED">Expiré</SelectItem>
                </SelectContent>
              </Select>

              {/* Date from */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Du</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40 rounded-xl"
                />
              </div>

              {/* Date to */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Au</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40 rounded-xl"
                />
              </div>

              {/* Clear filters */}
              {(search ||
                statusFilter !== "all" ||
                dateFrom ||
                dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-navy rounded-xl"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* ============================================================ */}
        {/*  4) Orders Table                                             */}
        {/* ============================================================ */}
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald border-r-transparent" />
              <p className="text-muted-foreground mt-3">Chargement...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <svg
                className="w-12 h-12 mx-auto text-muted-foreground/40"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              <p className="text-muted-foreground mt-2">
                Aucune commande trouvée
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border border-white/40">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/30">
                      <TableHead className="font-semibold text-navy">
                        ID
                      </TableHead>
                      <TableHead className="font-semibold text-navy">
                        Client
                      </TableHead>
                      <TableHead className="font-semibold text-navy">
                        Événement
                      </TableHead>
                      <TableHead className="font-semibold text-navy">
                        Pack
                      </TableHead>
                      <TableHead className="font-semibold text-navy text-center">
                        Photos
                      </TableHead>
                      <TableHead className="font-semibold text-navy text-right">
                        Montant
                      </TableHead>
                      <TableHead className="font-semibold text-navy text-center">
                        Statut
                      </TableHead>
                      <TableHead className="font-semibold text-navy">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-navy text-center">
                        DL
                      </TableHead>
                      <TableHead className="font-semibold text-navy text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const statusCfg =
                        STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                      const clientName =
                        order.user?.name || order.guestName || "Invité";
                      const clientEmail =
                        order.user?.email || order.guestEmail || "";
                      const packLabel = order.pack
                        ? PACK_LABELS[order.pack.type] || order.pack.name
                        : "-";

                      return (
                        <TableRow
                          key={order.id}
                          className="hover:bg-white/50 transition-colors"
                        >
                          {/* ID */}
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            #{order.id.slice(-8).toUpperCase()}
                          </TableCell>

                          {/* Client */}
                          <TableCell>
                            <div className="max-w-[180px]">
                              <p className="font-medium text-sm text-navy truncate">
                                {clientName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {clientEmail}
                              </p>
                            </div>
                          </TableCell>

                          {/* Event */}
                          <TableCell>
                            <Link
                              href={`/focus-mgr-7k9x/events?id=${order.event.id}`}
                              className="text-sm text-emerald hover:text-emerald-dark transition-colors hover:underline"
                            >
                              {order.event.name}
                            </Link>
                          </TableCell>

                          {/* Pack type */}
                          <TableCell>
                            <span className="text-xs font-medium text-navy/70 bg-white/60 px-2 py-0.5 rounded-full">
                              {packLabel}
                            </span>
                          </TableCell>

                          {/* Photos count */}
                          <TableCell className="text-center text-sm">
                            {order._count.items}
                          </TableCell>

                          {/* Amount */}
                          <TableCell className="text-right font-semibold text-sm text-navy">
                            {euro(order.totalAmount)}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="text-center">
                            <Badge
                              className={`${statusCfg.color} rounded-full text-xs px-2.5`}
                            >
                              {statusCfg.label}
                            </Badge>
                          </TableCell>

                          {/* Date */}
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {dateFR(order.createdAt)}
                          </TableCell>

                          {/* Download count */}
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {order.downloadCount || 0}
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              <Link
                                href={`/focus-mgr-7k9x/disputes?order=${order.id}`}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs h-7 px-2"
                                >
                                  Détails
                                </Button>
                              </Link>
                              {order.status === "PAID" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-lg text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  disabled={refundingId === order.id}
                                  onClick={() => handleRefund(order.id)}
                                >
                                  {refundingId === order.id
                                    ? "..."
                                    : "Rembourser"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* ============================================================ */}
              {/*  5) Pagination                                               */}
              {/* ============================================================ */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <p className="text-sm text-muted-foreground">
                  {pagination.total} commande
                  {pagination.total !== 1 ? "s" : ""} au total
                  {statusFilter !== "all" && (
                    <span className="ml-1">
                      (filtre:{" "}
                      {STATUS_CONFIG[statusFilter]?.label || statusFilter})
                    </span>
                  )}
                </p>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchOrders(pagination.page - 1)}
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 19.5L8.25 12l7.5-7.5"
                        />
                      </svg>
                      Précédent
                    </Button>
                    <span className="text-sm text-muted-foreground px-3 py-1 bg-white/50 rounded-lg">
                      Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchOrders(pagination.page + 1)}
                    >
                      Suivant
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
