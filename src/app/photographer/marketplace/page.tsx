"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course a pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacles",
  OTHER: "Autre",
};

interface Listing {
  id: string;
  title: string;
  description: string;
  sportType: string;
  date: string;
  location: string;
  budget: number | null;
  status: string;
  createdAt: string;
  user: { name: string; company: string | null };
  _count: { applications: number };
}

// Skeleton component
function SkeletonListingCard() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-5 w-16 bg-gray-200 rounded" />
        <div className="h-5 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-full bg-gray-200 rounded mb-4" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function PhotographerMarketplacePage() {
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applyRate, setApplyRate] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const response = await fetch("/api/marketplace/listings");
        if (response.ok) {
          const data = await response.json();
          setListings(data.filter((l: Listing) => l.status === "OPEN"));
        }
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, []);

  const handleApply = async () => {
    if (!selectedListing) return;
    setIsApplying(true);

    try {
      const response = await fetch(`/api/marketplace/listings/${selectedListing.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: applyMessage,
          proposedRate: applyRate ? parseFloat(applyRate) : null,
        }),
      });

      if (response.ok) {
        toast({
          title: "Candidature envoyee",
          description: "L'organisateur a ete notifie de votre candidature.",
        });
        setSelectedListing(null);
        setApplyMessage("");
        setApplyRate("");
      } else {
        const data = await response.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible d'envoyer la candidature",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsApplying(false);
    }
  };

  const filteredListings = listings.filter(
    (listing) =>
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Marketplace</h1>
        <p className="text-gray-500 mt-1">Trouvez des missions de photographie sportive</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Rechercher par titre ou lieu..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white max-w-md border-gray-200 rounded-lg focus:ring-2 focus:ring-blue/20 focus:border-blue"
        />
      </div>

      {/* Listings */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
          <SkeletonListingCard />
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
            </div>
            <p className="text-gray-500">
              {listings.length === 0
                ? "Aucune offre disponible pour le moment"
                : "Aucune offre ne correspond a votre recherche"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <Card key={listing.id} className="bg-white border-0 shadow-card rounded-xl hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">
                    {SPORT_LABELS[listing.sportType] || listing.sportType}
                  </span>
                  {listing.budget && (
                    <span className="text-orange font-semibold">{listing.budget}€</span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{listing.description}</p>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    {new Date(listing.date).toLocaleDateString("fr-FR")}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {listing.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    {listing.user.company || listing.user.name}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {listing._count.applications} candidature{listing._count.applications !== 1 ? "s" : ""}
                  </span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => setSelectedListing(listing)}
                        className="bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange transition-all duration-200"
                      >
                        Postuler
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-xl">
                      <DialogHeader>
                        <DialogTitle className="font-display text-gray-900">Postuler a cette mission</DialogTitle>
                        <DialogDescription className="text-gray-500">{listing.title}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label className="text-gray-700">Message de candidature</Label>
                          <textarea
                            className="flex min-h-[100px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
                            placeholder="Presentez-vous et expliquez pourquoi vous etes le bon photographe pour cette mission..."
                            value={applyMessage}
                            onChange={(e) => setApplyMessage(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700">Tarif propose (€)</Label>
                          <Input
                            type="number"
                            placeholder="Votre tarif pour cette mission"
                            value={applyRate}
                            onChange={(e) => setApplyRate(e.target.value)}
                            className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue/20 focus:border-blue"
                          />
                        </div>
                        <Button
                          className="w-full bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange transition-all duration-200"
                          onClick={handleApply}
                          disabled={isApplying || !applyMessage}
                        >
                          {isApplying ? "Envoi en cours..." : "Envoyer ma candidature"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
