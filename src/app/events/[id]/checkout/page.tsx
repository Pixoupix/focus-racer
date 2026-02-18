"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const StripePayment = dynamic(() => import("@/components/stripe-payment"), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse bg-emerald-50 rounded-lg h-48" />
  ),
});

interface PublicPhoto {
  id: string;
  src: string;
  originalName: string;
  bibNumbers: { id: string; number: string }[];
}

interface PackInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number | null;
}

interface EventInfo {
  name: string;
  primaryColor: string | null;
  photographer: string;
}

export default function CheckoutPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Guest info
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

  // Selected pack override (null = auto-optimal)
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);

  // Stripe Payment Element state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [serviceFee, setServiceFee] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, packsRes] = await Promise.all([
          fetch(`/api/events/public/${id}`),
          fetch(`/api/events/${id}/packs/public`),
        ]);

        if (eventRes.ok) {
          const data = await eventRes.json();
          setEventInfo({
            name: data.name,
            primaryColor: data.primaryColor,
            photographer: data.photographer,
          });

          const stored = localStorage.getItem(`favorites_${id}`);
          if (stored) {
            const favIds = new Set(JSON.parse(stored));
            setPhotos(data.photos.filter((p: PublicPhoto) => favIds.has(p.id)));
          }
        }

        if (packsRes.ok) {
          setPacks(await packsRes.json());
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Price calculation
  const calculateTotal = () => {
    if (photos.length === 0 || packs.length === 0) return { total: 0, savings: 0, packUsed: null as PackInfo | null };

    if (selectedPackId) {
      const pack = packs.find((p) => p.id === selectedPackId);
      if (pack) {
        const singlePack = packs.find((p) => p.type === "SINGLE");
        const fullSingle = (singlePack?.price ?? 0) * photos.length;
        return {
          total: pack.price,
          savings: Math.max(0, fullSingle - pack.price),
          packUsed: pack,
        };
      }
    }

    const singlePack = packs.find((p) => p.type === "SINGLE");
    const singlePrice = singlePack?.price ?? 0;
    const fullSingle = singlePrice * photos.length;
    let bestPrice = fullSingle;
    let bestPack: PackInfo | null = singlePack || null;

    for (const pack of packs) {
      if (pack.type === "ALL_INCLUSIVE") {
        if (pack.price < bestPrice) {
          bestPrice = pack.price;
          bestPack = pack;
        }
      } else if (pack.quantity && photos.length >= pack.quantity) {
        const packCount = Math.floor(photos.length / pack.quantity);
        const remainder = photos.length % pack.quantity;
        const packTotal = packCount * pack.price + remainder * singlePrice;
        if (packTotal < bestPrice) {
          bestPrice = packTotal;
          bestPack = pack;
        }
      }
    }

    return {
      total: bestPrice,
      savings: Math.max(0, fullSingle - bestPrice),
      packUsed: bestPack,
    };
  };

  const { total, savings, packUsed } = calculateTotal();
  const primaryColor = eventInfo?.primaryColor || "#14B8A6";

  const handleProceedToPayment = async () => {
    setError(null);

    if (!session?.user && (!guestEmail.trim() || !guestName.trim())) {
      setError("Veuillez renseigner votre email et votre nom");
      return;
    }

    setIsCreatingIntent(true);

    try {
      const response = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: id,
          photoIds: photos.map((p) => p.id),
          packId: selectedPackId,
          guestEmail: session?.user ? undefined : guestEmail.trim(),
          guestName: session?.user ? undefined : guestName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erreur lors de la création du paiement");
        return;
      }

      setClientSecret(data.clientSecret);
      setOrderId(data.orderId);
      setServiceFee(data.serviceFee || 0);
    } catch (err) {
      console.error("Payment intent error:", err);
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    router.push(`/events/${id}/checkout/success?order=${orderId}`);
  };

  const handlePaymentError = (message: string) => {
    setError(message);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen gradient-bg-subtle">
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="text-xl font-bold text-navy">Focus Racer</Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground mb-4">Votre panier est vide</p>
          <Link href={`/events/${id}`}>
            <Button variant="outline">Retour à la galerie</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg-subtle">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-navy">Focus Racer</Link>
          <Link href={`/events/${id}/favorites`}>
            <Button variant="outline" size="sm">&larr; Retour aux favoris</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-navy mb-2">Finaliser l&apos;achat</h1>
        <p className="text-muted-foreground mb-8">{eventInfo?.name}</p>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left: photos recap + payment */}
          <div className="md:col-span-2 space-y-6">
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">
                  Vos photos ({photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {photos.map((photo) => (
                    <div key={photo.id} className="aspect-square relative rounded overflow-hidden">
                      <Image
                        src={photo.src}
                        alt={photo.originalName}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pack selection */}
            {packs.length > 1 && !clientSecret && (
              <Card className="glass-card rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Formule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedPackId(null)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                        !selectedPackId ? "border-emerald bg-emerald-50" : "border-emerald-50 hover:border-emerald/30"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">Meilleur prix automatique</p>
                          <p className="text-sm text-muted-foreground">Nous choisissons la combinaison la plus avantageuse</p>
                        </div>
                        <Badge style={{ backgroundColor: primaryColor, color: "white" }}>Recommandé</Badge>
                      </div>
                    </button>

                    {packs.map((pack) => {
                      const isApplicable =
                        pack.type === "ALL_INCLUSIVE" ||
                        pack.type === "SINGLE" ||
                        (pack.quantity && photos.length >= pack.quantity);

                      return (
                        <button
                          key={pack.id}
                          onClick={() => isApplicable ? setSelectedPackId(pack.id) : null}
                          disabled={!isApplicable}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                            selectedPackId === pack.id
                              ? "border-emerald bg-emerald-50"
                              : isApplicable
                              ? "border-emerald-50 hover:border-emerald/30"
                              : "border-white/50 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{pack.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {pack.type === "ALL_INCLUSIVE"
                                  ? "Toutes les photos de l'événement"
                                  : pack.quantity
                                  ? `${pack.quantity} photos`
                                  : "1 photo"}
                              </p>
                            </div>
                            <span className="font-semibold text-emerald">{pack.price.toFixed(2)}\u20AC</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guest info */}
            {!clientSecret && (
              <Card className="glass-card rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Vos informations</CardTitle>
                </CardHeader>
                <CardContent>
                  {session?.user ? (
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Connecté en tant que</p>
                      <p className="font-medium">{session.user.name}</p>
                      <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Renseignez vos coordonnées pour recevoir vos photos par email.
                        <Link href="/login" className="text-emerald hover:text-emerald-dark transition-colors ml-1">
                          Ou connectez-vous
                        </Link>
                      </p>
                      <div>
                        <Label htmlFor="guestName">Nom complet</Label>
                        <Input
                          id="guestName"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          placeholder="Jean Dupont"
                        />
                      </div>
                      <div>
                        <Label htmlFor="guestEmail">Email</Label>
                        <Input
                          id="guestEmail"
                          type="email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          placeholder="jean@example.com"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stripe Payment Element */}
            {clientSecret && (
              <Card className="glass-card rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Paiement sécurisé</CardTitle>
                </CardHeader>
                <CardContent>
                  <StripePayment
                    clientSecret={clientSecret}
                    amount={total + serviceFee}
                    primaryColor={primaryColor}
                    returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/events/${id}/checkout/success?order=${orderId}`}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Paiement sécurisé par Stripe — Apple Pay, Google Pay, CB acceptés</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: order summary */}
          <div>
            <Card className="sticky top-4 glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{photos.length} photo{photos.length > 1 ? "s" : ""}</span>
                  {packUsed && (
                    <Badge variant="outline" className="text-xs border-emerald/30 text-emerald">{packUsed.name}</Badge>
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Photos</span>
                  <span>{total.toFixed(2)}\u20AC</span>
                </div>

                {savings > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Économie</span>
                    <span>-{savings.toFixed(2)}\u20AC</span>
                  </div>
                )}

                {serviceFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frais de service</span>
                    <span>{serviceFee.toFixed(2)}\u20AC</span>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-emerald">{(total + serviceFee).toFixed(2)}\u20AC</span>
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                {!clientSecret && (
                  <Button
                    className="w-full bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                    onClick={handleProceedToPayment}
                    disabled={isCreatingIntent || total === 0}
                  >
                    {isCreatingIntent ? "Préparation..." : `Procéder au paiement`}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  Paiement sécurisé par Stripe. Vos photos HD seront disponibles immédiatement après le paiement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
