"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PHOTOS_PER_PAGE = 120;

interface BibNumber {
  id: string;
  number: string;
}

interface Photo {
  id: string;
  originalName: string;
  path: string;
  webPath: string | null;
  thumbnailPath: string | null;
  bibNumbers: BibNumber[];
}

interface Event {
  id: string;
  name: string;
  photos: Photo[];
}

export default function EventPhotosPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showOrphanOnly = searchParams.get("orphan") === "true";
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchBib, setSearchBib] = useState("");
  const [addBibDialogOpen, setAddBibDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [newBibNumber, setNewBibNumber] = useState("");
  const [isAddingBib, setIsAddingBib] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [visibleCount, setVisibleCount] = useState(PHOTOS_PER_PAGE);
  const gridSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${id}`);
        if (res.ok) {
          setEvent(await res.json());
        }
      } catch (error) {
        console.error("Error fetching event:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchEvent();
    }
  }, [id, status]);

  // Reset visible count when filter changes
  useEffect(() => {
    setVisibleCount(PHOTOS_PER_PAGE);
  }, [searchBib, showOrphanOnly]);

  // Progressive rendering: load more photos as user scrolls
  const loadMoreVisible = useCallback(() => {
    setVisibleCount((prev) => prev + PHOTOS_PER_PAGE);
  }, []);

  useEffect(() => {
    const el = gridSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreVisible(); },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.unobserve(el);
  }, [loadMoreVisible]);

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette photo ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/photos/${photoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                photos: prev.photos.filter((p) => p.id !== photoId),
              }
            : null
        );
        toast({
          title: "Photo supprimée",
          description: "La photo a été supprimée avec succès",
        });
      } else {
        throw new Error("Failed to delete");
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la photo",
        variant: "destructive",
      });
    }
  };

  const handleOpenAddBib = (photo: Photo) => {
    setSelectedPhoto(photo);
    setNewBibNumber("");
    setAddBibDialogOpen(true);
  };

  const handleOpenLightbox = (photo: Photo) => {
    setLightboxPhoto(photo);
    setLightboxOpen(true);
  };

  const handleAddBibFromLightbox = () => {
    if (lightboxPhoto) {
      setLightboxOpen(false);
      handleOpenAddBib(lightboxPhoto);
    }
  };

  const handleAddBib = async () => {
    if (!selectedPhoto || !newBibNumber.trim()) return;

    setIsAddingBib(true);
    try {
      const res = await fetch(`/api/photos/${selectedPhoto.id}/bib-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: newBibNumber.trim() }),
      });

      if (res.ok) {
        const newBib = await res.json();
        setEvent((prev) =>
          prev
            ? {
                ...prev,
                photos: prev.photos.map((p) =>
                  p.id === selectedPhoto.id
                    ? { ...p, bibNumbers: [...p.bibNumbers, newBib] }
                    : p
                ),
              }
            : null
        );
        toast({
          title: "Dossard ajouté",
          description: `Dossard ${newBibNumber} ajouté avec succès`,
        });
        setAddBibDialogOpen(false);
      } else {
        throw new Error("Failed to add bib");
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le dossard",
        variant: "destructive",
      });
    } finally {
      setIsAddingBib(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Événement non trouvé</p>
      </div>
    );
  }

  let filteredPhotos = event.photos;

  // Filter by orphan status if requested
  if (showOrphanOnly) {
    filteredPhotos = filteredPhotos.filter((photo) => photo.bibNumbers.length === 0);
  }

  // Filter by bib search
  if (searchBib) {
    filteredPhotos = filteredPhotos.filter((photo) =>
      photo.bibNumbers.some((bib) => bib.number.includes(searchBib))
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/photographer/events/${id}`}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l&apos;événement
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {showOrphanOnly ? "Photos Orphelines" : "Photos"} - {event.name}
              </h1>
              <p className="text-slate-600 mt-1">
                {filteredPhotos.length} photo{filteredPhotos.length > 1 ? "s" : ""}
                {showOrphanOnly ? " orpheline" : ""}{filteredPhotos.length > 1 && showOrphanOnly ? "s" : ""}
                {!showOrphanOnly && ` sur ${event.photos.length} au total`}
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un dossard..."
                value={searchBib}
                onChange={(e) => setSearchBib(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchBib && (
              <p className="text-sm text-muted-foreground mt-2">
                {filteredPhotos.length} résultat{filteredPhotos.length > 1 ? "s" : ""} pour &quot;{searchBib}&quot;
              </p>
            )}
          </CardContent>
        </Card>

        {/* Photos Grid - Miniatures */}
        {filteredPhotos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {event.photos.length === 0
                  ? "Aucune photo n&apos;a encore été ajoutée"
                  : "Aucune photo ne correspond à cette recherche"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {filteredPhotos.slice(0, visibleCount).map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200 cursor-pointer"
                onClick={() => handleOpenLightbox(photo)}
              >
                {/* Photo */}
                <Image
                  src={photo.thumbnailPath ? photo.thumbnailPath.replace("wm_", "micro_") : (photo.webPath || photo.path)}
                  alt={photo.originalName}
                  fill
                  className="object-cover"
                  sizes="100px"
                  loading="lazy"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  <div className="flex gap-1">
                    {/* Add bib button (for orphans) */}
                    {photo.bibNumbers.length === 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddBib(photo);
                        }}
                        className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-emerald-600 transition-colors"
                        title="Ajouter un dossard"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(photo.id);
                      }}
                      className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Bib numbers */}
                  {photo.bibNumbers.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 justify-center">
                      {photo.bibNumbers.map((bib) => (
                        <Badge
                          key={bib.id}
                          variant="secondary"
                          className="text-[10px] px-1 py-0 h-4 bg-emerald-500 text-white"
                        >
                          {bib.number}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bib badge (visible without hover) */}
                {photo.bibNumbers.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-3.5 bg-emerald-500 text-white"
                    >
                      {photo.bibNumbers[0].number}
                      {photo.bibNumbers.length > 1 && ` +${photo.bibNumbers.length - 1}`}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Progressive rendering sentinel */}
          {filteredPhotos.length > visibleCount && (
            <div ref={gridSentinelRef} className="flex justify-center py-6">
              <p className="text-sm text-muted-foreground">
                {visibleCount} / {filteredPhotos.length} photos affichees
              </p>
            </div>
          )}
          </>
        )}

        {/* Add Bib Dialog */}
        <Dialog open={addBibDialogOpen} onOpenChange={setAddBibDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un dossard</DialogTitle>
              <DialogDescription>
                Ajoutez manuellement un numéro de dossard à cette photo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bibNumber">Numéro de dossard</Label>
                <Input
                  id="bibNumber"
                  placeholder="Ex: 1234"
                  value={newBibNumber}
                  onChange={(e) => setNewBibNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isAddingBib) {
                      handleAddBib();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddBibDialogOpen(false)}
                  disabled={isAddingBib}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddBib}
                  disabled={!newBibNumber.trim() || isAddingBib}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {isAddingBib ? "Ajout..." : "Ajouter"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lightbox */}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent className="max-w-5xl h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{lightboxPhoto?.originalName}</span>
                {lightboxPhoto?.bibNumbers && lightboxPhoto.bibNumbers.length > 0 && (
                  <div className="flex gap-2">
                    {lightboxPhoto.bibNumbers.map((bib) => (
                      <Badge key={bib.id} className="bg-emerald-500 text-white">
                        Dossard {bib.number}
                      </Badge>
                    ))}
                  </div>
                )}
              </DialogTitle>
            </DialogHeader>
            <div className="relative flex-1 min-h-0">
              {lightboxPhoto && (
                <div className="relative w-full h-full">
                  <Image
                    src={lightboxPhoto.webPath || lightboxPhoto.path}
                    alt={lightboxPhoto.originalName}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1280px) 90vw, 1200px"
                    priority
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t">
              {lightboxPhoto?.bibNumbers.length === 0 && (
                <Button
                  onClick={handleAddBibFromLightbox}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un dossard
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => {
                  if (lightboxPhoto) {
                    setLightboxOpen(false);
                    handleDeletePhoto(lightboxPhoto.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
              <Button
                variant="outline"
                onClick={() => setLightboxOpen(false)}
                className="ml-auto"
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
