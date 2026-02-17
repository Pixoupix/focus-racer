"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ProtectedImage from "@/components/protected-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course à pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Course à obstacles",
  OTHER: "Autre",
};

interface PublicPhoto {
  id: string;
  src: string;
  originalName: string;
  bibNumbers: { id: string; number: string }[];
}

interface PublicEvent {
  id: string;
  name: string;
  date: string;
  location: string | null;
  description: string | null;
  sportType: string;
  coverImage: string | null;
  bannerImage: string | null;
  logoImage: string | null;
  primaryColor: string | null;
  photographer: string;
  photoCount: number;
  runnerCount: number;
  photos: PublicPhoto[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface SearchResult {
  runner: { firstName: string; lastName: string; bibNumber: string } | null;
  matchedRunners?: { firstName: string; lastName: string; bibNumber: string }[];
  count: number;
  photos: PublicPhoto[];
}

export default function PublicEventPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewerPhoto, setViewerPhoto] = useState<PublicPhoto | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`favorites_${id}`);
    if (stored) {
      setFavorites(new Set(JSON.parse(stored)));
    }
  }, [id]);

  const saveFavorites = useCallback((newFavs: Set<string>) => {
    setFavorites(newFavs);
    localStorage.setItem(`favorites_${id}`, JSON.stringify(Array.from(newFavs)));
  }, [id]);

  const toggleFavorite = (photoId: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(photoId)) {
      newFavs.delete(photoId);
    } else {
      newFavs.add(photoId);
    }
    saveFavorites(newFavs);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/public/${id}`);
        if (response.ok) {
          setEvent(await response.json());
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // Infinite scroll: load more photos when sentinel enters viewport
  const loadMorePhotos = useCallback(async () => {
    if (!event?.nextCursor || !event.hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/events/public/${id}?cursor=${event.nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setEvent((prev) => prev ? {
          ...prev,
          photos: [...prev.photos, ...data.photos],
          nextCursor: data.nextCursor,
          hasMore: data.hasMore,
        } : prev);
      }
    } catch (error) {
      console.error("Error loading more photos:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [event?.nextCursor, event?.hasMore, isLoadingMore, id]);

  useEffect(() => {
    if (!event?.hasMore || searchResult) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMorePhotos(); },
      { rootMargin: "400px" }
    );
    const el = loadMoreRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [event?.hasMore, searchResult, loadMorePhotos]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResult(null);
      return;
    }
    setIsSearching(true);
    try {
      const isNumber = /^\d+$/.test(searchQuery.trim());
      const param = isNumber ? `bib=${searchQuery.trim()}` : `name=${encodeURIComponent(searchQuery.trim())}`;
      const response = await fetch(`/api/photos/search?eventId=${id}&${param}`);
      if (response.ok) {
        setSearchResult(await response.json());
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResult(null);
  };

  // Photo viewer navigation
  const displayPhotos = searchResult ? searchResult.photos : event?.photos || [];

  const openViewer = (photo: PublicPhoto, index: number) => {
    setViewerPhoto(photo);
    setViewerIndex(index);
  };

  // Prefetch adjacent images on hover for instant lightbox
  const prefetchImage = useCallback((index: number) => {
    const targets = [index - 1, index, index + 1];
    for (const i of targets) {
      if (i >= 0 && i < displayPhotos.length) {
        const img = new window.Image();
        img.src = displayPhotos[i].src;
      }
    }
  }, [displayPhotos]);

  const closeViewer = () => setViewerPhoto(null);

  const navigateViewer = (direction: number) => {
    const newIndex = viewerIndex + direction;
    if (newIndex >= 0 && newIndex < displayPhotos.length) {
      setViewerIndex(newIndex);
      setViewerPhoto(displayPhotos[newIndex]);
    }
  };

  // Keyboard navigation for viewer
  useEffect(() => {
    if (!viewerPhoto) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") navigateViewer(-1);
      if (e.key === "ArrowRight") navigateViewer(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen gradient-bg-subtle flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Événement non trouvé ou non publié</p>
          <Link href="/runner">
            <Button className="bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200">Voir les événements</Button>
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = event.primaryColor || "#14B8A6";
  const favCount = favorites.size;

  // Block Ctrl+S / Ctrl+Shift+I / Ctrl+U on gallery (deters casual save attempts)
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key === "s") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.shiftKey && e.key === "I")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", block);
    return () => window.removeEventListener("keydown", block);
  }, []);

  return (
    <div className="min-h-screen gradient-bg-subtle gallery-protected">
      {/* Header with branding */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-navy">
            Focus Racer
          </Link>
          <div className="flex items-center gap-3">
            {favCount > 0 && (
              <Link href={`/events/${id}/favorites`}>
                <Button variant="outline" size="sm">
                  <span className="text-emerald mr-1">&hearts;</span> {favCount} favori{favCount > 1 ? "s" : ""}
                </Button>
              </Link>
            )}
            <Link href="/runner">
              <Button variant="outline" size="sm">Tous les événements</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Banner */}
      {event.bannerImage && (
        <div className="relative h-48 md:h-64 overflow-hidden">
          <Image src={event.bannerImage} alt={event.name} fill className="object-cover" />
          <div className="absolute inset-0 bg-navy/30" />
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Event info */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            {event.logoImage && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border flex-shrink-0">
                <Image src={event.logoImage} alt="Logo" fill className="object-contain" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-navy">{event.name}</h1>
              <p className="text-muted-foreground">
                {new Date(event.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {event.location && ` \u2022 ${event.location}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="border-emerald/30 text-emerald">{SPORT_LABELS[event.sportType] || event.sportType}</Badge>
            <Badge variant="secondary" className="bg-emerald/10 text-emerald">{event.photoCount} photos</Badge>
            {event.runnerCount > 0 && (
              <Badge variant="secondary" className="bg-emerald/10 text-emerald">{event.runnerCount} coureurs</Badge>
            )}
            <span className="text-sm text-muted-foreground">par {event.photographer}</span>
          </div>
          {event.description && (
            <p className="text-muted-foreground max-w-2xl">{event.description}</p>
          )}
        </div>

        {/* Search bar */}
        <Card className="mb-8 glass-card rounded-2xl">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm text-muted-foreground mb-2">
                  Recherchez par numéro de dossard{event.runnerCount > 0 ? ", nom" : ""} ou selfie
                </p>
                <Input
                  placeholder={event.runnerCount > 0 ? "N° de dossard ou nom..." : "N° de dossard..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/90 backdrop-blur-sm border-white/30 shadow-glass-lg"
                />
              </div>
              <Button type="submit" disabled={isSearching || !searchQuery.trim()} className="bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200" style={{ backgroundColor: primaryColor }}>
                {isSearching ? "Recherche..." : "Rechercher"}
              </Button>
              {/* Selfie search */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsSearching(true);
                    try {
                      const formData = new FormData();
                      formData.append("selfie", file);
                      formData.append("eventId", id);
                      const res = await fetch("/api/photos/search-face", {
                        method: "POST",
                        body: formData,
                      });
                      if (res.ok) {
                        setSearchResult(await res.json());
                      }
                    } catch (err) {
                      console.error("Selfie search error:", err);
                    } finally {
                      setIsSearching(false);
                      e.target.value = "";
                    }
                  }}
                />
                <span
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-md border border-emerald/30 text-sm font-medium hover:bg-emerald-50 transition-colors"
                  title="Rechercher par selfie"
                >
                  &#128247; Selfie
                </span>
              </label>
              {searchResult && (
                <Button type="button" variant="outline" onClick={clearSearch}>
                  Tout voir
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Search result info */}
        {searchResult && (
          <div className="mb-6">
            {searchResult.runner && (
              <div className="bg-white rounded-lg p-4 mb-4 border" style={{ borderLeftColor: primaryColor, borderLeftWidth: 4 }}>
                <p className="font-semibold">
                  {searchResult.runner.firstName} {searchResult.runner.lastName}
                  <Badge variant="secondary" className="ml-2 bg-emerald/10 text-emerald">#{searchResult.runner.bibNumber}</Badge>
                </p>
              </div>
            )}
            {searchResult.matchedRunners && searchResult.matchedRunners.length > 1 && (
              <p className="text-sm text-muted-foreground mb-2">
                {searchResult.matchedRunners.length} coureurs correspondent
              </p>
            )}
            <p className="text-navy">
              {searchResult.count > 0
                ? `${searchResult.count} photo${searchResult.count > 1 ? "s" : ""} trouvée${searchResult.count > 1 ? "s" : ""}`
                : "Aucune photo trouvée"}
            </p>
          </div>
        )}

        {/* Photo gallery grid */}
        {displayPhotos.length === 0 && !searchResult ? (
          <Card className="glass-card rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucune photo disponible</p>
            </CardContent>
          </Card>
        ) : displayPhotos.length === 0 && searchResult ? null : (
          <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {displayPhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="group relative bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-glass-lg transition-shadow cursor-pointer"
                onClick={() => openViewer(photo, index)}
                onMouseEnter={() => prefetchImage(index)}
              >
                <div className="aspect-[4/3] relative">
                  <ProtectedImage
                    src={photo.src}
                    alt={photo.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    loading="lazy"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors z-10"
                  >
                    <span className={favorites.has(photo.id) ? "text-emerald fill-emerald" : "text-muted-foreground"}>
                      {favorites.has(photo.id) ? "\u2665" : "\u2661"}
                    </span>
                  </button>
                </div>
                {photo.bibNumbers.length > 0 && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {photo.bibNumbers.map((bib) => (
                      <Badge key={bib.id} variant="secondary" className="text-xs bg-emerald/10 text-emerald">
                        #{bib.number}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Infinite scroll sentinel */}
          {!searchResult && event?.hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isLoadingMore ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : (
                <p className="text-muted-foreground text-xs">Scroll pour plus de photos</p>
              )}
            </div>
          )}
          </>
        )}

        {/* Copyright notice */}
        <div className="mt-8 pb-4 text-center text-xs text-muted-foreground">
          <p>
            Photos protegees par le droit d&apos;auteur. Toute reproduction interdite.{" "}
            <Link href="/legal#protection-photos" className="underline hover:text-navy">
              En savoir plus
            </Link>
          </p>
        </div>
      </main>

      {/* Photo Viewer / Lightbox */}
      {viewerPhoto && (
        <div
          className="fixed inset-0 z-50 bg-navy/90 flex items-center justify-center"
          onClick={closeViewer}
        >
          {/* Close button */}
          <button className="absolute top-4 right-4 text-white text-3xl z-10 hover:text-white/70" onClick={closeViewer}>
            &times;
          </button>

          {/* Favorite button */}
          <button
            className="absolute top-4 left-4 text-2xl z-10"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(viewerPhoto.id); }}
          >
            <span className={favorites.has(viewerPhoto.id) ? "text-emerald fill-emerald" : "text-white/70"}>
              {favorites.has(viewerPhoto.id) ? "\u2665" : "\u2661"}
            </span>
          </button>

          {/* Navigation arrows */}
          {viewerIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-white/70 z-10"
              onClick={(e) => { e.stopPropagation(); navigateViewer(-1); }}
            >
              &lsaquo;
            </button>
          )}
          {viewerIndex < displayPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-white/70 z-10"
              onClick={(e) => { e.stopPropagation(); navigateViewer(1); }}
            >
              &rsaquo;
            </button>
          )}

          {/* Photo */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <ProtectedImage
              src={viewerPhoto.src}
              alt={viewerPhoto.originalName}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Info bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-navy/60 rounded-lg px-4 py-2 text-white text-sm flex items-center gap-3">
            <span>{viewerIndex + 1} / {displayPhotos.length}</span>
            {viewerPhoto.bibNumbers.length > 0 && (
              <>
                <span className="text-white/40">|</span>
                {viewerPhoto.bibNumbers.map((bib) => (
                  <Badge key={bib.id} variant="secondary" className="text-xs bg-emerald/10 text-emerald">
                    #{bib.number}
                  </Badge>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
