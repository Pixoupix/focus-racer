"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface OrderPhoto {
  id: string;
  thumbnail: string | null;
  name: string;
}

interface OrderData {
  id: string;
  status: string;
  totalAmount: number;
  downloadToken: string | null;
  downloadExpiresAt: string | null;
  downloadCount: number;
  createdAt: string;
  event: {
    id: string;
    name: string;
    date: string;
    coverImage: string | null;
  };
  items: {
    photo: OrderPhoto;
  }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Payé", color: "bg-emerald-100 text-emerald-700" },
  DELIVERED: { label: "Livré", color: "bg-blue-100 text-blue-800" },
  REFUNDED: { label: "Remboursé", color: "bg-white/50 text-muted-foreground" },
  EXPIRED: { label: "Expiré", color: "bg-red-100 text-red-800" },
};

export default function PurchasesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        setOrders(await res.json());
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateToken = async (orderId: string) => {
    setRegenerating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/regenerate-token`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setRegenerating(null);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return true;
    return new Date() > new Date(expiresAt);
  };

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-navy mb-2">Mes achats</h1>
          <p className="text-muted-foreground mb-8">
            Retrouvez vos commandes et téléchargez vos photos
          </p>

          {orders.length === 0 ? (
            <Card className="glass-card rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Aucun achat pour le moment</p>
                <Link href="/runner">
                  <Button variant="outline">Parcourir les événements</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
                const tokenExpired = isExpired(order.downloadExpiresAt);

                return (
                  <Card key={order.id} className="glass-card rounded-2xl hover:shadow-glass-lg transition-all duration-200">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <CardTitle className="text-lg">
                            {order.event.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Commande #{order.id.slice(-8).toUpperCase()} &bull;{" "}
                            {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                          <span className="font-bold">{order.totalAmount.toFixed(2)}€</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Photo thumbnails */}
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {order.items.slice(0, 8).map((item) => (
                          <div
                            key={item.photo.id}
                            className="w-16 h-16 flex-shrink-0 relative rounded overflow-hidden bg-orange-50"
                          >
                            {item.photo.thumbnail ? (
                              <Image
                                src={item.photo.thumbnail}
                                alt={item.photo.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                Photo
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 8 && (
                          <div className="w-16 h-16 flex-shrink-0 rounded bg-orange-50 flex items-center justify-center text-sm text-muted-foreground">
                            +{order.items.length - 8}
                          </div>
                        )}
                      </div>

                      {/* Download actions */}
                      {order.status === "PAID" && (
                        <div className="flex flex-wrap gap-3 items-center">
                          {order.downloadToken && !tokenExpired ? (
                            <>
                              <a href={`/api/downloads/${order.downloadToken}`}>
                                <Button size="sm" className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                                  Télécharger (ZIP)
                                </Button>
                              </a>
                              <span className="text-xs text-muted-foreground">
                                Expire le{" "}
                                {new Date(order.downloadExpiresAt!).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => regenerateToken(order.id)}
                              disabled={regenerating === order.id}
                            >
                              {regenerating === order.id
                                ? "Génération..."
                                : "Régénérer le lien de téléchargement"}
                            </Button>
                          )}
                          {order.downloadCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Téléchargé {order.downloadCount} fois
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
