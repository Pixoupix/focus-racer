"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-helpers";

interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  company: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { events: number };
  events: {
    id: string;
    name: string;
    date: string;
    _count: { photos: number };
  }[];
}

export default function AdminUserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { toast } = useToast();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/admin/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const toggleActive = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (response.ok) {
        const updated = await response.json();
        setUser((prev) => prev ? { ...prev, isActive: updated.isActive } : null);
        toast({
          title: "Mis a jour",
          description: `Compte ${updated.isActive ? "active" : "desactive"}`,
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const changeRole = async (newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        const updated = await response.json();
        setUser((prev) => prev ? { ...prev, role: updated.role } : null);
        toast({
          title: "Mis a jour",
          description: `Role change en ${getRoleLabel(updated.role)}`,
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const resetPassword = async () => {
    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setTempPassword(data.tempPassword);
        toast({
          title: "Mot de passe reinitialise",
          description: "Un mot de passe temporaire a ete genere",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement...</p>;
  }

  if (!user) {
    return <p className="text-red-600">Utilisateur non trouve</p>;
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/focus-mgr-7k9x/users"
        className="text-emerald hover:text-emerald-dark hover:underline mb-4 inline-block transition-colors duration-200"
      >
        &larr; Retour a la liste
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-navy">{user.name}</h1>
        <Badge variant={user.isActive ? "default" : "destructive"} className={user.isActive ? "bg-emerald-500" : ""}>
          {user.isActive ? "Actif" : "Inactif"}
        </Badge>
        <Badge variant="outline" className="border-emerald text-emerald">{getRoleLabel(user.role)}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium text-navy">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Telephone</p>
              <p className="font-medium text-navy">{user.phone || "Non renseigne"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Societe</p>
              <p className="font-medium text-navy">{user.company || "Non renseigne"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inscrit le</p>
              <p className="font-medium text-navy">
                {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Evenements crees</p>
              <p className="font-medium text-navy">{user._count.events}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Changer le role</p>
              <Select value={user.role} onValueChange={changeRole}>
                <SelectTrigger className="border-gray-200 focus:border-emerald focus:ring-emerald">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTOGRAPHER">Photographe</SelectItem>
                  <SelectItem value="ORGANIZER">Organisateur</SelectItem>
                  <SelectItem value="AGENCY">Agence</SelectItem>
                  <SelectItem value="CLUB">Club</SelectItem>
                  <SelectItem value="FEDERATION">Federation</SelectItem>
                  <SelectItem value="RUNNER">Coureur</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Statut du compte</p>
              <Button
                variant={user.isActive ? "destructive" : "default"}
                onClick={toggleActive}
                className={`w-full ${!user.isActive ? "bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200" : ""}`}
              >
                {user.isActive ? "Desactiver le compte" : "Activer le compte"}
              </Button>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Mot de passe</p>
              <Button variant="outline" onClick={resetPassword} className="w-full border-emerald text-emerald hover:bg-emerald-50 transition-all duration-200">
                Reinitialiser le mot de passe
              </Button>
              {tempPassword && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    Mot de passe temporaire :{" "}
                    <code className="font-mono font-bold">{tempPassword}</code>
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Communiquez ce mot de passe a l&apos;utilisateur de maniere securisee.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {user.events.length > 0 && (
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Evenements recents</CardTitle>
            <CardDescription className="text-muted-foreground">
              Les 10 derniers evenements de cet utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.events.map((event) => (
                <div key={event.id} className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20">
                  <div>
                    <p className="font-medium text-navy">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald">
                    {event._count.photos} photo{event._count.photos !== 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
