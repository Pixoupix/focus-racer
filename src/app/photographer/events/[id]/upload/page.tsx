"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@/types";

interface UploadStatus {
  file: File;
  status: "pending" | "uploading" | "processing" | "done" | "error";
  bibNumbers?: string[];
  error?: string;
}

export default function UploadPage({
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
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEvent(data);
        } else {
          toast({
            title: "Erreur",
            description: "Événement non trouvé",
            variant: "destructive",
          });
          router.push("/photographer/dashboard");
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
  }, [id, status, router, toast]);

  const uploadFile = useCallback(async (file: File, index: number) => {
    setUploads((prev) =>
      prev.map((u, i) => (i === index ? { ...u, status: "uploading" } : u))
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("eventId", id);

    try {
      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      // Mark as done - OCR runs in background on server
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? { ...u, status: "done", bibNumbers: data.bibNumbers || [] }
            : u
        )
      );
    } catch (error) {
      setUploads((prev) =>
        prev.map((u, i) =>
          i === index
            ? {
                ...u,
                status: "error",
                error: error instanceof Error ? error.message : "Erreur inconnue",
              }
            : u
        )
      );
    }
  }, [id]);

  const handleFiles = useCallback(
    (files: FileList) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner des images",
          variant: "destructive",
        });
        return;
      }

      const newUploads: UploadStatus[] = imageFiles.map((file) => ({
        file,
        status: "pending" as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Start uploading
      const startIndex = uploads.length;
      imageFiles.forEach((file, i) => {
        uploadFile(file, startIndex + i);
      });
    },
    [uploads.length, toast, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const completedUploads = uploads.filter((u) => u.status === "done").length;
  const totalUploads = uploads.length;

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <Link
        href={`/photographer/events/${id}`}
        className="text-orange hover:text-orange-dark transition-colors mb-4 inline-block"
      >
        &larr; Retour a l&apos;evenement
      </Link>

        <Card className="mb-8 bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Ajouter des photos</CardTitle>
            <CardDescription>
              {event.name} •{" "}
              {new Date(event.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${
                isDragging
                  ? "border-orange bg-orange-50"
                  : "border-orange/30 hover:border-orange/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                id="file-input"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileInput}
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer block"
              >
                <div className="text-muted-foreground mb-4">
                  <svg
                    className="mx-auto h-12 w-12"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Glissez-déposez vos photos ici
                </p>
                <p className="text-muted-foreground mb-4">ou cliquez pour sélectionner</p>
                <Button type="button" variant="outline" className="border-orange/30 text-orange hover:bg-orange-50">
                  Sélectionner des fichiers
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {uploads.length > 0 && (
          <Card className="bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-gray-900">Progression</CardTitle>
                <Badge variant="secondary">
                  {completedUploads}/{totalUploads} terminé
                  {completedUploads !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploads.map((upload, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-white/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {upload.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === "pending" && (
                        <Badge variant="secondary">En attente</Badge>
                      )}
                      {upload.status === "uploading" && (
                        <Badge variant="outline">Upload...</Badge>
                      )}
                      {upload.status === "processing" && (
                        <Badge variant="outline">Analyse OCR...</Badge>
                      )}
                      {upload.status === "done" && (
                        <>
                          <Badge variant="default" className="bg-orange">
                            Terminé
                          </Badge>
                          {upload.bibNumbers && upload.bibNumbers.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Dossards: {upload.bibNumbers.join(", ")}
                            </span>
                          )}
                        </>
                      )}
                      {upload.status === "error" && (
                        <Badge variant="destructive">
                          Erreur: {upload.error}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {completedUploads === totalUploads && totalUploads > 0 && (
                <div className="mt-6 text-center">
                  <p className="text-orange font-medium mb-4">
                    Tous les uploads sont terminés !
                  </p>
                  <Link href={`/photographer/events/${id}`}>
                    <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">Voir les photos</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
