import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Hash, Zap, Clock, TrendingUp } from "lucide-react";

interface AnalyticsVisualProps {
  totalPhotos: number;
  photosWithBibs: number;
  orphanPhotos: number;
  totalAssociations: number;
  uniqueBibs: number;
  avgPhotosPerBib: number;
  avgProcessingTime: number;
  totalProcessingTime: number;
}

export function AnalyticsVisual({
  totalPhotos,
  photosWithBibs,
  orphanPhotos,
  totalAssociations,
  uniqueBibs,
  avgPhotosPerBib,
  avgProcessingTime,
  totalProcessingTime,
}: AnalyticsVisualProps) {
  const sortedPercentage = totalPhotos > 0 ? (photosWithBibs / totalPhotos) * 100 : 0;
  const bibsPerPhoto = photosWithBibs > 0 ? totalAssociations / photosWithBibs : 0;

  return (
    <Card className="bg-white shadow-sm border-slate-200/60 overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-50">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            Vue d&apos;ensemble
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Temps réel
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Main metrics row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          {/* Total Photos */}
          <div className="group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-slate-200 transition-colors">
                <ImageIcon className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Photos</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{totalPhotos}</p>
            <p className="text-xs text-slate-500">fichiers uploadés</p>
          </div>

          {/* Photos Sorted */}
          <div className="group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Triées</span>
            </div>
            <p className="text-3xl font-bold text-emerald-600 mb-1">{photosWithBibs}</p>
            <p className="text-xs text-slate-500">{sortedPercentage.toFixed(1)}% du total</p>
          </div>

          {/* Associations */}
          <div className="group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <Zap className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Associations</span>
            </div>
            <p className="text-3xl font-bold text-purple-600 mb-1">{totalAssociations}</p>
            <p className="text-xs text-slate-500">{bibsPerPhoto.toFixed(1)} dossards/photo</p>
          </div>

          {/* Unique Bibs */}
          <div className="group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Hash className="h-3.5 w-3.5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Dossards</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 mb-1">{uniqueBibs}</p>
            <p className="text-xs text-slate-500">{avgPhotosPerBib.toFixed(1)} photos/coureur</p>
          </div>

          {/* Processing Time */}
          <div className="group">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-md bg-amber-50 group-hover:bg-amber-100 transition-colors">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Traitement</span>
            </div>
            <p className="text-3xl font-bold text-amber-600 mb-1">
              {Math.floor(totalProcessingTime / 60)}<span className="text-xl">m</span>
            </p>
            <p className="text-xs text-slate-500">{avgProcessingTime}s par photo</p>
          </div>
        </div>

        {/* Visual breakdown */}
        <div className="space-y-6">
          {/* Photos distribution */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-700">Répartition des photos</h4>
              <span className="text-xs text-slate-500">{totalPhotos} total</span>
            </div>
            <div className="relative">
              <div className="flex h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${sortedPercentage}%` }}
                  title={`${photosWithBibs} photos triées`}
                />
                <div
                  className="bg-gradient-to-r from-amber-300 to-amber-400 transition-all duration-700 ease-out"
                  style={{ width: `${100 - sortedPercentage}%` }}
                  title={`${orphanPhotos} photos orphelines`}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">
                    {photosWithBibs} triées <span className="text-slate-400">({sortedPercentage.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-600">
                    {orphanPhotos} orphelines <span className="text-slate-400">({(100 - sortedPercentage).toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
            {/* Coverage quality */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-transparent border border-slate-100">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mb-2">
                {avgPhotosPerBib >= 3 ? (
                  <span className="text-lg">🏆</span>
                ) : avgPhotosPerBib >= 1.5 ? (
                  <span className="text-lg">✨</span>
                ) : (
                  <span className="text-lg">📊</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-1">Couverture</p>
              <p className="text-sm font-semibold text-slate-700">
                {avgPhotosPerBib >= 3 ? "Excellente" : avgPhotosPerBib >= 1.5 ? "Bonne" : "Standard"}
              </p>
            </div>

            {/* Success rate */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-transparent border border-slate-100">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mb-2">
                <span className="text-sm font-bold text-emerald-600">{sortedPercentage.toFixed(0)}%</span>
              </div>
              <p className="text-xs text-slate-500 mb-1">Taux de tri</p>
              <p className="text-sm font-semibold text-slate-700">
                {sortedPercentage >= 90 ? "Optimal" : sortedPercentage >= 70 ? "Bon" : "À améliorer"}
              </p>
            </div>

            {/* Efficiency */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-transparent border border-slate-100">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mb-2">
                <span className="text-sm font-bold text-purple-600">×{bibsPerPhoto.toFixed(1)}</span>
              </div>
              <p className="text-xs text-slate-500 mb-1">Efficacité</p>
              <p className="text-sm font-semibold text-slate-700">
                {bibsPerPhoto >= 2 ? "Groupe dense" : bibsPerPhoto >= 1.2 ? "Standard" : "Solo"}
              </p>
            </div>

            {/* Processing speed */}
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-slate-50 to-transparent border border-slate-100">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm mb-2">
                <span className="text-sm font-bold text-amber-600">{avgProcessingTime}s</span>
              </div>
              <p className="text-xs text-slate-500 mb-1">Vitesse</p>
              <p className="text-sm font-semibold text-slate-700">
                {avgProcessingTime <= 2 ? "Rapide" : avgProcessingTime <= 5 ? "Normal" : "Lent"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
