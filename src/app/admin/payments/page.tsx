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

interface OrderRow {
  id: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  guestEmail: string | null;
  guestName: string | null;
  stripeSessionId: string | null;
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  DELIVERED: { label: "Livré", color: "bg-blue-100 text-blue-800" },
  REFUNDED: { label: "Remboursé", color: "bg-white/50 text-gray-800" },
  EXPIRED: { label: "Expiré", color: "bg-red-100 text-red-800" },
};

export default function AdminPaymentsPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async (page: number, searchQuery: string, status: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
      if (searchQuery) params.set("search", searchQuery);
      if (status && status !== "all") params.set("status", status);

      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(1, search, statusFilter);
  }, [fetchOrders, search, statusFilter]);

  // Totals for filtered view
  const totalRevenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalFees = orders
    .filter((o) => o.status === "PAID")
    .reduce((sum, o) => sum + o.platformFee, 0);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
    window.location.href = `/api/admin/export/orders?${params}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-navy">Paiements</h1>
        <Button variant="outline" onClick={handleExport}>
          Exporter CSV
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Revenus (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange">{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Commissions plateforme (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totalFees.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total commandes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle>Liste des commandes</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher client, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Chargement...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucune commande trouvée</p>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commande</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Événement</TableHead>
                      <TableHead>Photos</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                      const clientName = order.user?.name || order.guestName || "Invité";
                      const clientEmail = order.user?.email || order.guestEmail || "";

                      return (
                        <TableRow key={order.id} className="hover:bg-white/50">
                          <TableCell className="font-mono text-xs">
                            #{order.id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{clientName}</p>
                              <p className="text-xs text-muted-foreground">{clientEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Link
                              href={`/admin/events?id=${order.event.id}`}
                              className="text-orange hover:text-orange-dark transition-colors"
                            >
                              {order.event.name}
                            </Link>
                          </TableCell>
                          <TableCell>{order._count.items}</TableCell>
                          <TableCell className="font-semibold">
                            {order.totalAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {order.platformFee.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {order.status === "PAID" && (
                              <Link href={`/admin/disputes?order=${order.id}`}>
                                <Button variant="outline" size="sm">
                                  Détails
                                </Button>
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} commande{pagination.total !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchOrders(pagination.page - 1, search, statusFilter)}
                    >
                      Précédent
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchOrders(pagination.page + 1, search, statusFilter)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
