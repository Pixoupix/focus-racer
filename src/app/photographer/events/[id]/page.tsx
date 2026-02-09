"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PhotoWithBibNumbers, Event } from "@/types";

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course a pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Course a obstacles",
  OTHER: "Autre",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  DRAFT: { label: "Brouillon", variant: "secondary" },
  PUBLISHED: { label: "Publie", variant: "default" },
  ARCHIVED: { label: "Archive", variant: "outline" },
};

const SPORT_TYPES = [
  { value: "RUNNING", label: "Course a pied" },
  { value: "TRAIL", label: "Trail" },
  { value: "TRIATHLON", label: "Triathlon" },
  { value: "CYCLING", label: "Cyclisme" },
  { value: "SWIMMING", label: "Natation" },
  { value: "OBSTACLE", label: "Course a obstacles" },
  { value: "OTHER", label: "Autre" },
];

interface EventDetail extends Event {
  photos: PhotoWithBibNumbers[];
  _count: { photos: number; startListEntries: number };
}

export default function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterBib, setFilterBib] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addBibPhotoId, setAddBibPhotoId] = useState<string | null>(null);
  const [newBibNumber, setNewBibNumber] = useState("");
  const [isUploadingBranding, setIsUploadingBranding] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<{ pending: number; notified: number; withEmail: number } | null>(null);
  const [isClustering, setIsClustering] = useState(false);
  const [clusteringStats, setClusteringStats] = useState<{
    totalPhotos: number;
    photosWithBibs: number;
    photosWithFaces: number;
    orphanPhotos: number;
    lastClusteredAt: string | null;
    needsClustering: boolean;
  } | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSportType, setEditSportType] = useState("RUNNING");
  const [editStatus, setEditStatus] = useState("DRAFT");
  const [editColor, setEditColor] = useState("#3b82f6");

  const fetchEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
        // Populate edit form
        setEditName(data.name);
        setEditDate(new Date(data.date).toISOString().split("T")[0]);
        setEditLocation(data.location || "");
        setEditDescription(data.description || "");
        setEditSportType(data.sportType || "RUNNING");
        setEditStatus(data.status || "DRAFT");
        setEditColor(data.primaryColor || "#3b82f6");
      } else {
        toast({
          title: "Erreur",
          description: "Evenement non trouve",
          variant: "destructive",
        });
        router.push("/photographer/dashboard");
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchNotifyStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}/notify-runners`);
      if (response.ok) {
        setNotifyStatus(await response.json());
      }
    } catch {
      // ignore
    }
  }, [id]);

  const fetchClusteringStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}/cluster-faces`);
      if (response.ok) {
        setClusteringStats(await response.json());
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvent();
      fetchNotifyStatus();
      fetchClusteringStats();
    }
  }, [status, fetchEvent, fetchNotifyStatus, fetchClusteringStats]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        const updated = await response.json();
        setEvent((prev) => prev ? { ...prev, ...updated } : prev);
        setEditStatus(newStatus);
        toast({ title: "Statut mis a jour" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de changer le statut", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          date: editDate,
          location: editLocation || null,
          description: editDescription || null,
          sportType: editSportType,
          status: editStatus,
          primaryColor: editColor,
        }),
      });
      if (response.ok) {
        await fetchEvent();
        setEditOpen(false);
        toast({ title: "Evenement mis a jour" });
      } else {
        const data = await response.json();
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cet evenement et toutes ses photos ? Cette action est irreversible.")) return;
    try {
      const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Evenement supprime" });
        router.push("/photographer/dashboard");
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handleNotifyRunners = async () => {
    if (!confirm(
      notifyStatus?.pending
        ? `Envoyer un email a ${notifyStatus.pending} coureur${notifyStatus.pending > 1 ? "s" : ""} pour les informer que leurs photos sont disponibles ?`
        : "Envoyer les notifications par email aux coureurs ?"
    )) return;

    setIsNotifying(true);
    try {
      const response = await fetch(`/api/events/${id}/notify-runners`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Notifications envoyees",
          description: data.message,
        });
        fetchNotifyStatus();
      } else {
        toast({
          title: "Erreur",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'envoyer les notifications", variant: "destructive" });
    } finally {
      setIsNotifying(false);
    }
  };

  const handleClusterFaces = async () => {
    if (!clusteringStats?.orphanPhotos) return;

    if (!confirm(
      `Lancer le clustering facial pour associer ${clusteringStats.orphanPhotos} photo${clusteringStats.orphanPhotos > 1 ? "s" : ""} orpheline${clusteringStats.orphanPhotos > 1 ? "s" : ""} aux dossards detectes ?`
    )) return;

    setIsClustering(true);
    try {
      const response = await fetch(`/api/events/${id}/cluster-faces`, {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Clustering termine",
          description: data.message,
        });
        fetchEvent();
        fetchClusteringStats();
      } else {
        toast({
          title: "Erreur",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de lancer le clustering", variant: "destructive" });
    } finally {
      setIsClustering(false);
    }
  };

  const handleBrandingUpload = async (imageType: string, file: File) => {
    setIsUploadingBranding(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", imageType);
      const response = await fetch(`/api/events/${id}/branding`, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        await fetchEvent();
        toast({ title: "Image mise a jour" });
      } else {
        toast({ title: "Erreur d'upload", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsUploadingBranding(false);
    }
  };

  const handleAddBib = async (photoId: string) => {
    if (!newBibNumber.trim()) return;
    try {
      const response = await fetch(`/api/photos/${photoId}/bib-numbers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: newBibNumber.trim() }),
      });
      if (response.ok) {
        setNewBibNumber("");
        setAddBibPhotoId(null);
        fetchEvent();
        toast({ title: "Dossard ajoute" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleRemoveBib = async (photoId: string, bibId: string) => {
    try {
      const response = await fetch(`/api/photos/${photoId}/bib-numbers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bibId }),
      });
      if (response.ok) {
        fetchEvent();
        toast({ title: "Dossard retire" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Supprimer cette photo ?")) return;
    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
      if (response.ok) {
        fetchEvent();
        toast({ title: "Photo supprimee" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) return null;

  const filteredPhotos = filterBib
    ? event.photos.filter((photo) =>
        photo.bibNumbers.some((bib) => bib.number.includes(filterBib))
      )
    : event.photos;

  const uniqueBibNumbers = [
    ...new Set(
      event.photos.flatMap((photo) => photo.bibNumbers.map((bib) => bib.number))
    ),
  ].sort((a, b) => parseInt(a) - parseInt(b));

  const statusInfo = STATUS_LABELS[event.status || "DRAFT"];

  return (
    <div className="p-8 animate-fade-in">
      <Link
        href="/photographer/events"
        className="text-orange hover:text-orange-dark transition-colors mb-4 inline-block"
      >
        &larr; Retour aux evenements
      </Link>

        {/* Event header card */}
        <Card className="mb-8 bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl text-navy">{event.name}</CardTitle>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-sm">
                  {new Date(event.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {event.location && ` \u2022 ${event.location}`}
                  {" \u2022 "}
                  {SPORT_LABELS[event.sportType || "RUNNING"]}
                </CardDescription>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {/* Quick status toggle */}
                {event.status === "DRAFT" && (
                  <Button variant="outline" size="sm" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200" onClick={() => handleStatusChange("PUBLISHED")}>
                    Publier
                  </Button>
                )}
                {event.status === "PUBLISHED" && (
                  <Button variant="outline" size="sm" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200" onClick={() => handleStatusChange("ARCHIVED")}>
                    Archiver
                  </Button>
                )}
                {event.status === "ARCHIVED" && (
                  <Button variant="outline" size="sm" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200" onClick={() => handleStatusChange("DRAFT")}>
                    Remettre en brouillon
                  </Button>
                )}
                <Link href={`/photographer/events/${id}/start-list`}>
                  <Button variant="outline" size="sm" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200">Start-List</Button>
                </Link>
                <Link href={`/photographer/events/${id}/packs`}>
                  <Button variant="outline" size="sm" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200">Packs de vente</Button>
                </Link>
                {notifyStatus && notifyStatus.pending > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNotifyRunners}
                    disabled={isNotifying}
                    className="text-orange border-orange/30 hover:bg-orange-50 transition-all duration-200"
                  >
                    {isNotifying
                      ? "Envoi en cours..."
                      : `Notifier ${notifyStatus.pending} coureur${notifyStatus.pending > 1 ? "s" : ""}`}
                  </Button>
                )}
                {notifyStatus && notifyStatus.pending === 0 && notifyStatus.notified > 0 && (
                  <Badge variant="outline" className="text-orange border-orange/30 py-1.5">
                    {notifyStatus.notified} notifie{notifyStatus.notified > 1 ? "s" : ""}
                  </Badge>
                )}
                {clusteringStats && clusteringStats.orphanPhotos > 0 && clusteringStats.photosWithFaces > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClusterFaces}
                    disabled={isClustering}
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 transition-all duration-200"
                    title={`${clusteringStats.orphanPhotos} photos sans dossard peuvent etre associees par reconnaissance faciale`}
                  >
                    {isClustering
                      ? "Clustering..."
                      : `Lier ${clusteringStats.orphanPhotos} photo${clusteringStats.orphanPhotos > 1 ? "s" : ""} par visage`}
                  </Button>
                )}
                <Link href={`/photographer/events/${id}/upload`}>
                  <Button size="sm" className="bg-orange hover:bg-orange-hover text-white shadow-orange transition-all duration-200">Ajouter des photos</Button>
                </Link>
                <Link href={`/photographer/events/${id}/live`}>
                  <Button size="sm" variant="outline" className="text-orange border-orange/30 hover:bg-orange-50 transition-all duration-200">
                    Mode Live
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap items-center">
              <Badge variant="secondary" className="bg-orange/10 text-orange">
                {event._count.photos} photo{event._count.photos !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="border-orange/30 text-orange">
                {uniqueBibNumbers.length} dossard{uniqueBibNumbers.length !== 1 ? "s" : ""} detecte{uniqueBibNumbers.length !== 1 ? "s" : ""}
              </Badge>
              {event._count.startListEntries > 0 && (
                <Badge variant="outline" className="border-orange/30 text-orange">
                  {event._count.startListEntries} coureur{event._count.startListEntries !== 1 ? "s" : ""} inscrit{event._count.startListEntries !== 1 ? "s" : ""}
                </Badge>
              )}
              <Separator orientation="vertical" className="h-5" />
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">Modifier</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-navy">Modifier l&apos;evenement</DialogTitle>
                    <DialogDescription>Modifiez les informations de votre evenement</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleEdit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Nom *</Label>
                      <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-date">Date *</Label>
                        <Input id="edit-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Sport</Label>
                        <Select value={editSportType} onValueChange={setEditSportType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPORT_TYPES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-location">Lieu</Label>
                      <Input id="edit-location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Description</Label>
                      <textarea
                        id="edit-description"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Statut</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                            <SelectItem value="PUBLISHED">Publie</SelectItem>
                            <SelectItem value="ARCHIVED">Archive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-color">Couleur principale</Label>
                        <div className="flex gap-2 items-center">
                          <input
                            id="edit-color"
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-9 w-12 rounded border border-input cursor-pointer"
                          />
                          <Input
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="flex-1"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Branding images */}
                    <Separator />
                    <p className="text-sm font-medium text-navy">Branding visuel</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: "coverImage", label: "Couverture" },
                        { key: "bannerImage", label: "Banniere" },
                        { key: "logoImage", label: "Logo" },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{label}</Label>
                          {event && (event as unknown as Record<string, unknown>)[key] ? (
                            <div className="relative aspect-video rounded border overflow-hidden">
                              <Image
                                src={(event as unknown as Record<string, unknown>)[key] as string}
                                alt={label}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video rounded border border-dashed flex items-center justify-center text-xs text-muted-foreground">
                              Aucune
                            </div>
                          )}
                          <Input
                            type="file"
                            accept="image/*"
                            className="text-xs h-8"
                            disabled={isUploadingBranding}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleBrandingUpload(key, file);
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" className="border-orange/30 text-orange hover:bg-orange-50 transition-all duration-200" onClick={() => setEditOpen(false)}>Annuler</Button>
                      <Button type="submit" className="bg-orange hover:bg-orange-hover text-white shadow-orange transition-all duration-200" disabled={isSaving}>
                        {isSaving ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Photo filter */}
        {event.photos.length > 0 && (
          <div className="mb-6">
            <Input
              placeholder="Filtrer par numero de dossard..."
              value={filterBib}
              onChange={(e) => setFilterBib(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}

        {/* Photo grid */}
        {filteredPhotos.length === 0 ? (
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                {event.photos.length === 0
                  ? "Aucune photo n'a encore ete ajoutee"
                  : "Aucune photo ne correspond a ce filtre"}
              </p>
              {event.photos.length === 0 && (
                <Link href={`/photographer/events/${id}/upload`}>
                  <Button className="bg-orange hover:bg-orange-hover text-white shadow-orange transition-all duration-200">Ajouter des photos</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group bg-white border-0 shadow-sm rounded-2xl hover:shadow-glass-lg transition-all duration-200">
                <div className="aspect-square relative">
                  <Image
                    src={photo.webPath || photo.path}
                    alt={photo.originalName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer"
                  >
                    &times;
                  </button>
                </div>
                <CardContent className="p-3 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {photo.bibNumbers.length > 0 ? (
                      photo.bibNumbers.map((bib) => (
                        <Badge
                          key={bib.id}
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-red-100 group/bib bg-orange/10 text-orange"
                          onClick={() => handleRemoveBib(photo.id, bib.id)}
                          title="Cliquez pour retirer ce dossard"
                        >
                          #{bib.number} <span className="ml-1 opacity-0 group-hover/bib:opacity-100">&times;</span>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Aucun dossard
                      </span>
                    )}
                  </div>
                  {addBibPhotoId === photo.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={newBibNumber}
                        onChange={(e) => setNewBibNumber(e.target.value)}
                        placeholder="N"
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddBib(photo.id);
                          }
                          if (e.key === "Escape") setAddBibPhotoId(null);
                        }}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 text-xs px-2 bg-orange hover:bg-orange-hover text-white shadow-orange transition-all duration-200" onClick={() => handleAddBib(photo.id)}>
                        OK
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddBibPhotoId(photo.id); setNewBibNumber(""); }}
                      className="text-xs text-orange hover:text-orange-dark transition-colors"
                    >
                      + Ajouter un dossard
                    </button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bib number list */}
        {uniqueBibNumbers.length > 0 && (
          <Card className="mt-8 bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle className="text-navy">Dossards detectes</CardTitle>
              <CardDescription>
                Cliquez sur un dossard pour filtrer les photos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {uniqueBibNumbers.map((num) => (
                  <Badge
                    key={num}
                    variant={filterBib === num ? "default" : "outline"}
                    className={filterBib === num ? "cursor-pointer bg-orange hover:bg-orange-hover" : "cursor-pointer border-orange/30 text-orange hover:bg-orange-50"}
                    onClick={() => setFilterBib(filterBib === num ? "" : num)}
                  >
                    #{num}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
