"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface ListingCreator {
  id: string;
  name: string;
  company: string | null;
  role: string;
  avatar: string | null;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  sportType: string;
  eventDate: string;
  eventLocation: string;
  budget: number | null;
  status: string;
  requirements: string | null;
  creator: ListingCreator;
  _count: { applications: number };
  createdAt: string;
}

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course à pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Course à obstacles",
  OTHER: "Autre",
};

const SPORT_TYPES = [
  { value: "all", label: "Tous les sports" },
  { value: "RUNNING", label: "Course à pied" },
  { value: "TRAIL", label: "Trail" },
  { value: "TRIATHLON", label: "Triathlon" },
  { value: "CYCLING", label: "Cyclisme" },
  { value: "SWIMMING", label: "Natation" },
  { value: "OBSTACLE", label: "Course à obstacles" },
  { value: "OTHER", label: "Autre" },
];

export default function MarketplacePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [sportType, setSportType] = useState("RUNNING");
  const [budget, setBudget] = useState("");
  const [requirements, setRequirements] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Apply form
  const [applyMessage, setApplyMessage] = useState("");
  const [applyRate, setApplyRate] = useState("");

  const fetchListings = useCallback(async () => {
    try {
      const url = `/api/marketplace/listings?sport=${sportFilter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [sportFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          sportType,
          eventDate,
          eventLocation,
          budget: budget ? parseFloat(budget) : null,
          requirements: requirements || undefined,
        }),
      });

      if (response.ok) {
        toast({ title: "Annonce publiée !" });
        setCreateOpen(false);
        setTitle(""); setDescription(""); setEventDate(""); setEventLocation("");
        setBudget(""); setRequirements("");
        fetchListings();
      } else {
        const data = await response.json();
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleApply = async (listingId: string) => {
    try {
      const response = await fetch(`/api/marketplace/listings/${listingId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: applyMessage || undefined,
          proposedRate: applyRate ? parseFloat(applyRate) : undefined,
        }),
      });

      if (response.ok) {
        toast({ title: "Candidature envoyée !" });
        setApplyingId(null);
        setApplyMessage(""); setApplyRate("");
        fetchListings();
      } else {
        const data = await response.json();
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const isOrganizer = session?.user?.role && ["ORGANIZER", "AGENCY", "CLUB", "FEDERATION", "ADMIN"].includes(session.user.role);
  const isPhotographer = session?.user?.role === "PHOTOGRAPHER";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-navy">Marketplace</h1>
              <p className="text-muted-foreground mt-1">
                Trouvez un photographe pour votre événement ou proposez vos services
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORT_TYPES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isOrganizer && (
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">Publier une annonce</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nouvelle annonce</DialogTitle>
                      <DialogDescription>Recherchez un photographe pour votre événement</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Titre *</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Photographe recherché pour Marathon de Paris" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Décrivez l'événement, le nombre de photographes souhaités, les attentes..."
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                          <Label>Sport</Label>
                          <Select value={sportType} onValueChange={setSportType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SPORT_TYPES.filter(s => s.value !== "all").map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Lieu *</Label>
                          <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Paris, France" required />
                        </div>
                        <div className="space-y-2">
                          <Label>Budget (EUR)</Label>
                          <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ex: 500" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Exigences (optionnel)</Label>
                        <textarea
                          value={requirements}
                          onChange={(e) => setRequirements(e.target.value)}
                          placeholder="Matériel requis, expérience minimum..."
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange"
                        />
                      </div>
                      <Button type="submit" className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" disabled={isCreating}>
                        {isCreating ? "Publication..." : "Publier l'annonce"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {isLoading ? (
            <p className="text-muted-foreground text-center py-12">Chargement...</p>
          ) : listings.length === 0 ? (
            <Card className="glass-card rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune annonce pour le moment</p>
                {isOrganizer && (
                  <Button className="mt-4 bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" onClick={() => setCreateOpen(true)}>
                    Publiez la première annonce
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <Card key={listing.id} className="glass-card rounded-2xl hover:shadow-glass-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base leading-tight">{listing.title}</CardTitle>
                        <CardDescription className="mt-1">
                          par {listing.creator.company || listing.creator.name}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 border-orange/30 text-orange">
                        {SPORT_LABELS[listing.sportType] || listing.sportType}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{listing.description}</p>

                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex justify-between">
                        <span>Date</span>
                        <span className="font-medium text-navy">
                          {new Date(listing.eventDate).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lieu</span>
                        <span className="font-medium text-navy">{listing.eventLocation}</span>
                      </div>
                      {listing.budget && (
                        <div className="flex justify-between">
                          <span>Budget</span>
                          <span className="font-medium text-emerald-600">{listing.budget.toFixed(0)}&euro;</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Candidatures</span>
                        <span className="font-medium text-navy">{listing._count.applications}</span>
                      </div>
                    </div>

                    {isPhotographer && (
                      <Dialog open={applyingId === listing.id} onOpenChange={(open) => {
                        setApplyingId(open ? listing.id : null);
                        if (!open) { setApplyMessage(""); setApplyRate(""); }
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" size="sm">Postuler</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Postuler — {listing.title}</DialogTitle>
                            <DialogDescription>Présentez votre candidature à l&apos;organisateur</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Message (optionnel)</Label>
                              <textarea
                                value={applyMessage}
                                onChange={(e) => setApplyMessage(e.target.value)}
                                placeholder="Présentez-vous, votre expérience, votre matériel..."
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tarif proposé (EUR, optionnel)</Label>
                              <Input
                                type="number"
                                value={applyRate}
                                onChange={(e) => setApplyRate(e.target.value)}
                                placeholder="Ex: 350"
                              />
                            </div>
                            <Button className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" onClick={() => handleApply(listing.id)}>
                              Envoyer ma candidature
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {!session?.user && (
                      <Link href="/login">
                        <Button variant="outline" className="w-full border-orange text-orange hover:bg-orange-50" size="sm">
                          Connectez-vous pour postuler
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
