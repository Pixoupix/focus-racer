"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  portfolio: string | null;
  avgRating: number;
  totalReviews: number;
  company: string | null;
  location: string | null;
  city: string | null;
  listingCount: number;
  _count: { events: number };
}

interface InviteResult {
  success: boolean;
  message: string;
  user?: { id: string; name: string; role: string };
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-card p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function StarRating({ rating, reviews }: { rating: number; reviews: number }) {
  const stars = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= stars ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-500 ml-1">
        ({reviews} avis)
      </span>
    </div>
  );
}

export default function TeamPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Invite form state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  // Remove confirmation
  const [removingId, setRemovingId] = useState<string | null>(null);

  const userRole = session?.user?.role;

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team");
      if (res.ok) {
        const data = await res.json();
        setTeam(data.team || []);
        setTotalListings(data.totalListings || 0);
      } else {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de charger l'équipe",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching team:", error);
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
    if (session && userRole === "AGENCY") {
      fetchTeam();
    } else {
      setIsLoading(false);
    }
  }, [session, userRole, fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    setInviteResult(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setInviteResult(data);
        toast({
          title: "Photographe trouvé",
          description: data.message,
        });
        setInviteEmail("");
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
      setIsInviting(false);
    }
  };

  const handleRemove = (id: string) => {
    if (removingId === id) {
      // Confirm removal - in MVP, just remove from local state
      // In production, this would revoke marketplace application acceptance
      setTeam((prev) => prev.filter((m) => m.id !== id));
      setRemovingId(null);
      toast({
        title: "Photographe retiré",
        description: "Le photographe a été retiré de votre équipe.",
      });
    } else {
      setRemovingId(id);
    }
  };

  const filteredTeam = team.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.company || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.city || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role check: Only AGENCY can access this page
  if (!isLoading && userRole && userRole !== "AGENCY") {
    return (
      <div className="p-8 animate-fade-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold font-display text-gray-900">
            Mon équipe
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez les photographes de votre agence
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
              Accès réservé aux agences
            </p>
            <p className="text-sm text-gray-500">
              Cette page est réservée aux comptes de type Agence pour la gestion
              de leur équipe de photographes.
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
            Mon équipe
          </h1>
          <p className="text-gray-500 mt-1">
            Gérez les photographes de votre agence
          </p>
        </div>
        <Button
          onClick={() => {
            setShowInviteForm(!showInviteForm);
            setInviteResult(null);
          }}
          className={
            showInviteForm
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg"
              : "bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
          }
        >
          {showInviteForm ? (
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
                  d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                />
              </svg>
              Rechercher un photographe
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
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{team.length}</p>
                <p className="text-sm text-gray-500">Photographe{team.length !== 1 ? "s" : ""}</p>
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
                <p className="text-2xl font-bold text-gray-900">
                  {team.reduce((acc, m) => acc + (m._count?.events || 0), 0)}
                </p>
                <p className="text-sm text-gray-500">Événements total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
                <p className="text-sm text-gray-500">Mission{totalListings !== 1 ? "s" : ""} publiée{totalListings !== 1 ? "s" : ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <Card className="glass-card rounded-2xl mb-8 border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">
              Rechercher un photographe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-gray-700">
                  Email du photographe
                </Label>
                <div className="flex gap-3">
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="photographe@example.com"
                    className="flex-1 bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
                  >
                    {isInviting ? (
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

              {inviteResult && inviteResult.success && (
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
                      {inviteResult.user?.name}
                    </span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    {inviteResult.message}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3 bg-emerald hover:bg-emerald-hover text-white rounded-lg"
                    onClick={() => {
                      window.location.href = "/photographer/marketplace";
                    }}
                  >
                    Aller sur la Marketplace
                  </Button>
                </div>
              )}

              <p className="text-xs text-gray-400">
                Recherchez un photographe inscrit sur Focus Racer par son email.
                Pour l&apos;ajouter à votre équipe, créez une mission sur la Marketplace
                et acceptez sa candidature.
              </p>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      {!isLoading && team.length > 0 && (
        <div className="mb-6">
          <Input
            placeholder="Rechercher dans l'équipe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white max-w-md border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
          />
        </div>
      )}

      {/* Team grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredTeam.length === 0 ? (
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
            </div>
            <p className="text-gray-700 font-medium mb-2">
              {team.length === 0
                ? "Aucun photographe dans votre équipe"
                : "Aucun résultat"}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {team.length === 0
                ? "Publiez une mission sur la Marketplace pour recruter des photographes."
                : "Aucun photographe ne correspond à votre recherche."}
            </p>
            {team.length === 0 && (
              <Button
                onClick={() => {
                  window.location.href = "/photographer/marketplace";
                }}
                className="bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
              >
                Aller sur la Marketplace
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeam.map((member) => {
            const initials = member.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card
                key={member.id}
                className="bg-white border-0 shadow-card rounded-xl hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
              >
                <CardContent className="p-6">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.name}
                      </h3>
                      {member.company && (
                        <p className="text-xs text-gray-500 truncate">
                          {member.company}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {member.totalReviews > 0 && (
                    <div className="mb-3">
                      <StarRating
                        rating={member.avgRating}
                        reviews={member.totalReviews}
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                      <span className="truncate">{member.email}</span>
                    </div>

                    {member.phone && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
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
                        <span>{member.phone}</span>
                      </div>
                    )}

                    {(member.city || member.location) && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                          />
                        </svg>
                        <span className="truncate">
                          {member.city || member.location}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                        />
                      </svg>
                      <span>
                        {member._count?.events || 0} événement{(member._count?.events || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {member.listingCount > 0 && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-gray-400 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                        <span>
                          {member.listingCount} mission{member.listingCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    {member.portfolio && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs"
                        onClick={() =>
                          window.open(member.portfolio!, "_blank")
                        }
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
                            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                          />
                        </svg>
                        Portfolio
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      className={`rounded-lg text-xs ${
                        removingId === member.id
                          ? "border-red-300 text-red-600 hover:bg-red-50"
                          : "text-gray-500 hover:text-red-600 hover:border-red-200"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(member.id);
                      }}
                      onBlur={() => setRemovingId(null)}
                    >
                      {removingId === member.id ? "Confirmer" : "Retirer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
