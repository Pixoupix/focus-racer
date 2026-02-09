"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course a pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacles",
  OTHER: "Autre",
};

interface PublicEvent {
  id: string;
  name: string;
  date: string;
  location: string | null;
  sportType: string;
  coverImage: string | null;
  primaryColor: string | null;
  user: { name: string };
  _count: { photos: number };
}

export default function RunnerPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events/public");
        if (response.ok) {
          setEvents(await response.json());
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16">
        {/* Hero mini */}
        <div className="gradient-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
          <div className="relative container mx-auto px-4 py-16 md:py-20">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 animate-fade-in">
                Trouvez vos photos de course
              </h1>
              <p className="text-white/70 max-w-lg mx-auto mb-8 animate-fade-in animation-delay-100">
                Selectionnez un evenement puis recherchez par numero de dossard ou par nom
              </p>
              <div className="max-w-md mx-auto animate-fade-in animation-delay-200">
                <Input
                  placeholder="Rechercher un evenement..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-center bg-white/90 backdrop-blur-sm border-white/30 shadow-glass-lg h-12 rounded-xl text-navy placeholder:text-navy/40"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Chargement des evenements...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card className="glass-card max-w-md mx-auto rounded-2xl">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {events.length === 0
                    ? "Aucun evenement publie pour le moment"
                    : "Aucun evenement ne correspond a votre recherche"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {filteredEvents.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`} className="block group">
                  <Card className="glass-card rounded-2xl overflow-hidden hover:shadow-glass-lg transition-all duration-300 h-full">
                    {event.coverImage ? (
                      <div className="aspect-video relative overflow-hidden">
                        <Image
                          src={event.coverImage}
                          alt={event.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div
                        className="aspect-video flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100"
                      >
                        <span className="text-4xl font-bold text-orange/40">
                          {SPORT_LABELS[event.sportType]?.[0] || "E"}
                        </span>
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-navy group-hover:text-orange transition-colors">{event.name}</CardTitle>
                      <CardDescription>
                        {new Date(event.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {event.location && ` \u2022 ${event.location}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <Badge variant="outline" className="border-orange/30 text-orange">{SPORT_LABELS[event.sportType] || event.sportType}</Badge>
                          <Badge className="bg-orange/10 text-orange hover:bg-orange/10">
                            {event._count.photos} photo{event._count.photos !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">par {event.user.name}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
