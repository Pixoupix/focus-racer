"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";

interface OcrDebugResult {
  event: {
    id: string;
    name: string;
  };
  totalPhotos: number;
  photosWithBibs: number;
  photosWithoutBibs: number;
  photos: Array<{
    id: string;
    filename: string;
    ocrProvider: string;
    processedAt: string | null;
    bibsDetected: number;
    bibs: Array<{
      number: string;
      confidence: number;
      source: string;
    }>;
    qualityScore: number | null;
    isBlurry: boolean | null;
    hasWebVersion: boolean;
    hasThumbnail: boolean;
  }>;
}

export default function DebugOcrPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<OcrDebugResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/debug/ocr?eventId=${id}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        console.error("Failed to fetch debug data");
      }
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, status]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
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
              <h1 className="text-3xl font-bold text-slate-900">Debug OCR</h1>
              <p className="text-slate-600 mt-1">{data.event.name}</p>
            </div>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{data.totalPhotos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                Avec Dossards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {data.photosWithBibs}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {data.totalPhotos > 0
                  ? `${Math.round((data.photosWithBibs / data.totalPhotos) * 100)}%`
                  : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-600">
                Sans Dossards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {data.photosWithoutBibs}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {data.totalPhotos > 0
                  ? `${Math.round((data.photosWithoutBibs / data.totalPhotos) * 100)}%`
                  : "0%"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Photos List */}
        <Card>
          <CardHeader>
            <CardTitle>Détails des Photos</CardTitle>
            <CardDescription>
              Résultats de l&apos;OCR pour chaque photo uploadée
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900 truncate">
                        {photo.filename}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {photo.processedAt
                          ? `Traité le ${new Date(photo.processedAt).toLocaleString("fr-FR")}`
                          : "Non traité"}
                      </p>
                    </div>
                    <Badge
                      variant={photo.bibsDetected > 0 ? "default" : "secondary"}
                    >
                      {photo.bibsDetected > 0
                        ? `${photo.bibsDetected} dossard${photo.bibsDetected > 1 ? "s" : ""}`
                        : "Aucun dossard"}
                    </Badge>
                  </div>

                  {/* OCR Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-slate-600">OCR:</span>
                      <Badge variant="outline" className="ml-2">
                        {photo.ocrProvider === "ocr_aws"
                          ? "AWS"
                          : photo.ocrProvider === "ocr_tesseract"
                          ? "Tesseract"
                          : "N/A"}
                      </Badge>
                    </div>
                    {photo.qualityScore !== null && (
                      <div>
                        <span className="text-slate-600">Qualité:</span>
                        <span className="ml-2 font-medium">
                          {photo.qualityScore.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-600">Floue:</span>
                      <span className="ml-2 font-medium">
                        {photo.isBlurry === null ? "N/A" : photo.isBlurry ? "Oui" : "Non"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">Web/Thumb:</span>
                      <span className="ml-2 font-medium">
                        {photo.hasWebVersion ? "✓" : "✗"} / {photo.hasThumbnail ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>

                  {/* Bibs Detected */}
                  {photo.bibs.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-sm font-medium text-slate-700">
                        Dossards détectés:
                      </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {photo.bibs.map((bib, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-200"
                          >
                            <span className="font-mono font-bold text-blue-900">
                              {bib.number}
                            </span>
                            <span className="ml-2 text-xs text-blue-600">
                              {bib.confidence.toFixed(0)}%
                            </span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {bib.source}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {data.photos.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Aucune photo uploadée pour cet événement
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
