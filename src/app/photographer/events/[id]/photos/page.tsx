"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchBib, setSearchBib] = useState("");

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

  const filteredPhotos = searchBib
    ? event.photos.filter((photo) =>
        photo.bibNumbers.some((bib) => bib.number.includes(searchBib))
      )
    : event.photos;

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
                Photos - {event.name}
              </h1>
              <p className="text-slate-600 mt-1">
                {event.photos.length} photo{event.photos.length > 1 ? "s" : ""} au total
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200"
              >
                {/* Photo */}
                <Image
                  src={photo.thumbnailPath || photo.webPath || photo.path}
                  alt={photo.originalName}
                  fill
                  className="object-cover"
                  sizes="100px"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>

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
        )}
      </div>
    </div>
  );
}
