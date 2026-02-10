"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventWithStats } from "@/types";

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course a pied",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacles",
  OTHER: "Autre",
};

// Skeleton components pour le chargement
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="space-y-2">
          <div className="h-6 w-16 bg-gray-200 rounded" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonEventItem() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div className="space-y-2">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events");
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchEvents();
    }
  }, [session]);

  const totalPhotos = events.reduce((sum, e) => sum + (e._count?.photos || 0), 0);
  const publishedCount = events.filter((e) => e.status === "PUBLISHED").length;
  const totalRunners = events.reduce((sum, e) => sum + ((e._count as Record<string, number>)?.startListEntries || 0), 0);

  const recentEvents = events.slice(0, 5);

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">
          Bonjour {session?.user?.name?.split(" ")[0]} !
        </h1>
        <p className="text-gray-500 mt-1">
          Bienvenue sur Focus Racer - Votre espace photographe
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-gray-900">{events.length}</p>
                    <p className="text-sm text-gray-500">Evenements</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-gray-900">{publishedCount}</p>
                    <p className="text-sm text-gray-500">Publies</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-gray-900">{totalPhotos}</p>
                    <p className="text-sm text-gray-500">Photos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-card rounded-xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-display text-gray-900">{totalRunners}</p>
                    <p className="text-sm text-gray-500">Coureurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent events */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg font-display text-gray-900">Evenements recents</CardTitle>
                <CardDescription className="text-gray-500">Vos derniers evenements crees</CardDescription>
              </div>
              <Link href="/photographer/events">
                <Button variant="outline" size="sm" className="text-orange border-orange/30 hover:bg-orange-50 rounded-lg">
                  Voir tout
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <SkeletonEventItem />
                  <SkeletonEventItem />
                  <SkeletonEventItem />
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <p className="text-gray-500 mb-4">Aucun evenement pour le moment</p>
                  <Link href="/photographer/events/new">
                    <Button className="bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange">
                      Creer mon premier evenement
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/photographer/events/${event.id}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange font-bold text-sm">
                          {event.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{event.name}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(event.date).toLocaleDateString("fr-FR")} • {event._count.photos} photos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                          event.status === "PUBLISHED"
                            ? "bg-success-light text-success-dark"
                            : event.status === "DRAFT"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-50 text-blue"
                        }`}>
                          {event.status === "PUBLISHED" ? "Publie" : event.status === "DRAFT" ? "Brouillon" : "Archive"}
                        </span>
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="space-y-6">
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/photographer/events/new" className="block">
                <Button className="w-full justify-start gap-3 bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange transition-all duration-200 hover:-translate-y-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nouvel evenement
                </Button>
              </Link>
              <Link href="/photographer/marketplace" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg transition-all duration-200">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                  Explorer la marketplace
                </Button>
              </Link>
              <Link href="/photographer/statistics" className="block">
                <Button variant="outline" className="w-full justify-start gap-3 text-gray-700 border-gray-200 hover:bg-gray-50 rounded-lg transition-all duration-200">
                  <svg className="w-5 h-5 text-blue" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                  Voir les statistiques
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Sport types distribution */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Types de sport</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-4 w-8 bg-gray-200 rounded" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded" />
                    <div className="h-4 w-8 bg-gray-200 rounded" />
                  </div>
                </div>
              ) : events.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucune donnee</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(
                    events.reduce((acc, e) => {
                      const sport = e.sportType || "OTHER";
                      acc[sport] = (acc[sport] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([sport, count]) => (
                    <div key={sport} className="flex items-center justify-between py-1">
                      <span className="text-sm text-gray-600">{SPORT_LABELS[sport] || sport}</span>
                      <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
