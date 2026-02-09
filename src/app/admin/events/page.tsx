"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-white/50 text-muted-foreground" },
  PUBLISHED: { label: "Publié", color: "bg-emerald-100 text-emerald-700" },
  ARCHIVED: { label: "Archivé", color: "bg-amber-100 text-amber-700" },
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
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = useCallback(async (page: number, searchQuery: string, status: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "20" });
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(1, search, statusFilter);
  }, [fetchEvents, search, statusFilter]);

  // Summary calculations
  const totalRevenue = events.reduce((sum, e) => sum + e.revenue, 0);
  const totalPhotos = events.reduce((sum, e) => sum + e.photoCount, 0);
  const totalOrders = events.reduce((sum, e) => sum + e.paidOrders, 0);

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold text-navy mb-8">Événements</h1>

      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total événements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pagination.total}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Photos (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPhotos}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Commandes payées (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">CA généré (page)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange">{totalRevenue.toFixed(2)}€</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle>Liste des événements</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher événement, lieu, photographe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-72"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="DRAFT">Brouillon</SelectItem>
                  <SelectItem value="PUBLISHED">Publié</SelectItem>
                  <SelectItem value="ARCHIVED">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Chargement...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucun événement trouvé</p>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Événement</TableHead>
                    <TableHead>Photographe</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Photos</TableHead>
                    <TableHead>Coureurs</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const statusCfg = STATUS_LABELS[event.status] || STATUS_LABELS.DRAFT;
                    const isExpanded = expandedId === event.id;

                    return (
                      <>
                        <TableRow key={event.id} className="cursor-pointer hover:bg-white/50">
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.date).toLocaleDateString("fr-FR")}
                                {event.location && ` \u2022 ${event.location}`}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/admin/users/${event.user.id}`}
                              className="text-orange hover:text-orange-dark transition-colors text-sm"
                            >
                              {event.user.name}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {SPORT_LABELS[event.sportType] || event.sportType}
                            </Badge>
                          </TableCell>
                          <TableCell>{event.photoCount}</TableCell>
                          <TableCell>{event.runnerCount}</TableCell>
                          <TableCell>
                            {event.paidOrders > 0 ? (
                              <span className="font-medium">{event.paidOrders}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {event.revenue > 0 ? (
                              <span className="font-semibold text-orange">
                                {event.revenue.toFixed(2)}€
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : event.id)}
                            >
                              {isExpanded ? "\u25B2" : "\u25BC"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${event.id}-detail`}>
                            <TableCell colSpan={9} className="bg-white/50">
                              <div className="p-4 grid md:grid-cols-3 gap-6">
                                {/* Revenue detail */}
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Revenus</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">CA total</span>
                                      <span className="font-medium">{event.revenue.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Commission plateforme</span>
                                      <span>{event.platformFee.toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Reversement photographe</span>
                                      <span>{(event.revenue - event.platformFee).toFixed(2)}€</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Commandes payées</span>
                                      <span>{event.paidOrders}</span>
                                    </div>
                                    {event.paidOrders > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Panier moyen</span>
                                        <span>{(event.revenue / event.paidOrders).toFixed(2)}€</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Conversion */}
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Conversion</h4>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Photos</span>
                                      <span>{event.photoCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Coureurs (start-list)</span>
                                      <span>{event.runnerCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Commandes totales</span>
                                      <span>{event.orderCount}</span>
                                    </div>
                                    {event.runnerCount > 0 && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Taux de conversion</span>
                                        <span className="font-medium">
                                          {((event.paidOrders / event.runnerCount) * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Top bibs */}
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Top dossards</h4>
                                  {event.topBibs.length > 0 ? (
                                    <div className="space-y-2">
                                      {event.topBibs.map((bib, i) => (
                                        <div key={bib.number} className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-muted-foreground w-4">
                                            {i + 1}.
                                          </span>
                                          <Badge variant="secondary">#{bib.number}</Badge>
                                          <span className="text-sm text-muted-foreground">
                                            {bib.photoCount} photo{bib.photoCount > 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Aucun dossard détecté</p>
                                  )}
                                </div>
                              </div>

                              {/* Links */}
                              <div className="px-4 pb-2 flex gap-2">
                                <Link href={`/admin/payments?eventId=${event.id}`}>
                                  <Button variant="outline" size="sm">
                                    Voir les commandes
                                  </Button>
                                </Link>
                                {event.status === "PUBLISHED" && (
                                  <Link href={`/events/${event.id}`} target="_blank">
                                    <Button variant="outline" size="sm">
                                      Voir la galerie publique
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} événement{pagination.total !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchEvents(pagination.page - 1, search, statusFilter)}
                    >
                      Précédent
                    </Button>
                    <span className="flex items-center text-sm text-muted-foreground">
                      Page {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => fetchEvents(pagination.page + 1, search, statusFilter)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
