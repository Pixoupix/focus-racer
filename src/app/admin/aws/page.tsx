"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────

interface AwsUsageData {
  generatedAt: string;
  period: string;
  overview: {
    totalApiCalls: number;
    totalRekognitionCalls: number;
    totalS3Operations: number;
    estimatedCost: number;
    monthlyCost: number;
    totalPhotos: number;
    savings: {
      blurryFiltered: number;
      estimatedSaved: number;
    };
  };
  rekognition: {
    detectText: { count: number; cost: number };
    indexFaces: { count: number; cost: number };
    searchFaces: { count: number; cost: number };
    monthlyTrend: { month: string; ocr: number; faces: number; search: number; s3: number }[];
  };
  s3: {
    uploads: number;
    estimatedStorageGB: number;
    costPut: number;
    costStorage: number;
  };
  freeTier: {
    rekognition: { used: number; limit: number; pct: number };
    s3Storage: { usedGB: number; limitGB: number; pct: number };
    s3Put: { used: number; limit: number; pct: number };
  };
  costExplorer: {
    available: boolean;
    error?: string;
    months?: { start: string; end: string; service: string; amount: number; currency: string }[];
  };
  pricing: {
    detectText: number;
    indexFaces: number;
    searchFacesByImage: number;
    s3Put: number;
    s3StoragePerGB: number;
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className={`flex items-center gap-3 mb-6 pb-3 border-b ${color}`}>
      <div className={`p-2 rounded-lg ${color.replace("border-", "bg-").replace("-200", "-50")}`}>
        <div className={`w-5 h-5 rounded ${color.replace("border-", "bg-").replace("-200", "-500")} opacity-80`} />
      </div>
      <h2 className="text-xl font-bold text-navy">{label}</h2>
    </div>
  );
}

