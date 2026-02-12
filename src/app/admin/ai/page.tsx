"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

interface AIStatus {
  config: {
    awsEnabled: boolean;
    s3Enabled: boolean;
    autoEditEnabled: boolean;
    faceIndexEnabled: boolean;
    labelDetectionEnabled: boolean;
    ocrConfidenceThreshold: number;
    qualityThreshold: number;
    region: string;
    s3Bucket: string;
    cloudfrontUrl: string;
  };
  stats: {
    totalPhotos: number;
    processedPhotos: number;
    blurryPhotos: number;
    faceIndexedPhotos: number;
    autoEditedPhotos: number;
    ocrProviders: Record<string, number>;
  };
}

interface ReprocessResult {
  total: number;
  processed: number;
  failed: number;
  errors?: string[];
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <Badge className={enabled ? "bg-emerald-100 text-emerald-700" : "bg-white/50 text-muted-foreground"}>
      {enabled ? "Actif" : "Inactif"}
    </Badge>
  );
}

export default function AdminAIPage() {
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<{
    success: boolean;
    message: string;
    details?: ReprocessResult;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-status")
      .then((res) => res.json())
      .then(setStatus)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleReprocess = async () => {
    if (!confirm("Retraiter toutes les photos sans version web/thumbnail ? Cette opération peut prendre plusieurs minutes.")) {
      return;
    }

    setIsReprocessing(true);
    setReprocessResult(null);

    try {
      const res = await fetch("/api/admin/reprocess-photos", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setReprocessResult({
          success: true,
          message: `✅ ${data.processed}/${data.total} photos retraitées avec succès`,
          details: data,
        });
        // Reload stats
        const statusRes = await fetch("/api/admin/ai-status");
        const newStatus = await statusRes.json();
        setStatus(newStatus);
      } else {
        setReprocessResult({
          success: false,
          message: `❌ Erreur: ${data.error || "Échec du retraitement"}`,
          details: data,
        });
      }
    } catch (error) {
      setReprocessResult({
        success: false,
        message: `❌ Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;
  if (!status) return <p className="text-red-600">Erreur de chargement</p>;

  const { config, stats } = status;
  const processingRate = stats.totalPhotos > 0
    ? Math.round((stats.processedPhotos / stats.totalPhotos) * 100)
    : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy mb-2">IA &amp; Traitement</h1>
          <p className="text-muted-foreground">Configuration et statistiques du pipeline IA</p>
        </div>
        <Button
          onClick={handleReprocess}
          disabled={isReprocessing}
          className="bg-emerald hover:bg-emerald-dark"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isReprocessing ? "animate-spin" : ""}`} />
          {isReprocessing ? "Retraitement en cours..." : "Retraiter les photos"}
        </Button>
      </div>

      {reprocessResult && (
        <Card className={`mb-6 ${reprocessResult.success ? "border-emerald bg-emerald-50" : "border-red-500 bg-red-50"}`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              {reprocessResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${reprocessResult.success ? "text-emerald" : "text-red-700"}`}>
                  {reprocessResult.message}
                </p>
                {reprocessResult.details && reprocessResult.details.failed > 0 && (
                  <details className="mt-2 text-sm text-muted-foreground">
                    <summary className="cursor-pointer hover:text-gray-900">
                      Voir les erreurs ({reprocessResult.details.failed})
                    </summary>
                    <ul className="mt-2 space-y-1 list-disc list-inside">
                      {reprocessResult.details.errors?.slice(0, 10).map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature status */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              AWS Rekognition
              <StatusBadge enabled={config.awsEnabled} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {config.awsEnabled
                ? `Région: ${config.region}`
                : "Configurez AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY pour activer"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              Stockage S3
              <StatusBadge enabled={config.s3Enabled} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {config.s3Enabled ? `Bucket: ${config.s3Bucket}` : "Stockage local uniquement"}
            </p>
            {config.cloudfrontUrl !== "(non configuré)" && (
              <p className="text-xs text-muted-foreground mt-1">CDN: {config.cloudfrontUrl}</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              Auto-editing
              <StatusBadge enabled={config.autoEditEnabled} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Normalisation auto, contraste, netteté (via Sharp)
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              Recherche par selfie
              <StatusBadge enabled={config.faceIndexEnabled} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {config.faceIndexEnabled
                ? "Indexation faciale active sur les uploads"
                : "Nécessite AWS Rekognition"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              Détection labels
              <StatusBadge enabled={config.labelDetectionEnabled} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {config.labelDetectionEnabled
                ? "Vêtements, accessoires, équipement"
                : "Nécessite AWS Rekognition"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex justify-between items-center">
              Filtrage qualité
              <StatusBadge enabled={true} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Seuil: {config.qualityThreshold}/100 (score minimum)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Thresholds */}
      <Card className="glass-card mb-8">
        <CardHeader>
          <CardTitle>Seuils de confiance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">OCR - Confiance minimum</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald h-3 rounded-full"
                    style={{ width: `${config.ocrConfidenceThreshold}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">{config.ocrConfidenceThreshold}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Les détections en dessous de ce seuil sont signalées pour triage manuel
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Qualité - Score minimum</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald h-3 rounded-full"
                    style={{ width: `${config.qualityThreshold}%` }}
                  />
                </div>
                <span className="text-sm font-mono w-12 text-right">{config.qualityThreshold}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Les photos sous ce seuil sont marquées comme floues
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Pour modifier les seuils, mettez à jour les variables d&apos;environnement AI_OCR_CONFIDENCE_THRESHOLD et AI_QUALITY_THRESHOLD
          </p>
        </CardContent>
      </Card>

      {/* Processing stats */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Statistiques de traitement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.totalPhotos}</p>
              <p className="text-sm text-muted-foreground">Photos total</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald">{stats.processedPhotos}</p>
              <p className="text-sm text-muted-foreground">Traitées ({processingRate}%)</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.blurryPhotos}</p>
              <p className="text-sm text-muted-foreground">Floues détectées</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.autoEditedPhotos}</p>
              <p className="text-sm text-muted-foreground">Auto-éditées</p>
            </div>
          </div>

          {stats.faceIndexedPhotos > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{stats.faceIndexedPhotos}</span> photos avec visages indexés
              </p>
            </div>
          )}

          {Object.keys(stats.ocrProviders).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Moteur OCR utilisé</p>
              <div className="flex gap-4">
                {Object.entries(stats.ocrProviders).map(([provider, count]) => (
                  <div key={provider} className="flex items-center gap-2">
                    <Badge variant="outline">{provider}</Badge>
                    <span className="text-sm text-muted-foreground">{count} photos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
