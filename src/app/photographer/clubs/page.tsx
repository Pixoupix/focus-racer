"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Club {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  location: string | null;
  city: string | null;
  isActive: boolean;
  _count: { events: number };
  createdAt: string;
}

interface SearchResult {
  success: boolean;
  message: string;
  user?: { id: string; name: string; role: string };
}

function SkeletonRow() {
  return (
    <div className="p-5 animate-pulse border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export default function ClubsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search form
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  const userRole = session?.user?.role;

  const fetchClubs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setClubs(data.team || []);
      } else {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de charger les clubs",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching clubs:", error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (session && userRole === "FEDERATION") {
      fetchClubs();
    } else {
      setIsLoading(false);
    }
  }, [session, userRole, fetchClubs]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setIsSearching(true);
    setSearchResult(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: searchEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSearchResult(data);
        toast({
          title: "Club trouvé",
          description: data.message,
        });
        setSearchEmail("");
        // Refresh list
        fetchClubs();
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de rechercher cet utilisateur",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Computed stats
  const activeClubs = clubs.filter((c) => c.isActive).length;
  const totalEvents = clubs.reduce((acc, c) => acc + (c._count?.events || 0), 0);

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (club.city || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role check: Only FEDERATION can access this page
  if (!isLoading && userRole && userRole !== "FEDERATION") {
    return (
      <div className="p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display text-gray-900">
            Mes clubs
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez les clubs affiliés à votre fédération
          </p>
        </div>
        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-2">
              Accès réservé aux fédérations
            </p>
            <p className="text-sm text-gray-500">
              Cette page est réservée aux comptes de type Fédération pour la gestion
              de leurs clubs affiliés.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">
            Mes clubs
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez les clubs affiliés à votre fédération
          </p>
        </div>
        <Button
          onClick={() => {
            setShowSearchForm(!showSearchForm);
            setSearchResult(null);
          }}
          className={
            showSearchForm
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg"
              : "bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
          }
        >
          {showSearchForm ? (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Fermer
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              Rechercher un club
            </>
          )}
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clubs.length}</p>
                <p className="text-sm text-gray-500">Club{clubs.length !== 1 ? "s" : ""} total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeClubs}</p>
                <p className="text-sm text-gray-500">Club{activeClubs !== 1 ? "s" : ""} actif{activeClubs !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalEvents}</p>
                <p className="text-sm text-gray-500">Événement{totalEvents !== 1 ? "s" : ""} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search form */}
      {showSearchForm && (
        <Card className="glass-card rounded-2xl mb-8 border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">
              Rechercher un club
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-email" className="text-gray-700">
                  Email du club
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="search-email"
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    placeholder="club@example.com"
                    className="flex-1 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isSearching || !searchEmail.trim()}
                    className="bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
                  >
                    {isSearching ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Recherche...
                      </>
                    ) : (
                      "Rechercher"
                    )}
                  </Button>
                </div>
              </div>

              {searchResult && searchResult.success && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <svg
                      className="w-5 h-5 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium text-emerald-800">
                      {searchResult.user?.name}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    {searchResult.message}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Recherchez un club inscrit sur Focus Racer par son email.
                Les clubs avec un compte actif apparaîtront automatiquement dans votre liste.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter bar */}
      {!isLoading && clubs.length > 0 && (
        <div className="mb-6">
          <Input
            placeholder="Rechercher un club par nom, email, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white max-w-md border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
          />
        </div>
      )}

      {/* Clubs list */}
      {isLoading ? (
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardContent className="p-0">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </CardContent>
        </Card>
      ) : filteredClubs.length === 0 ? (
        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-2">
              {clubs.length === 0
                ? "Aucun club enregistré"
                : "Aucun résultat"}
            </p>
            <p className="text-sm text-gray-500">
              {clubs.length === 0
                ? "Aucun club n'est encore inscrit sur la plateforme."
                : "Aucun club ne correspond à votre recherche."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-card rounded-xl overflow-hidden">
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="col-span-4">Club</div>
              <div className="col-span-2">Contact</div>
              <div className="col-span-2">Localisation</div>
              <div className="col-span-1 text-center">Événements</div>
              <div className="col-span-1 text-center">Statut</div>
              <div className="col-span-2 text-center">Inscription</div>
            </div>

            {/* Rows */}
            {filteredClubs.map((club) => {
              const initials = club.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);

              const isExpanded = expandedId === club.id;

              return (
                <div key={club.id}>
                  <div
                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center cursor-pointer hover:bg-gray-50 transition-colors ${
                      isExpanded ? "bg-gray-50" : ""
                    } border-b border-gray-50 last:border-0`}
                    onClick={() => toggleExpanded(club.id)}
                  >
                    {/* Club name + avatar */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-md">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {club.name}
                        </p>
                        {club.company && (
                          <p className="text-xs text-gray-500 truncate">
                            {club.company}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {club.email}
                      </p>
                      {club.phone && (
                        <p className="text-xs text-gray-500">{club.phone}</p>
                      )}
                    </div>

                    {/* Location */}
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        {club.city || club.location || "-"}
                      </p>
                    </div>

                    {/* Events count */}
                    <div className="col-span-1 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                        {club._count?.events || 0}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-center">
                      <Badge
                        className={`text-xs ${
                          club.isActive
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {club.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>

                    {/* Registration date */}
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      <span className="text-sm text-gray-500">
                        {new Date(club.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Nom complet
                          </p>
                          <p className="text-sm text-gray-900">{club.name}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Email
                          </p>
                          <a
                            href={`mailto:${club.email}`}
                            className="text-sm text-emerald-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {club.email}
                          </a>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Téléphone
                          </p>
                          <p className="text-sm text-gray-900">
                            {club.phone || "-"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Localisation
                          </p>
                          <p className="text-sm text-gray-900">
                            {[club.city, club.location]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </p>
                        </div>
                      </div>

                      {club.company && (
                        <div className="mt-4 space-y-1">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Structure / Organisation
                          </p>
                          <p className="text-sm text-gray-900">{club.company}</p>
                        </div>
                      )}

                      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `mailto:${club.email}`;
                          }}
                        >
                          <svg
                            className="w-3.5 h-3.5 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                            />
                          </svg>
                          Envoyer un email
                        </Button>
                        {club.phone && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${club.phone}`;
                            }}
                          >
                            <svg
                              className="w-3.5 h-3.5 mr-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                              />
                            </svg>
                            Appeler
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
