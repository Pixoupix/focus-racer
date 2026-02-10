"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Event } from "@/types";
import ProcessingScreen from "@/components/processing-screen";

type Phase = "select" | "confirm" | "processing";

interface SelectedFile {
  file: File;
  previewUrl: string;
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
  const [phase, setPhase] = useState<Phase>("select");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    };

    if (status === "authenticated") {
      fetchEvent();
    }
  }, [id, status, router, toast]);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        setIsTestMode(data.isTestMode);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  }, []);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
    };
  }, [selectedFiles]);

  const addFiles = useCallback(
    (files: FileList) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez selectionner des images",
          variant: "destructive",
        });
        return;
      }

      const newFiles: SelectedFile[] = imageFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    },
    [toast]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
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
        addFiles(e.target.files);
        // Reset input so same files can be re-selected
        e.target.value = "";
      }
    },
    [addFiles]
  );

  const goToConfirm = useCallback(() => {
    if (selectedFiles.length === 0) return;
    fetchCredits();
    setPhase("confirm");
  }, [selectedFiles.length, fetchCredits]);

  const goBackToSelect = useCallback(() => {
    setPhase("select");
  }, []);

  const startUpload = useCallback(async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("eventId", id);
      selectedFiles.forEach((sf) => {
        formData.append("files", sf.file);
      });

      const res = await fetch("/api/photos/batch-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "INSUFFICIENT_CREDITS") {
          toast({
            title: "Credits insuffisants",
            description: `Vous avez ${credits} credits, il en faut ${selectedFiles.length}.`,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }
        throw new Error(data.error || "Erreur lors de l'upload");
      }

      setSessionId(data.sessionId);
      setPhase("processing");
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
      setIsUploading(false);
    }
  }, [id, selectedFiles, credits, isUploading, toast]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) return null;

  // Phase: Processing
  if (phase === "processing" && sessionId) {
    return (
      <ProcessingScreen
        sessionId={sessionId}
        eventId={id}
        totalPhotos={selectedFiles.length}
      />
    );
  }

  // Phase: Confirm
  if (phase === "confirm") {
    const hasEnoughCredits = credits >= selectedFiles.length;

    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <button
          onClick={goBackToSelect}
          className="text-orange-500 hover:text-orange-600 transition-colors mb-4 inline-block text-sm"
        >
          &larr; Retour a la selection
        </button>

        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Confirmer l&apos;import</CardTitle>
            <CardDescription>
              {event.name} •{" "}
              {new Date(event.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 text-center">
                <p className="text-3xl font-bold text-gray-900">{selectedFiles.length}</p>
                <p className="text-sm text-gray-500 mt-1">photos</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 text-center">
                <p className="text-3xl font-bold text-orange-500">{selectedFiles.length}</p>
                <p className="text-sm text-gray-500 mt-1">credits necessaires</p>
              </div>
            </div>

            {/* Balance */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Votre solde</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-gray-900">
                    {credits.toLocaleString("fr-FR")} credits
                  </span>
                  {isTestMode && (
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                      Mode test
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
              Les credits des photos orphelines (sans dossard detecte) vous seront automatiquement restitues.
            </div>

            {/* Insufficient credits warning */}
            {!hasEnoughCredits && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <p className="font-medium mb-1">Credits insuffisants</p>
                <p>Il vous manque {selectedFiles.length - credits} credits.</p>
                <Link
                  href="/photographer/credits"
                  className="inline-block mt-2 text-red-800 underline font-medium"
                >
                  Recharger vos credits
                </Link>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={goBackToSelect}
                className="flex-1 border-gray-200 text-gray-700 rounded-xl"
              >
                Retour
              </Button>
              <Button
                onClick={startUpload}
                disabled={!hasEnoughCredits || isUploading}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Upload en cours...
                  </span>
                ) : (
                  `Valider l'import (${selectedFiles.length} credits)`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Phase: Select (default)
  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <Link
        href={`/photographer/events/${id}`}
        className="text-orange-500 hover:text-orange-600 transition-colors mb-4 inline-block"
      >
        &larr; Retour a l&apos;evenement
      </Link>

      <Card className="mb-6 bg-white border-0 shadow-sm rounded-2xl">
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
                ? "border-orange-500 bg-orange-50"
                : "border-orange-200 hover:border-orange-300"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file-input"
              className="hidden"
              multiple
              accept="image/*"
              onChange={handleFileInput}
            />
            <label htmlFor="file-input" className="cursor-pointer block">
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
                Glissez-deposez vos photos ici
              </p>
              <p className="text-muted-foreground mb-4">ou cliquez pour selectionner</p>
              <Button type="button" variant="outline" className="border-orange-200 text-orange-500 hover:bg-orange-50">
                Selectionner des fichiers
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Selected files grid */}
      {selectedFiles.length > 0 && (
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} selectionnee{selectedFiles.length > 1 ? "s" : ""}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-orange-200 text-orange-500 hover:bg-orange-50 rounded-lg"
                >
                  + Ajouter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    selectedFiles.forEach((sf) => URL.revokeObjectURL(sf.previewUrl));
                    setSelectedFiles([]);
                  }}
                  className="border-red-200 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  Tout retirer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-6">
              {selectedFiles.map((sf, index) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={sf.previewUrl}
                    alt={sf.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-1">
                    <p className="text-[10px] text-white truncate">{sf.file.name}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} = {selectedFiles.length} credit{selectedFiles.length > 1 ? "s" : ""}
              </p>
              <Button
                onClick={goToConfirm}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-8 shadow-lg shadow-orange-500/20"
              >
                Continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
