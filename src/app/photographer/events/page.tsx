"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

// Skeleton component
function SkeletonEventCard() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="w-16 h-5 bg-gray-200 rounded-md" />
      </div>
      <div className="h-5 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-200 rounded mb-4" />
      <div className="flex gap-3">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-4 w-16 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function EventsListPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

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

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Evenements</h1>
          <p className="text-gray-500 mt-1">Gerez tous vos evenements photo</p>
        </div>
        <Link href="/photographer/events/new">
          <Button className="gap-2 bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange transition-all duration-200 hover:-translate-y-0.5">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvel evenement
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Rechercher un evenement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border-gray-200 rounded-lg focus:ring-2 focus:ring-blue/20 focus:border-blue transition-all"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: "ALL", label: "Tous" },
            { value: "DRAFT", label: "Brouillons" },
            { value: "PUBLISHED", label: "Publies" },
            { value: "ARCHIVED", label: "Archives" },
          ].map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className={
                statusFilter === f.value
                  ? "bg-blue hover:bg-blue-hover text-white rounded-lg"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 rounded-lg"
              }
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Events list */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonEventCard />
          <SkeletonEventCard />
          <SkeletonEventCard />
          <SkeletonEventCard />
          <SkeletonEventCard />
          <SkeletonEventCard />
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">
              {events.length === 0
                ? "Vous n'avez pas encore cree d'evenement"
                : "Aucun evenement ne correspond a vos criteres"}
            </p>
            {events.length === 0 && (
              <Link href="/photographer/events/new">
                <Button className="bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange">
                  Creer mon premier evenement
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <Link key={event.id} href={`/photographer/events/${event.id}`}>
              <Card className="bg-white border-0 shadow-card rounded-xl hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-blue">
                      {event.name.charAt(0)}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                      event.status === "PUBLISHED"
                        ? "bg-success-light text-success-dark"
                        : event.status === "DRAFT"
                        ? "bg-gray-100 text-gray-600"
                        : "bg-blue-50 text-blue"
                    }`}>
                      {event.status === "PUBLISHED" ? "Publie" : event.status === "DRAFT" ? "Brouillon" : "Archive"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{event.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {event.location && ` • ${event.location}`}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                      </svg>
                      {event._count.photos} photos
                    </span>
                    <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      {SPORT_LABELS[event.sportType || "RUNNING"]}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
