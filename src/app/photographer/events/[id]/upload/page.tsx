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
  const [ocrProvider, setOcrProvider] = useState<"aws" | "tesseract">("tesseract");
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
      formData.append("ocrProvider", ocrProvider);
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
  }, [id, selectedFiles, credits, isUploading, ocrProvider, toast]);

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
    const creditsPerPhoto = ocrProvider === "aws" ? 3 : 1;
    const totalCreditsNeeded = selectedFiles.length * creditsPerPhoto;
    const hasEnoughCredits = credits >= totalCreditsNeeded;

    // Time estimation
    const formatTime = (s: number) => {
      if (s < 60) return `~${s} sec`;
      const min = Math.floor(s / 60);
      const sec = s % 60;
      if (min < 60) return sec > 0 ? `~${min} min ${sec} sec` : `~${min} min`;
      const h = Math.floor(min / 60);
      const rm = min % 60;
      return `~${h}h${rm > 0 ? ` ${rm} min` : ""}`;
    };

    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <button
          onClick={goBackToSelect}
          className="text-emerald-500 hover:text-emerald-600 transition-colors mb-4 inline-block text-sm"
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
            {/* Plan choice */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Choisissez votre formule</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Free */}
                <button
                  type="button"
                  onClick={() => setOcrProvider("tesseract")}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    ocrProvider === "tesseract"
                      ? "border-emerald-500 bg-emerald-50/50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {ocrProvider === "tesseract" && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">Gratuit</span>
                    <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px]">1 credit/photo</Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Detection basique des dossards. Photos compressees pour un traitement leger.
                  </p>
                  <ul className="space-y-1.5 text-[11px] mb-3">
                    <li className="flex items-center gap-1.5 text-gray-500">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Detection des dossards (OCR)
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-500">
                      <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Compression des photos
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-300">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      <span className="line-through">Retouche auto (exposition, contraste)</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-300">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      <span className="line-through">Watermark professionnel</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-300">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      <span className="line-through">Reconnaissance faciale</span>
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-300">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      <span className="line-through">Detection vetements</span>
                    </li>
                  </ul>
                  <div className="flex items-center gap-3 text-[11px] pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1 text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {formatTime(Math.round(selectedFiles.length * 3.5))}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ~70-85%
                    </span>
                  </div>
                </button>

                {/* Premium */}
                <button
                  type="button"
                  onClick={() => setOcrProvider("aws")}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    ocrProvider === "aws"
                      ? "border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-200"
                      : "border-gray-200 hover:border-amber-300 bg-white"
                  }`}
                >
                  <div className="absolute -top-2.5 left-4">
                    <Badge className="bg-amber-500 text-white border-0 text-[10px] shadow-sm">Recommande</Badge>
                  </div>
                  {ocrProvider === "aws" && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <span className="text-lg font-bold text-gray-900">Premium</span>
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]">3 credits/photo</Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    Traitement IA complet. Retouche, watermark, tri par dossard, visage et vetements.
                  </p>
                  <ul className="space-y-1.5 text-[11px] mb-3">
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Detection des dossards (OCR haute precision)
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Analyse qualite + filtrage photos floues
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Retouche auto (exposition, contraste, nettete)
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Watermark professionnel
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Reconnaissance faciale (recherche par selfie)
                    </li>
                    <li className="flex items-center gap-1.5 text-gray-600 font-medium">
                      <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      Detection vetements et accessoires
                    </li>
                  </ul>
                  <div className="flex items-center gap-3 text-[11px] pt-2 border-t border-amber-100">
                    <span className="flex items-center gap-1 text-amber-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                      {formatTime(Math.round(selectedFiles.length * 0.3))}
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      ~95-99%
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 text-center">
                <p className="text-3xl font-bold text-gray-900">{selectedFiles.length}</p>
                <p className="text-sm text-gray-500 mt-1">photo{selectedFiles.length > 1 ? "s" : ""}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 text-center">
                <p className="text-3xl font-bold text-emerald-500">{totalCreditsNeeded}</p>
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
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 text-sm text-teal-700">
              Les credits des photos orphelines (sans dossard detecte) vous seront automatiquement restitues.
            </div>

            {/* Insufficient credits warning */}
            {!hasEnoughCredits && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <p className="font-medium mb-1">Credits insuffisants</p>
                <p>Il vous manque {totalCreditsNeeded - credits} credits.</p>
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
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50"
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
                  `Valider l'import (${totalCreditsNeeded} credits)`
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
        className="text-emerald-500 hover:text-emerald-600 transition-colors mb-4 inline-block"
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
                ? "border-emerald-500 bg-emerald-50"
                : "border-emerald-200 hover:border-emerald-300"
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
              <Button type="button" variant="outline" className="border-emerald-200 text-emerald-500 hover:bg-emerald-50">
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
                  className="border-emerald-200 text-emerald-500 hover:bg-emerald-50 rounded-lg"
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
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-8 shadow-lg shadow-emerald-500/20"
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
