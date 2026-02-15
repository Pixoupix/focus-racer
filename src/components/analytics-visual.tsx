import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Hash, TrendingUp } from "lucide-react";

interface AnalyticsVisualProps {
  totalPhotos: number;
  photosWithBibs: number;
  orphanPhotos: number;
  totalAssociations: number;
  uniqueBibs: number;
  avgPhotosPerBib: number;
}

export function AnalyticsVisual({
  totalPhotos,
  photosWithBibs,
  orphanPhotos,
  totalAssociations,
  uniqueBibs,
  avgPhotosPerBib,
}: AnalyticsVisualProps) {
  const sortedPercentage = totalPhotos > 0 ? (photosWithBibs / totalPhotos) * 100 : 0;
  const orphanPercentage = totalPhotos > 0 ? (orphanPhotos / totalPhotos) * 100 : 0;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Vue d&apos;ensemble des performances
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1: Photos Breakdown */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-3">
                <ImageIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{totalPhotos}</h3>
              <p className="text-sm text-muted-foreground">Photos totales</p>
            </div>

            {/* Progress bars */}
            <div className="space-y-3">
              {/* Sorted photos */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-700 font-medium">Photos triées</span>
                  <span className="text-emerald-700 font-bold">{photosWithBibs}</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                    style={{ width: `${sortedPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-right text-muted-foreground mt-0.5">
                  {sortedPercentage.toFixed(1)}%
                </p>
              </div>

              {/* Orphan photos */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-700 font-medium">Photos orphelines</span>
                  <span className="text-amber-700 font-bold">{orphanPhotos}</span>
                </div>
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-500"
                    style={{ width: `${orphanPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-right text-muted-foreground mt-0.5">
                  {orphanPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Column 2: Associations */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-3">
                <svg
                  className="h-10 w-10 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-4xl font-bold text-purple-600">{totalAssociations}</h3>
              <p className="text-sm text-muted-foreground">Associations photo-dossard</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="text-center">
                <p className="text-xs text-purple-700 mb-2">Facteur de multiplication</p>
                <p className="text-2xl font-bold text-purple-600">
                  ×{photosWithBibs > 0 ? (totalAssociations / photosWithBibs).toFixed(2) : "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  associations par photo triée
                </p>
              </div>
            </div>
          </div>

          {/* Column 3: Bibs Performance */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-3">
                <Hash className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-4xl font-bold text-slate-900">{uniqueBibs}</h3>
              <p className="text-sm text-muted-foreground">Dossards uniques</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-center">
                <p className="text-xs text-blue-700 mb-2">Couverture moyenne</p>
                <p className="text-2xl font-bold text-blue-600">
                  {avgPhotosPerBib.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  photos par coureur
                </p>
              </div>
            </div>

            {/* Coverage indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {avgPhotosPerBib >= 3 ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-700">
                        Excellente couverture
                      </span>
                    </>
                  ) : avgPhotosPerBib >= 1.5 ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-xs font-medium text-blue-700">
                        Bonne couverture
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-medium text-amber-700">
                        Couverture limitée
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom summary row */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{sortedPercentage.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Taux de tri</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {photosWithBibs > 0 ? (totalAssociations / photosWithBibs).toFixed(1) : "0"}
              </p>
              <p className="text-xs text-muted-foreground">Dossards/photo en moyenne</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {uniqueBibs > 0 ? (totalAssociations / uniqueBibs).toFixed(1) : "0"}
              </p>
              <p className="text-xs text-muted-foreground">Photos/coureur</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">
                {totalPhotos > 0 ? ((totalAssociations / totalPhotos) * 100).toFixed(0) : "0"}%
              </p>
              <p className="text-xs text-muted-foreground">Taux d&apos;utilité global</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
