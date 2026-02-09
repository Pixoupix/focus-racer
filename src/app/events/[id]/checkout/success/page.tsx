"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface OrderInfo {
  id: string;
  status: string;
  totalAmount: number;
  photoCount: number;
  eventName: string;
  downloadToken: string | null;
  downloadExpiresAt: string | null;
}

export default function CheckoutSuccessPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data);

          // If still pending (webhook hasn't fired yet), retry a few times
          if (data.status === "PENDING" && retryCount < 10) {
            setTimeout(() => setRetryCount((c) => c + 1), 2000);
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, retryCount]);

  // Clear favorites on successful payment
  useEffect(() => {
    if (order?.status === "PAID") {
      localStorage.removeItem(`favorites_${id}`);
    }
  }, [order?.status, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Confirmation du paiement en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-subtle flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl pt-24">
        {order?.status === "PAID" ? (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl text-emerald-500">&#10003;</span>
              </div>
              <h1 className="text-2xl font-bold text-navy mb-2">Paiement confirme !</h1>
              <p className="text-muted-foreground">Merci pour votre achat</p>
            </div>

            <Card className="glass-card rounded-2xl mb-6">
              <CardHeader>
                <CardTitle className="text-lg text-navy">Commande #{order.id.slice(-8).toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evenement</span>
                  <span className="font-medium text-navy">{order.eventName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Photos</span>
                  <span className="font-medium text-navy">{order.photoCount} photo{order.photoCount > 1 ? "s" : ""}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <span className="text-muted-foreground font-semibold">Total paye</span>
                  <span className="font-bold text-navy">{order.totalAmount.toFixed(2)}EUR</span>
                </div>
              </CardContent>
            </Card>

            {/* Download section */}
            {order.downloadToken && (
              <Card className="glass-card rounded-2xl mb-6">
                <CardHeader>
                  <CardTitle className="text-lg text-navy">Telecharger vos photos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Vos photos HD sont disponibles pendant 72h. Un lien de telechargement vous a egalement ete envoye par email.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a href={`/api/downloads/${order.downloadToken}`}>
                      <Button className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                        Telecharger tout (ZIP)
                      </Button>
                    </a>
                  </div>
                  {order.downloadExpiresAt && (
                    <p className="text-xs text-muted-foreground">
                      Expire le {new Date(order.downloadExpiresAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Account prompt for guests */}
            {!session?.user && (
              <Card className="glass-card rounded-2xl mb-6 border-orange/20 bg-orange-50/50">
                <CardContent className="pt-6">
                  <p className="font-medium text-navy mb-2">Creez un compte pour retrouver vos achats</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Avec un compte, vous pourrez re-telecharger vos photos et retrouver votre historique d&apos;achats.
                  </p>
                  <Link href="/register">
                    <Button variant="outline" className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">Creer un compte</Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {session?.user && (
              <div className="text-center">
                <Link href="/account/purchases">
                  <Button variant="outline" className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">Voir mes achats</Button>
                </Link>
              </div>
            )}
          </div>
        ) : order?.status === "PENDING" ? (
          <div className="text-center animate-fade-in">
            <div className="animate-spin w-8 h-8 border-4 border-orange border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="text-xl font-bold text-navy mb-2">Confirmation en cours...</h1>
            <p className="text-muted-foreground">Votre paiement est en cours de traitement. Cette page se mettra a jour automatiquement.</p>
          </div>
        ) : (
          <div className="text-center animate-fade-in">
            <h1 className="text-xl font-bold text-navy mb-2">Commande non trouvee</h1>
            <p className="text-muted-foreground mb-4">Impossible de trouver les details de cette commande.</p>
            <Link href={`/events/${id}`}>
              <Button variant="outline" className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">Retour a l&apos;evenement</Button>
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
