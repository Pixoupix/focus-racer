"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsVisual } from "@/components/analytics-visual";

interface Analytics {
  summary: {
    totalPhotos: number;
    photosWithBibs: number;
    orphanPhotos: number;
    totalAssociations: number;
    uniqueBibs: number;
    avgPhotosPerBib: number;
    avgProcessingTime: number;
    totalProcessingTime: number;
  };
  topBibs: Array<{ bib: string; count: number }>;
}

export function EventAnalytics({ eventId }: { eventId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/analytics`);
        if (res.ok) {
          setAnalytics(await res.json());
        } else {
          console.error("Failed to fetch analytics");
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [eventId]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Chargement des analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  const { summary, topBibs } = analytics;

  return (
    <div className="space-y-8">
      {/* Visual Analytics Summary - Vue d'ensemble unique */}
      <AnalyticsVisual
        totalPhotos={summary.totalPhotos}
        photosWithBibs={summary.photosWithBibs}
        orphanPhotos={summary.orphanPhotos}
        totalAssociations={summary.totalAssociations}
        uniqueBibs={summary.uniqueBibs}
        avgPhotosPerBib={summary.avgPhotosPerBib}
        avgProcessingTime={summary.avgProcessingTime}
        totalProcessingTime={summary.totalProcessingTime}
      />

      {/* Top Dossards */}
      {topBibs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 20 Dossards</CardTitle>
            <CardDescription>Les coureurs avec le plus de photos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {topBibs.map((item) => (
                <div
                  key={item.bib}
                  className="border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="text-2xl font-bold text-center text-blue-600">
                    {item.bib}
                  </div>
                  <div className="text-sm text-center text-muted-foreground mt-1">
                    {item.count} photo{item.count > 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
