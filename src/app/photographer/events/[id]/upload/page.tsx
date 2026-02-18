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
import { UploadTimeline } from "@/components/upload-timeline";

function generateSessionId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

type Phase = "select" | "confirm" | "uploading" | "processing";

interface SelectedFile {
  file: File;
  previewUrl: string;
}

interface ExcludedFile {
  name: string;
  reason: string;
}

// Formats d'image acceptés (compressés uniquement)
const ACCEPTED_FORMATS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

function isValidImageFormat(file: File): { valid: boolean; reason?: string } {
  // Check MIME type
  if (file.type && ACCEPTED_FORMATS.includes(file.type.toLowerCase())) {
    return { valid: true };
  }

  // Fallback: check extension
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (ACCEPTED_EXTENSIONS.includes(ext)) {
    return { valid: true };
  }

  // Detect RAW formats by extension
  const rawExtensions = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.orf', '.raf', '.rw2', '.raw'];
  if (rawExtensions.includes(ext)) {
    return { valid: false, reason: 'Format RAW non supporté (trop lourd, utilisez un JPEG)' };
  }

  return { valid: false, reason: 'Format non supporté (JPEG, PNG, WebP uniquement)' };
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
  const [excludedFiles, setExcludedFiles] = useState<ExcludedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [credits, setCredits] = useState<number>(0);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [removeDuplicates, setRemoveDuplicates] = useState(true); // ON by default
  const [removeBlurry, setRemoveBlurry] = useState(true); // ON by default
  const [autoRetouch, setAutoRetouch] = useState(false);
  const [smartCrop, setSmartCrop] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState<"compressing" | "sending">("compressing");
  const [compressProgress, setCompressProgress] = useState(0);
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
      const allFiles = Array.from(files);
      const validFiles: SelectedFile[] = [];
      const invalidFiles: ExcludedFile[] = [];

      for (const file of allFiles) {
        const validation = isValidImageFormat(file);
        if (validation.valid) {
          validFiles.push({
            file,
            previewUrl: URL.createObjectURL(file),
          });
        } else {
          invalidFiles.push({
            name: file.name,
            reason: validation.reason || 'Format invalide',
          });
        }
      }

      if (validFiles.length === 0 && invalidFiles.length === 0) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner des images",
          variant: "destructive",
        });
        return;
      }

      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setExcludedFiles((prev) => [...prev, ...invalidFiles]);

      if (invalidFiles.length > 0) {
        toast({
          title: `${invalidFiles.length} fichier${invalidFiles.length > 1 ? 's' : ''} exclu${invalidFiles.length > 1 ? 's' : ''}`,
          description: `${validFiles.length} fichier${validFiles.length > 1 ? 's' : ''} valide${validFiles.length > 1 ? 's' : ''} ajouté${validFiles.length > 1 ? 's' : ''}`,
          variant: "default",
        });
      }
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
    setUploadProgress(0);
    setCompressProgress(0);
    setUploadStep("compressing");
    setPhase("uploading");

    // Generate session ID upfront so we can switch to processing immediately after upload
    const uploadSessionId = generateSessionId();

    // --- Step 1: Compress images client-side (parallel pool) ---
    const MAX_DIM = 2400; // Server resizes to 1600px anyway, HD original kept on S3
    const JPEG_QUALITY = 0.85;
    const PARALLEL_POOL = 4; // 4 concurrent Canvas compressions

    const compressImage = (file: File): Promise<File> =>
      new Promise((resolve) => {
        if (!file.type.startsWith("image/") || file.size < 500_000) {
          resolve(file);
          return;
        }
        const img = new window.Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const { naturalWidth: w, naturalHeight: h } = img;
          if (w <= MAX_DIM && h <= MAX_DIM) {
            resolve(file);
            return;
          }
          const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
          const nw = Math.round(w * ratio);
          const nh = Math.round(h * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = nw;
          canvas.height = nh;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(file); return; }
          ctx.drawImage(img, 0, 0, nw, nh);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
              canvas.width = 0;
              canvas.height = 0;
            },
            "image/jpeg",
            JPEG_QUALITY
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      });

    let compressed: File[];
    try {
      const results: File[] = new Array(selectedFiles.length);
      let completedCount = 0;

      // Process in parallel pool of PARALLEL_POOL
      for (let start = 0; start < selectedFiles.length; start += PARALLEL_POOL) {
        const batch = selectedFiles.slice(start, start + PARALLEL_POOL);
        const batchResults = await Promise.all(
          batch.map((sf) => compressImage(sf.file))
        );
        batchResults.forEach((file, i) => {
          results[start + i] = file;
        });
        completedCount += batch.length;
        setCompressProgress(Math.round((completedCount / selectedFiles.length) * 100));
      }
      compressed = results;
    } catch {
      compressed = selectedFiles.map((sf) => sf.file);
    }

    // --- Step 2: Chunked upload to avoid Cloudflare 100s timeout ---
    setUploadStep("sending");
    setUploadProgress(0);

    const CHUNK_SIZE = 25; // Upload 25 photos per chunk (optimized for dedicated server)
    const chunks = [];
    for (let i = 0; i < compressed.length; i += CHUNK_SIZE) {
      chunks.push(compressed.slice(i, i + CHUNK_SIZE));
    }

    try {
      let totalUploaded = 0;

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];
        const isFirstChunk = chunkIndex === 0;
        const isLastChunk = chunkIndex === chunks.length - 1;

        await new Promise<void>((resolve, reject) => {
          const formData = new FormData();
          formData.append("eventId", id);
          formData.append("sessionId", uploadSessionId);
          formData.append("processingMode", "premium");
          if (removeDuplicates) formData.append("removeDuplicates", "true");
          if (removeBlurry) formData.append("removeBlurry", "true");
          if (autoRetouch) formData.append("autoRetouch", "true");
          if (smartCrop) formData.append("smartCrop", "true");
          chunk.forEach((file) => {
            formData.append("files", file);
          });

          const xhr = new XMLHttpRequest();
          xhr.timeout = 300000; // 5 minutes per chunk

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const chunkProgress = (e.loaded / e.total) * (chunk.length / compressed.length);
              const totalProgress = ((totalUploaded + chunkProgress * chunk.length) / compressed.length) * 100;
              setUploadProgress(Math.round(totalProgress));
            }
          };

          xhr.onload = () => {
            try {
              if (!xhr.responseText || xhr.responseText.trim() === "") {
                throw new Error("Le serveur n'a pas retourne de reponse.");
              }

              let data;
              try {
                data = JSON.parse(xhr.responseText);
              } catch {
                console.error("Failed to parse response:", xhr.responseText);
                throw new Error("Reponse invalide du serveur.");
              }

              if (xhr.status >= 400) {
                if (data.code === "INSUFFICIENT_CREDITS") {
                  reject(new Error("INSUFFICIENT_CREDITS"));
                  return;
                }
                throw new Error(data.error || data.details || "Erreur lors de l'upload");
              }

              totalUploaded += chunk.length;

              // Switch to processing after last chunk uploaded
              if (isLastChunk) {
                setSessionId(uploadSessionId);
                setPhase("processing");
              }

              resolve();
            } catch (error) {
              reject(error);
            }
          };

          xhr.onerror = () => reject(new Error("Erreur reseau"));
          xhr.ontimeout = () => reject(new Error("Timeout"));

          xhr.open("POST", "/api/photos/batch-upload");
          xhr.send(formData);
        });
      }
    } catch (error) {
      console.error("Upload error:", error);

      if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
        toast({
          title: "Credits insuffisants",
          description: `Vous avez ${credits} credits, il en faut ${selectedFiles.length}.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: error instanceof Error ? error.message : "Erreur inconnue",
          variant: "destructive",
        });
      }

      setIsUploading(false);
      setPhase("confirm");
    }
  }, [id, selectedFiles, credits, isUploading, removeDuplicates, removeBlurry, autoRetouch, smartCrop, toast]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!event) return null;

  // Phase: Uploading (compress + network transfer)
  if (phase === "uploading") {
    const isCompressing = uploadStep === "compressing";
    const currentPercent = isCompressing ? compressProgress : uploadProgress;

    const timelineSteps = [
      {
        id: "compress",
        label: "Compression",
        status: isCompressing ? "active" : uploadStep === "sending" ? "completed" : "pending",
        progress: isCompressing ? compressProgress : uploadStep === "sending" ? 100 : 0,
      },
      {
        id: "upload",
        label: "Envoi serveur",
        status: uploadStep === "sending" && uploadProgress < 100 ? "active" : uploadProgress === 100 ? "completed" : "pending",
        progress: uploadStep === "sending" ? uploadProgress : 0,
      },
      {
        id: "processing",
        label: "Traitement",
        status: "pending",
      },
      {
        id: "complete",
        label: "Terminé",
        status: "pending",
      },
    ] as const;

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white p-8">
        {/* Timeline */}
        <UploadTimeline steps={timelineSteps} />

        <div className="w-full max-w-md px-8 text-center mt-8">
          {/* Animated icon */}
          <div className="mb-6">
            {isCompressing ? (
              <svg
                className="mx-auto h-16 w-16 text-amber-400 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
              </svg>
            ) : (
              <svg
                className="mx-auto h-16 w-16 text-emerald-400 upload-arrow-bounce"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
          </div>

          <h2 className="text-xl font-bold mb-2">
            {isCompressing
              ? `Compression de ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""}...`
              : `Envoi au serveur...`}
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            {isCompressing
              ? "Optimisation pour un envoi plus rapide"
              : "Ne fermez pas cette page pendant l'envoi"}
          </p>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-3 mb-5 text-xs">
            <span className={isCompressing ? "text-amber-400 font-bold" : "text-emerald-400"}>
              {isCompressing ? "⏳" : "✓"} Compression
            </span>
            <span className="text-slate-600">—</span>
            <span className={!isCompressing ? "text-emerald-400 font-bold" : "text-slate-500"}>
              {!isCompressing ? "⏳" : "○"} Envoi
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-4 bg-slate-700 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isCompressing
                  ? "bg-gradient-to-r from-amber-500 to-amber-400"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-400"
              }`}
              style={{ width: `${currentPercent}%` }}
            />
          </div>
          <p className={`font-bold text-lg ${isCompressing ? "text-amber-400" : "text-emerald-400"}`}>
            {currentPercent}%
          </p>
        </div>

        <style jsx>{`
          .upload-arrow-bounce {
            animation: arrowBounce 1s ease-in-out infinite;
          }
          @keyframes arrowBounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
          }
        `}</style>
      </div>
    );
  }

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
    const creditsPerPhoto = 1;
    const totalCreditsNeeded = selectedFiles.length * creditsPerPhoto;
    const hasEnoughCredits = credits >= totalCreditsNeeded;

    return (
      <div className="p-8 max-w-2xl mx-auto animate-fade-in">
        <button
          onClick={goBackToSelect}
          className="text-emerald-500 hover:text-emerald-600 transition-colors mb-4 inline-block text-sm"
        >
          &larr; Retour à la sélection
        </button>

        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-gray-900">{selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""}</CardTitle>
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
            {/* Action + balance (top) */}
            <div className="flex items-center gap-3">
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
                  `Valider l'import (${totalCreditsNeeded} crédit${totalCreditsNeeded > 1 ? "s" : ""})`
                )}
              </Button>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900">{credits.toLocaleString("fr-FR")}</p>
                <p className="text-[11px] text-gray-500">crédits{isTestMode ? " (test)" : ""}</p>
              </div>
            </div>

            {/* Insufficient credits warning */}
            {!hasEnoughCredits && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <p className="font-medium mb-1">Crédits insuffisants</p>
                <p>Il vous manque {totalCreditsNeeded - credits} crédits.</p>
                <Link
                  href="/photographer/credits"
                  className="inline-block mt-2 text-red-800 underline font-medium"
                >
                  Recharger vos crédits
                </Link>
              </div>
            )}

            {/* Plan summary */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Traitement IA complet</p>
                  <p className="text-xs text-gray-500">OCR dossards + reconnaissance faciale + watermark + analyse qualité</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-auto shrink-0">1 crédit/photo</Badge>
              </div>
            </div>

            {/* Processing options (free) */}
            <div>
              <p className="text-sm font-medium text-gray-900 mb-3">Options de traitement <Badge className="bg-green-100 text-green-700 border-0 text-[10px] ml-1">Gratuit</Badge></p>
              <div className="space-y-3">
                {/* Duplicate Removal — PROMINENT, checked by default */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                  removeDuplicates
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-emerald-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Suppression des doublons</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px]">Recommandé</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Détecte et supprime automatiquement les photos en double (rafales identiques). Votre galerie est plus propre, vos coureurs trouvent leurs photos plus vite.
                    </p>
                  </div>
                </label>

                {/* Blur Filter — checked by default */}
                <label className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${
                  removeBlurry
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-emerald-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={removeBlurry}
                    onChange={(e) => setRemoveBlurry(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Filtre photos floues</span>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px]">Recommandé</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Élimine automatiquement les photos trop floues ou mal exposées avant traitement. Galerie de meilleure qualité pour vos clients.
                    </p>
                  </div>
                </label>

                {/* Auto Retouch */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRetouch}
                    onChange={(e) => setAutoRetouch(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Retouche auto</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Optimise automatiquement la luminosité, le contraste et la saturation. Idéal pour les photos en extérieur.
                    </p>
                  </div>
                </label>

                {/* Smart Crop */}
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-300 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smartCrop}
                    onChange={(e) => setSmartCrop(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Smart Crop</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Génère un recadrage individuel par coureur détecté. Chaque visage reçoit un crop centré avec le buste et le dossard visible.
                    </p>
                  </div>
                </label>
              </div>
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
              <p className="text-muted-foreground mb-4">ou cliquez pour sélectionner</p>
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
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} sélectionnée{selectedFiles.length > 1 ? "s" : ""}
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
                {selectedFiles.length} photo{selectedFiles.length > 1 ? "s" : ""} = {selectedFiles.length} crédit{selectedFiles.length > 1 ? "s" : ""}
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

      {/* Excluded files warning */}
      {excludedFiles.length > 0 && (
        <Card className="bg-amber-50 border-amber-200 rounded-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <CardTitle className="text-amber-900">
                {excludedFiles.length} fichier{excludedFiles.length > 1 ? "s" : ""} exclu{excludedFiles.length > 1 ? "s" : ""}
              </CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              Ces fichiers ne peuvent pas être traités
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {excludedFiles.map((file, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                  <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-amber-700">{file.reason}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExcludedFiles([])}
              className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Effacer la liste
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
