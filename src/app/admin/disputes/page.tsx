"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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

interface OrderRow {
  id: string;
  status: string;
  totalAmount: number;
  platformFee: number;
  guestEmail: string | null;
  guestName: string | null;
  stripePaymentId: string | null;
  downloadCount: number;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  event: { id: string; name: string };
  _count: { items: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminDisputesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Chargement...</p>}>
      <DisputesContent />
    </Suspense>
  );
}

function DisputesContent() {
  const searchParams = useSearchParams();
  const preselectedOrder = searchParams.get("order");

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState(preselectedOrder || "");
  const [isLoading, setIsLoading] = useState(true);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [confirmRefundId, setConfirmRefundId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchOrders = useCallback(async (page: number, searchQuery: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status: "PAID",
      });
      if (searchQuery) params.set("search", searchQuery);

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
    fetchOrders(1, search);
  }, [fetchOrders, search]);

  const handleRefund = async (orderId: string) => {
    setRefundingId(orderId);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: refundReason }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: "success", text: data.message });
        setConfirmRefundId(null);
        setRefundReason("");
        fetchOrders(pagination.page, search);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      console.error("Refund error:", error);
      setMessage({ type: "error", text: "Erreur lors du remboursement" });
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-navy mb-2">Litiges &amp; Remboursements</h1>
      <p className="text-muted-foreground mb-8">
        Gérez les remboursements des commandes payées
      </p>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle>Commandes payées</CardTitle>
            <Input
              placeholder="Rechercher par client, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Chargement...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucune commande payée trouvée</p>
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
                      <TableHead>Téléchargements</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => {
                      const clientName = order.user?.name || order.guestName || "Invité";
                      const clientEmail = order.user?.email || order.guestEmail || "";
                      const isConfirming = confirmRefundId === order.id;

                      return (
                        <>
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
                            <TableCell className="text-sm">{order.event.name}</TableCell>
                            <TableCell>{order._count.items}</TableCell>
                            <TableCell className="font-semibold">
                              {order.totalAmount.toFixed(2)}€
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.downloadCount > 0 ? "secondary" : "outline"}>
                                {order.downloadCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>
                              {isConfirming ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    disabled={refundingId === order.id}
                                    onClick={() => handleRefund(order.id)}
                                  >
                                    {refundingId === order.id ? "..." : "Confirmer"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setConfirmRefundId(null);
                                      setRefundReason("");
                                    }}
                                  >
                                    Annuler
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => setConfirmRefundId(order.id)}
                                >
                                  Rembourser
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                          {isConfirming && (
                            <TableRow key={`${order.id}-reason`}>
                              <TableCell colSpan={8} className="bg-red-50">
                                <div className="p-3 flex gap-3 items-center">
                                  <span className="text-sm text-red-800 font-medium">
                                    Motif du remboursement :
                                  </span>
                                  <Input
                                    value={refundReason}
                                    onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="Raison du remboursement (optionnel)"
                                    className="flex-1"
                                  />
                                  {order.stripePaymentId && (
                                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                                      Stripe: {order.stripePaymentId.slice(0, 15)}...
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} commande{pagination.total !== 1 ? "s" : ""} payée{pagination.total !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchOrders(pagination.page - 1, search)}
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
                      onClick={() => fetchOrders(pagination.page + 1, search)}
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