function KPICard({
  label,
  value,
  subtitle,
  borderColor,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  borderColor: string;
}) {
  return (
    <Card className={`glass-card border-l-4 ${borderColor} overflow-hidden`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-navy">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function FreeTierBar({
  label,
  used,
  limit,
  pct,
  unit,
}: {
  label: string;
  used: number | string;
  limit: number | string;
  pct: number;
  unit: string;
}) {
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";
  const textColor =
    pct >= 90 ? "text-red-600" : pct >= 70 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-navy">{label}</span>
        <span className={cn("text-sm font-bold", textColor)}>
          {typeof used === "number" ? used.toLocaleString("fr-FR") : used} / {typeof limit === "number" ? limit.toLocaleString("fr-FR") : limit} {unit}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden">
        <div
          className={cn(barColor, "h-4 rounded-full transition-all duration-700")}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-navy/70">
          {pct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function TrendTable({
  data,
}: {
  data: { month: string; ocr: number; faces: number; search: number; s3: number }[];
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune donnee</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Mois</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">DetectText</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">IndexFaces</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">SearchFaces</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">S3 PUT</th>
            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const monthLabel = new Date(row.month + "-01").toLocaleDateString("fr-FR", {
              month: "short",
              year: "2-digit",
            });
            const total = row.ocr + row.faces + row.search + row.s3;
            return (
              <tr key={row.month} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-2 font-medium">{monthLabel}</td>
                <td className="py-2 px-2 text-right">{row.ocr.toLocaleString("fr-FR")}</td>
                <td className="py-2 px-2 text-right">{row.faces.toLocaleString("fr-FR")}</td>
                <td className="py-2 px-2 text-right">{row.search.toLocaleString("fr-FR")}</td>
                <td className="py-2 px-2 text-right">{row.s3.toLocaleString("fr-FR")}</td>
                <td className="py-2 px-2 text-right font-bold">{total.toLocaleString("fr-FR")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function fmtUsd2(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function AdminAwsPage() {
  const [data, setData] = useState<AwsUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/aws-usage");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("Failed to fetch AWS usage:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement des donnees AWS...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Erreur de chargement des donnees AWS</p>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="animate-fade-in">
      {/* ─── Top Bar ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">AWS & Couts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi consommation Rekognition, S3 et facturation AWS
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {new Date(data.generatedAt).toLocaleString("fr-FR")}
          </span>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <svg
              className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Rafraichir
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        {/* ────── S1: VUE D'ENSEMBLE ────── */}
        <section>
          <SectionHeader label="Vue d'ensemble" color="border-orange-200" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="Total appels API"
              value={fmt(data.overview.totalApiCalls)}
              borderColor="border-l-orange-500"
              subtitle={`${fmt(data.overview.totalRekognitionCalls)} Rekognition + ${fmt(data.overview.totalS3Operations)} S3`}
            />
            <KPICard
              label="Cout estime total"
              value={fmtUsd2(data.overview.estimatedCost)}
              borderColor="border-l-orange-400"
              subtitle="Depuis le debut"
            />
            <KPICard
              label="Cout mois en cours"
              value={fmtUsd2(data.overview.monthlyCost)}
              borderColor="border-l-amber-500"
              subtitle={currentMonth}
            />
            <KPICard
              label="Photos traitees"
              value={fmt(data.overview.totalPhotos)}
              borderColor="border-l-blue-400"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <KPICard
              label="Photos floues filtrees"
              value={fmt(data.overview.savings.blurryFiltered)}
              borderColor="border-l-emerald-500"
              subtitle={`Economie estimee : ${fmtUsd2(data.overview.savings.estimatedSaved)}`}
            />
            <KPICard
              label="Free Tier Rekognition"
              value={`${fmt(data.freeTier.rekognition.used)} / ${fmt(data.freeTier.rekognition.limit)}`}
              borderColor="border-l-indigo-400"
              subtitle={`${data.freeTier.rekognition.pct.toFixed(1)}% utilise ce mois`}
            />
          </div>
        </section>

        {/* ────── S2: REKOGNITION ────── */}
        <section>
          <SectionHeader label="Amazon Rekognition" color="border-blue-200" />
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-card border-l-4 border-l-blue-500 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  DetectText (OCR)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-navy">{fmt(data.rekognition.detectText.count)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cout : {fmtUsd(data.rekognition.detectText.cost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtUsd(data.pricing.detectText)}/image
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-l-4 border-l-purple-500 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  IndexFaces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-navy">{fmt(data.rekognition.indexFaces.count)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cout : {fmtUsd(data.rekognition.indexFaces.cost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtUsd(data.pricing.indexFaces)}/visage
                </p>
              </CardContent>
            </Card>
            <Card className="glass-card border-l-4 border-l-teal-500 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">
                  SearchFacesByImage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-navy">{fmt(data.rekognition.searchFaces.count)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cout : {fmtUsd(data.rekognition.searchFaces.cost)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtUsd(data.pricing.searchFacesByImage)}/recherche
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tendance mensuelle (12 mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendTable data={data.rekognition.monthlyTrend} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Appels non suivis en DB</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Non suivi</Badge>
                  <span>SearchFacesByImage — recherches selfie publiques</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Non suivi</Badge>
                  <span>SearchFacesByFaceId — auto-clustering</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ────── S3: AMAZON S3 ────── */}
        <section>
          <SectionHeader label="Amazon S3" color="border-emerald-200" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard
              label="Uploads (PUT)"
              value={fmt(data.s3.uploads)}
              borderColor="border-l-emerald-500"
              subtitle={`Cout : ${fmtUsd(data.s3.costPut)}`}
            />
            <KPICard
              label="Stockage estime"
              value={`${data.s3.estimatedStorageGB.toFixed(2)} Go`}
              borderColor="border-l-emerald-400"
              subtitle={`Cout : ${fmtUsd(data.s3.costStorage)}/mois`}
            />
            <KPICard
              label="Cout S3 total"
              value={fmtUsd2(data.s3.costPut + data.s3.costStorage)}
              borderColor="border-l-emerald-300"
              subtitle="PUT + stockage"
            />
            <KPICard
              label="Moy. par photo"
              value="~2.5 Mo"
              borderColor="border-l-slate-400"
              subtitle="HD + web + thumbnail"
            />
          </div>

          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Appels non suivis en DB</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="text-xs">Non suivi</Badge>
                <span>S3 GET — telechargements (signed URLs)</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ────── S4: FREE TIER ────── */}
        <section>
          <SectionHeader label={`Free Tier — ${currentMonth}`} color="border-indigo-200" />
          <Card className="glass-card">
            <CardContent className="pt-6 space-y-6">
              <FreeTierBar
                label="Rekognition (images/mois)"
                used={data.freeTier.rekognition.used}
                limit={data.freeTier.rekognition.limit}
                pct={data.freeTier.rekognition.pct}
                unit="appels"
              />
              <FreeTierBar
                label="S3 Stockage"
                used={`${data.freeTier.s3Storage.usedGB} Go`}
                limit={`${data.freeTier.s3Storage.limitGB} Go`}
                pct={data.freeTier.s3Storage.pct}
                unit=""
              />
              <FreeTierBar
                label="S3 PUT (requetes/mois)"
                used={data.freeTier.s3Put.used}
                limit={data.freeTier.s3Put.limit}
                pct={data.freeTier.s3Put.pct}
                unit="req"
              />
            </CardContent>
          </Card>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Note :</strong> Le Free Tier AWS est valable 12 mois apres la creation du compte.
              Au-dela : ~$0.0015/image Rekognition + ~$0.023/Go/mois S3.
            </p>
          </div>
        </section>

        {/* ────── S5: COST EXPLORER ────── */}
        <section>
          <SectionHeader label="AWS Cost Explorer" color="border-rose-200" />
          {data.costExplorer.available ? (
            <>
              {data.costExplorer.months && data.costExplorer.months.length > 0 ? (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Facturation reelle AWS (3 derniers mois)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Periode</th>
                            <th className="text-left py-2 px-2 text-muted-foreground font-medium">Service</th>
                            <th className="text-right py-2 px-2 text-muted-foreground font-medium">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.costExplorer.months.map((m, i) => (
                            <tr key={`${m.start}-${m.service}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                              <td className="py-2 px-2">
                                {new Date(m.start).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                              </td>
                              <td className="py-2 px-2">
                                <Badge variant="outline" className="text-xs">
                                  {m.service.replace("Amazon ", "")}
                                </Badge>
                              </td>
                              <td className="py-2 px-2 text-right font-bold">
                                {fmtUsd2(m.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                      Aucune facturation trouvee pour les 3 derniers mois (probablement dans le Free Tier).
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="glass-card border-l-4 border-l-amber-400">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-amber-700">
                    Cost Explorer non disponible
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.costExplorer.error || "Permission manquante"}
                  </p>
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border">
                    <p className="text-sm font-medium text-navy mb-2">
                      Pour activer Cost Explorer :
                    </p>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Ouvrir la console AWS IAM</li>
                      <li>Selectionner le user <code className="bg-slate-200 px-1 rounded">focusracer-rekognition</code></li>
                      <li>Ajouter la permission <code className="bg-slate-200 px-1 rounded">ce:GetCostAndUsage</code></li>
                      <li>
                        Ou attacher la policy <code className="bg-slate-200 px-1 rounded">AWSBillingReadOnlyAccess</code>
                      </li>
                      <li>Activer Cost Explorer dans le compte AWS (Billing &gt; Cost Explorer)</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* ────── PRICING REFERENCE ────── */}
        <section>
          <SectionHeader label="Reference tarifs AWS" color="border-slate-200" />
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">API</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cout/unite</th>
                      <th className="text-right py-2 px-2 text-muted-foreground font-medium">Free Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2">DetectText</td>
                      <td className="py-2 px-2 text-right">{fmtUsd(data.pricing.detectText)}/image</td>
                      <td className="py-2 px-2 text-right">1 000/mois</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2">IndexFaces</td>
                      <td className="py-2 px-2 text-right">{fmtUsd(data.pricing.indexFaces)}/visage</td>
                      <td className="py-2 px-2 text-right">inclus</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2">SearchFacesByImage</td>
                      <td className="py-2 px-2 text-right">{fmtUsd(data.pricing.searchFacesByImage)}/recherche</td>
                      <td className="py-2 px-2 text-right">inclus</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2">S3 PUT</td>
                      <td className="py-2 px-2 text-right">$0.005/1000 req</td>
                      <td className="py-2 px-2 text-right">2 000/mois</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-2">S3 Storage</td>
                      <td className="py-2 px-2 text-right">{fmtUsd(data.pricing.s3StoragePerGB)}/Go/mois</td>
                      <td className="py-2 px-2 text-right">5 Go</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
