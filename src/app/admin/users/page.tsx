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
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-helpers";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  company: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { events: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  // Create user modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PHOTOGRAPHER",
  });
  const [isCreating, setIsCreating] = useState(false);

  // Inline action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(
    async (page: number, searchQuery: string, role: string) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (searchQuery) params.set("search", searchQuery);
        if (role && role !== "all") params.set("role", role);

        const response = await fetch(`/api/admin/users?${params}`);
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsers(1, search, roleFilter);
  }, [fetchUsers, search, roleFilter]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    window.location.href = `/api/admin/export/users?${params}`;
  };

  const handleCreateUser = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast({
        title: "Champs requis",
        description: "Nom, email et mot de passe sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (res.ok) {
        toast({ title: "Utilisateur créé" });
        setShowCreate(false);
        setCreateForm({ name: "", email: "", password: "", role: "PHOTOGRAPHER" });
        fetchUsers(1, search, roleFilter);
      } else {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de créer l'utilisateur",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleActive = async (user: UserRow) => {
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isActive: !u.isActive } : u
          )
        );
        toast({
          title: user.isActive ? "Compte désactivé" : "Compte activé",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (user: UserRow) => {
    if (!confirm(`Supprimer définitivement ${user.name} (${user.email}) ? Cette action est irréversible.`)) {
      return;
    }
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}?hard=true`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: "Utilisateur supprimé" });
        fetchUsers(pagination.page, search, roleFilter);
      } else {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible de supprimer",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-navy">Utilisateurs</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            Exporter CSV
          </Button>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-emerald hover:bg-emerald-dark text-white"
          >
            + Créer un utilisateur
          </Button>
        </div>
      </div>

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Créer un utilisateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nom *</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email *</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="jean@example.com"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Mot de passe *</label>
                <Input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mot de passe initial"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Rôle</label>
                <Select
                  value={createForm.role}
                  onValueChange={(v) => setCreateForm({ ...createForm, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PHOTOGRAPHER">Photographe</SelectItem>
                    <SelectItem value="ORGANIZER">Organisateur</SelectItem>
                    <SelectItem value="AGENCY">Agence</SelectItem>
                    <SelectItem value="CLUB">Club</SelectItem>
                    <SelectItem value="FEDERATION">Fédération</SelectItem>
                    <SelectItem value="RUNNER">Coureur</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={isCreating}
                  className="flex-1 bg-emerald hover:bg-emerald-dark text-white"
                >
                  {isCreating ? "Création..." : "Créer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <CardTitle>Liste des utilisateurs</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="PHOTOGRAPHER">Photographe</SelectItem>
                  <SelectItem value="ORGANIZER">Organisateur</SelectItem>
                  <SelectItem value="AGENCY">Agence</SelectItem>
                  <SelectItem value="CLUB">Club</SelectItem>
                  <SelectItem value="FEDERATION">Fédération</SelectItem>
                  <SelectItem value="RUNNER">Coureur</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-8 text-center">Chargement...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Aucun utilisateur trouvé</p>
          ) : (
            <>
              <div className="rounded-xl overflow-hidden border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Événements</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Inscrit le</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className={!user.isActive ? "opacity-60" : ""}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-sm">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>{user._count.events}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(user)}
                              disabled={actionLoading === user.id}
                              title={user.isActive ? "Désactiver" : "Activer"}
                              className="h-8 w-8 p-0"
                            >
                              {user.isActive ? (
                                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              )}
                            </Button>
                            <Link href={`/focus-mgr-7k9x/users/${user.id}`}>
                              <Button variant="ghost" size="sm" title="Détails" className="h-8 w-8 p-0">
                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteUser(user)}
                              disabled={actionLoading === user.id}
                              title="Supprimer"
                              className="h-8 w-8 p-0"
                            >
                              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    {pagination.total} utilisateur{pagination.total !== 1 ? "s" : ""} au total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => fetchUsers(pagination.page - 1, search, roleFilter)}
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
                      onClick={() => fetchUsers(pagination.page + 1, search, roleFilter)}
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
