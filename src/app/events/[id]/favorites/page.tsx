"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface PublicPhoto {
  id: string;
  src: string;
  originalName: string;
  bibNumbers: { id: string; number: string }[];
}

interface EventInfo {
  name: string;
  primaryColor: string | null;
}

interface PackInfo {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number | null;
}

interface PricingResult {
  totalPrice: number;
  savings: number;
  unitPriceEquiv: number;
}

interface UpsellSuggestion {
  message: string;
  photosNeeded: number;
  packName: string;
  packPrice: number;
  savingsIfUpgrade: number;
}

export default function FavoritesPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [upsell, setUpsell] = useState<UpsellSuggestion[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(`favorites_${id}`);
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  }, [id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, packsRes] = await Promise.all([
          fetch(`/api/events/public/${id}`),
          fetch(`/api/events/${id}/packs/public`),
        ]);
        if (eventRes.ok) {
          const data = await eventRes.json();
          setEventInfo({ name: data.name, primaryColor: data.primaryColor });
          setPhotos(data.photos);
        }
        if (packsRes.ok) {
          setPacks(await packsRes.json());
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Compute pricing when favorites or packs change
  useEffect(() => {
    const count = favorites.size;
    if (count === 0 || packs.length === 0) {
      setPricing(null);
      setUpsell([]);
      return;
    }
    computePricing(count, packs);
  }, [favorites.size, packs]);

  const computePricing = (count: number, availablePacks: PackInfo[]) => {
    // Client-side simple pricing estimate
    const singlePack = availablePacks.find((p) => p.type === "SINGLE");
    const pack5 = availablePacks.find((p) => p.type === "PACK_5");
    const pack10 = availablePacks.find((p) => p.type === "PACK_10");
    const allInclusive = availablePacks.find((p) => p.type === "ALL_INCLUSIVE");

    const singlePrice = singlePack?.price ?? 0;
    const fullSingle = singlePrice * count;

    // Find best option
    let bestPrice = fullSingle;

    if (pack5 && count >= 5) {
      const p5Count = Math.floor(count / 5);
      const remainder = count % 5;
      const p5Total = p5Count * pack5.price + remainder * singlePrice;
      if (p5Total < bestPrice) bestPrice = p5Total;
    }

    if (pack10 && count >= 10) {
      const p10Count = Math.floor(count / 10);
      const remainder = count % 10;
      let remainderPrice = remainder * singlePrice;
      if (pack5 && remainder >= 5) {
        remainderPrice = pack5.price + (remainder - 5) * singlePrice;
      }
      const p10Total = p10Count * pack10.price + remainderPrice;
      if (p10Total < bestPrice) bestPrice = p10Total;
    }

    if (allInclusive && allInclusive.price < bestPrice) {
      bestPrice = allInclusive.price;
    }

    setPricing({
      totalPrice: bestPrice,
      savings: fullSingle - bestPrice,
      unitPriceEquiv: count > 0 ? bestPrice / count : 0,
    });

    // Upsell suggestions
    const suggestions: UpsellSuggestion[] = [];

    if (pack5 && count < 5 && count >= 2) {
      const diff = 5 - count;
      suggestions.push({
        message: `Ajoutez ${diff} photo${diff > 1 ? "s" : ""} pour le ${pack5.name} a ${pack5.price.toFixed(2)}EUR`,
        photosNeeded: diff,
        packName: pack5.name,
        packPrice: pack5.price,
        savingsIfUpgrade: Math.max(0, singlePrice * 5 - pack5.price),
      });
    }

    if (pack10 && count < 10 && count >= 6) {
      const diff = 10 - count;
      suggestions.push({
        message: `Ajoutez ${diff} photo${diff > 1 ? "s" : ""} pour le ${pack10.name} a ${pack10.price.toFixed(2)}EUR`,
        photosNeeded: diff,
        packName: pack10.name,
        packPrice: pack10.price,
        savingsIfUpgrade: Math.max(0, singlePrice * 10 - pack10.price),
      });
    }

    if (allInclusive && bestPrice > allInclusive.price) {
      suggestions.push({
        message: `Passez au ${allInclusive.name} pour ${allInclusive.price.toFixed(2)}EUR et economisez ${(bestPrice - allInclusive.price).toFixed(2)}EUR`,
        photosNeeded: 0,
        packName: allInclusive.name,
        packPrice: allInclusive.price,
        savingsIfUpgrade: bestPrice - allInclusive.price,
      });
    }

    setUpsell(suggestions);
  };

  const removeFavorite = (photoId: string) => {
    const newFavs = new Set(favorites);
    newFavs.delete(photoId);
    setFavorites(newFavs);
    localStorage.setItem(`favorites_${id}`, JSON.stringify(Array.from(newFavs)));
  };

  const clearAll = () => {
    setFavorites(new Set());
    localStorage.removeItem(`favorites_${id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const favoritePhotos = photos.filter((p) => favorites.has(p.id));

  return (
    <div className="min-h-screen gradient-bg-subtle flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl pt-24">
        <Link href={`/events/${id}`} className="text-orange hover:text-orange-dark hover:underline mb-4 inline-block transition-colors duration-200">
          &larr; Retour a {eventInfo?.name || "l'evenement"}
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-navy">
              <span className="text-orange mr-2">&hearts;</span>
              Mes favoris
            </h1>
            <p className="text-muted-foreground">
              {favoritePhotos.length} photo{favoritePhotos.length !== 1 ? "s" : ""} selectionnee{favoritePhotos.length !== 1 ? "s" : ""}
            </p>
          </div>
          {favoritePhotos.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll} className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">
                Tout retirer
              </Button>
              <Link href={`/events/${id}/checkout`}>
                <Button size="sm" className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                  Acheter ({favoritePhotos.length})
                  {pricing && ` - ${pricing.totalPrice.toFixed(2)}EUR`}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pricing summary */}
        {favoritePhotos.length > 0 && pricing && packs.length > 0 && (
          <Card className="glass-card rounded-2xl mb-6 animate-fade-in">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-lg font-semibold text-navy">
                    Total estime : {pricing.totalPrice.toFixed(2)}EUR
                  </p>
                  {pricing.savings > 0 && (
                    <p className="text-sm text-emerald-600">
                      Vous economisez {pricing.savings.toFixed(2)}EUR grace aux packs
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    ~{pricing.unitPriceEquiv.toFixed(2)}EUR / photo
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {packs.map((pack) => (
                    <Badge key={pack.id} variant="outline" className="text-xs border-orange/30 text-orange">
                      {pack.name} : {pack.price.toFixed(2)}EUR
                      {pack.quantity && ` (${pack.quantity} photos)`}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Upsell suggestions */}
              {upsell.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {upsell.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <span className="text-amber-500">&#9733;</span>
                      <span className="text-muted-foreground">{s.message}</span>
                      {s.savingsIfUpgrade > 0 && (
                        <Badge variant="secondary" className="text-xs text-emerald-700 bg-emerald-100">
                          -{s.savingsIfUpgrade.toFixed(2)}EUR
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {favoritePhotos.length === 0 ? (
          <Card className="glass-card rounded-2xl animate-fade-in">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Vous n&apos;avez pas encore de favoris</p>
              <Link href={`/events/${id}`}>
                <Button variant="outline" className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">Parcourir la galerie</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {favoritePhotos.map((photo) => (
              <div key={photo.id} className="relative glass-card rounded-xl overflow-hidden">
                <div className="aspect-[4/3] relative">
                  <Image
                    src={photo.src}
                    alt={photo.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <button
                    onClick={() => removeFavorite(photo.id)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all duration-200 shadow-sm"
                    title="Retirer des favoris"
                  >
                    <span className="text-orange">&times;</span>
                  </button>
                </div>
                {photo.bibNumbers.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1 bg-white/50">
                    {photo.bibNumbers.map((bib) => (
                      <Badge key={bib.id} variant="secondary" className="text-xs bg-orange-50 text-orange">
                        #{bib.number}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
