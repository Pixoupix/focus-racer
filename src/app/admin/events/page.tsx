"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  PUBLISHED: { label: "Publié", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  ARCHIVED: { label: "Archivé", color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" },
};

const SPORT_LABELS: Record<string, string> = {
  RUNNING: "Course",
  TRAIL: "Trail",
  TRIATHLON: "Triathlon",
  CYCLING: "Cyclisme",
  SWIMMING: "Natation",
  OBSTACLE: "Obstacle",
  OTHER: "Autre",
};

const SORT_OPTIONS = [
  { value: "date", label: "Date (recent)" },
  { value: "name", label: "Nom (A-Z)" },
  { value: "photos", label: "Photos (plus)" },
];

interface EventRow {
  id: string;
  name: string;
  date: string;
  location: string | null;
  sportType: string;
  status: string;
  user: { id: string; name: string; email: string };
  photoCount: number;
  runnerCount: number;
  orderCount: number;
  revenue: number;
  platformFee: number;
  paidOrders: number;
  topBibs: { number: string; photoCount: number }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminEventsPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReprocess, setConfirmReprocess] = useState<string | null>(null);

  // Global stats (aggregated from all pages)
  const [globalStats, setGlobalStats] = useState({
    totalEvents: 0,
    published: 0,
    draft: 0,
    archived: 0,
    totalPhotos: 0,
    totalRevenue: 0,
  });

  const fetchEvents = useCallback(
    async (page: number, searchQuery: string, status: string, sort: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
          sort,
        });
        if (searchQuery) params.set("search", searchQuery);
        if (status && status !== "all") params.set("status", status);

        const response = await fetch(`/api/admin/events?${params}`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les événements",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  // Fetch global stats once on mount
  useEffect(() => {
    async function fetchGlobalStats() {
      try {
        // Fetch all statuses to get counts
        const [allRes, publishedRes, draftRes, archivedRes] = await Promise.all([
          fetch("/api/admin/events?limit=1&page=1"),
          fetch("/api/admin/events?limit=1&page=1&status=PUBLISHED"),
          fetch("/api/admin/events?limit=1&page=1&status=DRAFT"),
          fetch("/api/admin/events?limit=1&page=1&status=ARCHIVED"),
        ]);

        const [allData, publishedData, draftData, archivedData] = await Promise.all([
          allRes.json(),
          publishedRes.json(),
          draftRes.json(),
          archivedRes.json(),
        ]);

        setGlobalStats({
          totalEvents: allData.pagination?.total || 0,
          published: publishedData.pagination?.total || 0,
          draft: draftData.pagination?.total || 0,
          archived: archivedData.pagination?.total || 0,
          totalPhotos: 0,
          totalRevenue: 0,
        });
      } catch {
        // stats are non-critical
      }
    }
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    fetchEvents(1, search, statusFilter, sortBy);
  }, [fetchEvents, search, statusFilter, sortBy]);

  // Page-level stats
  const pagePhotos = events.reduce((sum, e) => sum + e.photoCount, 0);
  const pageRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const pageOrders = events.reduce((sum, e) => sum + e.paidOrders, 0);

  // --- Action handlers ---

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    setActionLoading(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Statut mis à jour",
          description: `Événement passé en "${STATUS_LABELS[newStatus]?.label || newStatus}"`,
        });
        // Refresh current page
        fetchEvents(pagination.page, search, statusFilter, sortBy);
      } else {
        const data = await response.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de changer le statut",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Événement supprimé",
          description: "L'événement a été supprimé avec succès",
        });
        setConfirmDelete(null);
        fetchEvents(pagination.page, search, statusFilter, sortBy);
      } else {
        const data = await response.json();
        toast({
          title: "Suppression impossible",
          description: data.error || "Erreur lors de la suppression",
          variant: "destructive",
        });
        setConfirmDelete(null);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
      setConfirmDelete(null);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReprocess = async (eventId: string) => {
    setActionLoading(eventId);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/reprocess`, {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Retraitement lancé",
          description: data.message || "Le retraitement IA a été lancé",
        });
        setConfirmReprocess(null);
      } else {
        const data = await response.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de lancer le retraitement",
          variant: "destructive",
        });
        setConfirmReprocess(null);
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur de connexion",
        variant: "destructive",
      });
      setConfirmReprocess(null);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy">Événements</h1>
          <p className="text-muted-foreground mt-1">
            Gestion et supervision de tous les événements de la plateforme
          </p>
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-navy">{globalStats.totalEvents}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Publiés
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600">{globalStats.published}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Brouillons
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-amber-600">{globalStats.draft}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
              Archivés
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-gray-500">{globalStats.archived}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Photos (page)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-navy">{pagePhotos.toLocaleString("fr-FR")}</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              CA (page)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(pageRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Filters ===== */}
      <Card className="glass-card rounded-2xl mb-6">
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <Input
                placeholder="Rechercher par nom, lieu ou photographe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="PUBLISHED">Publié</SelectItem>
                <SelectItem value="ARCHIVED">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ===== Events List ===== */}
      {isLoading ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Chargement des événements...</p>
            </div>
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="py-16">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-muted-foreground text-lg">Aucun événement trouvé</p>
              <p className="text-muted-foreground text-sm mt-1">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const statusCfg = STATUS_LABELS[event.status] || STATUS_LABELS.DRAFT;
            const isExpanded = expandedId === event.id;
            const isDeleting = confirmDelete === event.id;
            const isReprocessing = confirmReprocess === event.id;
            const isActionLoading = actionLoading === event.id;

            return (
              <Card
                key={event.id}
                className="glass-card rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg"
              >
                {/* Main row */}
                <div
                  className="p-4 md:p-5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-navy text-lg truncate">
                              {event.name}
                            </h3>
                            <Badge className={`${statusCfg.color} border text-xs font-medium`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} mr-1.5 inline-block`} />
                              {statusCfg.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {SPORT_LABELS[event.sportType] || event.sportType}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(event.date)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {event.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <Link
                                href={`/focus-mgr-7k9x/users/${event.user.id}`}
                                className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {event.user.name}
                              </Link>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats pills */}
                    <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-navy">{event.photoCount}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Photos</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center px-3">
                        <p className="text-lg font-bold text-navy">{event.paidOrders}</p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Ventes</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center px-3">
                        <p className={`text-lg font-bold ${event.revenue > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {event.revenue > 0 ? formatCurrency(event.revenue) : "-"}
                        </p>
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider">CA</p>
                      </div>

                      {/* Expand icon */}
                      <button
                        className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : event.id);
                        }}
                      >
                        <svg
                          className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t bg-white/60">
                    <div className="p-5">
                      {/* Détails grid */}
                      <div className="grid md:grid-cols-3 gap-6 mb-5">
                        {/* Revenue detail */}
                        <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-sm text-navy mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Revenus
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">CA total</span>
                              <span className="font-semibold">{formatCurrency(event.revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commission plateforme</span>
                              <span className="font-medium text-emerald-600">{formatCurrency(event.platformFee)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Revenu net photographe</span>
                              <span>{formatCurrency(event.revenue - event.platformFee)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commandes payées</span>
                              <span>{event.paidOrders}</span>
                            </div>
                            {event.paidOrders > 0 && (
                              <div className="flex justify-between border-t pt-2 mt-2">
                                <span className="text-muted-foreground">Panier moyen</span>
                                <span className="font-medium">
                                  {formatCurrency(event.revenue / event.paidOrders)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Conversion */}
                        <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-sm text-navy mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Conversion
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Photos</span>
                              <span className="font-medium">{event.photoCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Coureurs (start-list)</span>
                              <span className="font-medium">{event.runnerCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Commandes totales</span>
                              <span>{event.orderCount}</span>
                            </div>
                            {event.runnerCount > 0 && (
                              <>
                                <div className="flex justify-between border-t pt-2 mt-2">
                                  <span className="text-muted-foreground">Taux de conversion</span>
                                  <span className="font-semibold text-emerald-600">
                                    {((event.paidOrders / event.runnerCount) * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                                  <div
                                    className="bg-emerald-500 h-2 rounded-full transition-all"
                                    style={{
                                      width: `${Math.min((event.paidOrders / event.runnerCount) * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              </>
                            )}
                            {event.photoCount > 0 && event.runnerCount > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Photos / coureur</span>
                                <span>{(event.photoCount / event.runnerCount).toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top bibs */}
                        <div className="bg-white/80 rounded-xl p-4 border border-gray-100">
                          <h4 className="font-semibold text-sm text-navy mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            Top dossards
                          </h4>
                          {event.topBibs.length > 0 ? (
                            <div className="space-y-2">
                              {event.topBibs.map((bib, i) => (
                                <div key={bib.number} className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                                      i === 0
                                        ? "bg-amber-100 text-amber-700"
                                        : i === 1
                                        ? "bg-gray-100 text-gray-600"
                                        : "bg-orange-50 text-orange-600"
                                    }`}
                                  >
                                    {i + 1}
                                  </span>
                                  <Badge variant="secondary" className="font-mono">
                                    #{bib.number}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {bib.photoCount} photo{bib.photoCount > 1 ? "s" : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground italic">Aucun dossard détecté</p>
                          )}

                          {/* Photographer email */}
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-xs text-muted-foreground">Photographe</p>
                            <p className="text-sm font-medium">{event.user.name}</p>
                            <p className="text-xs text-muted-foreground">{event.user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                        {/* Status change */}
                        <Select
                          value={event.status}
                          onValueChange={(val) => handleStatusChange(event.id, val)}
                          disabled={isActionLoading}
                        >
                          <SelectTrigger className="w-40 h-9 text-sm">
                            <SelectValue placeholder="Changer le statut" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">Brouillon</SelectItem>
                            <SelectItem value="PUBLISHED">Publié</SelectItem>
                            <SelectItem value="ARCHIVED">Archivé</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* View public gallery */}
                        {event.status === "PUBLISHED" && (
                          <Link
                            href={`/events/${event.id}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="outline" size="sm" className="h-9">
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              Galerie publique
                            </Button>
                          </Link>
                        )}

                        {/* View orders */}
                        <Link
                          href={`/focus-mgr-7k9x/payments?eventId=${event.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="outline" size="sm" className="h-9">
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Commandes
                          </Button>
                        </Link>

                        {/* Reprocess AI */}
                        {!isReprocessing ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9"
                            disabled={isActionLoading || event.photoCount === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmReprocess(event.id);
                            }}
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retraiter IA
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-sm text-amber-700">
                              Relancer le traitement IA sur {event.photoCount} photos ?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                              disabled={isActionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReprocess(event.id);
                              }}
                            >
                              {isActionLoading ? "..." : "Confirmer"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmReprocess(null);
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        )}

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Delete */}
                        {!isDeleting ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={isActionLoading || event.paidOrders > 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(event.id);
                            }}
                            title={
                              event.paidOrders > 0
                                ? `Suppression impossible : ${event.paidOrders} commande(s) payée(s)`
                                : "Supprimer l'événement"
                            }
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Supprimer
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-sm text-red-700 font-medium">
                              Supprimer définitivement cet événement et ses {event.photoCount} photos ?
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              disabled={isActionLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(event.id);
                              }}
                            >
                              {isActionLoading ? "..." : "Supprimer"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete(null);
                              }}
                            >
                              Annuler
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}

          {/* ===== Pagination ===== */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
              <p className="text-sm text-muted-foreground">
                {pagination.total} événement{pagination.total !== 1 ? "s" : ""} au total
                {pageOrders > 0 && (
                  <span className="ml-2">
                    -- {pageOrders} commande{pageOrders !== 1 ? "s" : ""} sur cette page
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchEvents(pagination.page - 1, search, statusFilter, sortBy)}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Précédent
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? "default" : "outline"}
                        size="sm"
                        className={`w-9 h-9 p-0 ${
                          pageNum === pagination.page
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : ""
                        }`}
                        onClick={() => fetchEvents(pageNum, search, statusFilter, sortBy)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchEvents(pagination.page + 1, search, statusFilter, sortBy)}
                >
                  Suivant
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
