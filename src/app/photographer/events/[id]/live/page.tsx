"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface LivePhoto {
  id: string;
  filename: string;
  bibNumbers: string[];
  timestamp: string;
}

interface LiveStats {
  totalPhotos: number;
  processed: number;
}

export default function LiveUploadPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState<LiveStats>({ totalPhotos: 0, processed: 0 });
  const [recentPhotos, setRecentPhotos] = useState<LivePhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [eventName, setEventName] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  // Fetch event name
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/events/${id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setEventName(data.name);
      })
      .catch(() => {});
  }, [id, status]);

  // Connect to SSE stream
  useEffect(() => {
    if (status !== "authenticated") return;

    const es = new EventSource(`/api/events/${id}/live-upload`);
    eventSourceRef.current = es;

    es.onopen = () => setIsConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "init":
            setStats(data.stats);
            setRecentPhotos(data.recentPhotos || []);
            break;
          case "photo_received":
            setStats(data.stats);
            break;
          case "photo_processed":
            setStats(data.stats);
            setRecentPhotos((prev) => {
              const updated = [data.photo, ...prev];
              return updated.slice(0, 20);
            });
            break;
          case "photo_error":
            toast({
              title: "Erreur de traitement",
              description: `Photo ${data.photoId} : ${data.error}`,
              variant: "destructive",
            });
            break;
        }
      } catch {
        // Ignore parse errors (heartbeats)
      }
    };

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [id, status, toast]);

  // Process upload queue
  const processQueue = useCallback(async (files: File[]) => {
    if (uploadingRef.current || files.length === 0) return;

    uploadingRef.current = true;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const formData = new FormData();
        formData.append("file", file);

        await fetch(`/api/events/${id}/live-upload`, {
          method: "POST",
          body: formData,
        });
      } catch {
        console.error(`Upload error for ${file.name}`);
      }

      // Remove from queue
      setUploadQueue((prev) => prev.slice(1));
    }

    uploadingRef.current = false;
    setIsUploading(false);
  }, [id]);

  useEffect(() => {
    if (uploadQueue.length > 0 && !uploadingRef.current) {
      processQueue(uploadQueue);
    }
  }, [uploadQueue, processQueue]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadQueue((prev) => [...prev, ...files]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) {
      setUploadQueue((prev) => [...prev, ...files]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white/50">Chargement...</p>
      </div>
    );
  }

  const pendingProcessing = stats.totalPhotos - stats.processed;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header bar */}
      <header className="bg-gray-800 border-b border-white/10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange flex items-center justify-center">
                <span className="text-white font-bold text-sm">FR</span>
              </div>
              <span className="text-xl font-bold">Focus <span className="text-orange">Racer</span></span>
            </Link>
            <Badge variant={isConnected ? "default" : "destructive"} className={isConnected ? "bg-emerald-500" : ""}>
              {isConnected ? "En direct" : "Déconnecté"}
            </Badge>
          </div>
          <Link href={`/photographer/events/${id}`}>
            <Button variant="outline" size="sm" className="text-white/70 border-white/10 hover:bg-white/5">
              Quitter le mode live
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">{eventName || "Événement"}</h1>
        <p className="text-white/50 mb-6">Mode Upload Live — Tethering Cloud</p>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="bg-gray-800 border-white/10 rounded-2xl">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-orange">{stats.totalPhotos}</p>
              <p className="text-sm text-white/50 mt-1">Photos reçues</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-white/10 rounded-2xl">
            <CardContent className="pt-6 text-center">
              <p className="text-4xl font-bold text-emerald-400">{stats.processed}</p>
              <p className="text-sm text-white/50 mt-1">Traitées</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-800 border-white/10 rounded-2xl">
            <CardContent className="pt-6 text-center">
              <p className={`text-4xl font-bold ${pendingProcessing > 0 ? "text-amber-400" : "text-white/40"}`}>
                {pendingProcessing}
              </p>
              <p className="text-sm text-white/50 mt-1">En file d&apos;attente</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Drop zone */}
          <Card className="bg-gray-800 border-white/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white">Envoyer des photos</CardTitle>
              <CardDescription className="text-white/50">
                Glissez-déposez vos photos ou cliquez pour sélectionner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-white/10 rounded-xl p-12 text-center hover:border-orange transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="text-5xl mb-4">
                  {isUploading ? (
                    <div className="animate-spin w-12 h-12 border-4 border-orange border-t-transparent rounded-full mx-auto" />
                  ) : (
                    <span className="text-white/40">&#128247;</span>
                  )}
                </div>
                {isUploading ? (
                  <p className="text-orange">
                    Envoi en cours... ({uploadQueue.length} restant{uploadQueue.length > 1 ? "s" : ""})
                  </p>
                ) : (
                  <>
                    <p className="text-white/50 mb-2">Glissez vos photos ici</p>
                    <p className="text-white/40 text-sm">ou cliquez pour sélectionner</p>
                  </>
                )}
              </div>

              {uploadQueue.length > 0 && (
                <div className="mt-4">
                  <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange h-full transition-all duration-300"
                      style={{ width: `${stats.totalPhotos > 0 ? (stats.processed / stats.totalPhotos) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1 text-right">
                    {stats.processed}/{stats.totalPhotos}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live feed */}
          <Card className="bg-gray-800 border-white/10 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Flux en direct
                {pendingProcessing > 0 && (
                  <div className="animate-pulse w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </CardTitle>
              <CardDescription className="text-white/50">
                Dernières photos traitées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPhotos.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <p>En attente de photos...</p>
                  <p className="text-sm mt-1">Les photos traitées apparaîtront ici</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {recentPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/80 truncate">
                          {photo.filename}
                        </p>
                        <p className="text-xs text-white/40">
                          {new Date(photo.timestamp).toLocaleTimeString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {photo.bibNumbers.length > 0 ? (
                          photo.bibNumbers.map((bib) => (
                            <Badge key={bib} variant="secondary" className="text-xs bg-orange/20">
                              #{bib}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-white/40">Aucun dossard</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
