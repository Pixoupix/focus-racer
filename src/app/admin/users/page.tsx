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

  const fetchUsers = useCallback(async (page: number, searchQuery: string, role: string) => {
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
  }, []);

  useEffect(() => {
    fetchUsers(1, search, roleFilter);
  }, [fetchUsers, search, roleFilter]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    window.location.href = `/api/admin/export/users?${params}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-navy">Utilisateurs</h1>
        <Button variant="outline" onClick={handleExport}>
          Exporter CSV
        </Button>
      </div>

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
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleLabel(user.role)}</Badge>
                        </TableCell>
                        <TableCell>{user._count.events}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell>
                          <Link href={`/admin/users/${user.id}`}>
                            <Button variant="outline" size="sm">
                              Détails
                            </Button>
                          </Link>
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
