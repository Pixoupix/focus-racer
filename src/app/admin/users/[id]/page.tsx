"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-helpers";

interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  company: string | null;
  isActive: boolean;
  credits: number;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    events: number;
    orders: number;
    creditTransactions: number;
    supportMessages: number;
  };
  events: {
    id: string;
    name: string;
    date: string;
    _count: { photos: number };
  }[];
  totalRevenue: number;
  totalPhotos: number;
  buyerOrdersCount: number;
  buyerTotalSpent: number;
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

  // Credit management state
  const [creditAmount, setCreditAmount] = useState<string>("");
  const [creditReason, setCreditReason] = useState<string>("");
  const [creditTransactions, setCreditTransactions] = useState<
    CreditTransaction[]
  >([]);
  const [isCreditLoading, setIsCreditLoading] = useState(false);
  const [isCreditSubmitting, setIsCreditSubmitting] = useState(false);

  const fetchUser = useCallback(async () => {
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
  }, [id]);

  const fetchCredits = useCallback(async () => {
    setIsCreditLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${id}/credits`);
      if (response.ok) {
        const data = await response.json();
        setCreditTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setIsCreditLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
    fetchCredits();
  }, [fetchUser, fetchCredits]);

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
        setUser((prev) =>
          prev ? { ...prev, isActive: updated.isActive } : null
        );
        toast({
          title: "Mis à jour",
          description: `Compte ${updated.isActive ? "activé" : "désactivé"}`,
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
        setUser((prev) => (prev ? { ...prev, role: updated.role } : null));
        toast({
          title: "Mis à jour",
          description: `Rôle changé en ${getRoleLabel(updated.role)}`,
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
          title: "Mot de passe réinitialisé",
          description: "Un mot de passe temporaire a été généré",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const submitCreditChange = async () => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount === 0) {
      toast({
        title: "Montant invalide",
        description: "Entrez un nombre positif ou négatif non nul",
        variant: "destructive",
      });
      return;
    }

    setIsCreditSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${id}/credits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: creditReason }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser((prev) =>
          prev ? { ...prev, credits: data.credits } : null
        );
        setCreditAmount("");
        setCreditReason("");
        toast({
          title: "Crédits mis à jour",
          description: `${amount > 0 ? "+" : ""}${amount} crédits appliqués`,
        });
        // Refresh transaction history
        fetchCredits();
      } else {
        const error = await response.json();
        toast({
          title: "Erreur",
          description: error.error || "Impossible de modifier les crédits",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsCreditSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PURCHASE: "Achat",
      DEDUCTION: "Déduction",
      REFUND: "Remboursement",
      ADMIN_GRANT: "Admin",
    };
    return labels[type] || type;
  };

  const getTransactionBadgeClass = (type: string) => {
    switch (type) {
      case "PURCHASE":
        return "bg-blue-100 text-blue-700";
      case "DEDUCTION":
        return "bg-orange-100 text-orange-700";
      case "REFUND":
        return "bg-amber-100 text-amber-700";
      case "ADMIN_GRANT":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="animate-fade-in text-center py-20">
        <p className="text-red-600 text-lg">Utilisateur non trouvé</p>
        <Link
          href="/focus-mgr-7k9x/users"
          className="text-emerald hover:underline mt-4 inline-block"
        >
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link
        href="/focus-mgr-7k9x/users"
        className="text-emerald hover:text-emerald-dark hover:underline mb-4 inline-block transition-colors duration-200"
      >
        &larr; Retour à la liste
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-navy">{user.name}</h1>
        <Badge
          variant={user.isActive ? "default" : "destructive"}
          className={user.isActive ? "bg-emerald-500" : ""}
        >
          {user.isActive ? "Actif" : "Inactif"}
        </Badge>
        <Badge variant="outline" className="border-emerald text-emerald">
          {getRoleLabel(user.role)}
        </Badge>
      </div>

      {/* User Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-emerald">{user.credits}</p>
            <p className="text-xs text-muted-foreground mt-1">Crédits</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-navy">{user._count.orders}</p>
            <p className="text-xs text-muted-foreground mt-1">Commandes</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-navy">
              {formatCurrency(user.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">CA généré</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-navy">{user.totalPhotos}</p>
            <p className="text-xs text-muted-foreground mt-1">Photos</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-navy">
              {user._count.events}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Événements</p>
          </CardContent>
        </Card>
        <Card className="glass-card rounded-2xl">
          <CardContent className="pt-4 pb-4 px-4 text-center">
            <p className="text-2xl font-bold text-navy">
              {user._count.supportMessages}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Messages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* User Information */}
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
              <p className="text-sm text-muted-foreground">Téléphone</p>
              <p className="font-medium text-navy">
                {user.phone || "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Société</p>
              <p className="font-medium text-navy">
                {user.company || "Non renseigné"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inscrit le</p>
              <p className="font-medium text-navy">
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Dernière activité
              </p>
              <p className="font-medium text-navy">
                {formatDateTime(user.updatedAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stripe Connect</p>
              <div className="flex items-center gap-2 mt-1">
                {user.stripeAccountId ? (
                  <>
                    <Badge
                      className={
                        user.stripeOnboarded
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {user.stripeOnboarded ? "Onboarded" : "En attente"}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {user.stripeAccountId}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Non connecté
                  </span>
                )}
              </div>
            </div>
            {user.buyerOrdersCount > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Achats effectués
                </p>
                <p className="font-medium text-navy">
                  {user.buyerOrdersCount} commande
                  {user.buyerOrdersCount > 1 ? "s" : ""} -{" "}
                  {formatCurrency(user.buyerTotalSpent)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Changer le role
              </p>
              <Select value={user.role} onValueChange={changeRole}>
                <SelectTrigger className="border-gray-200 focus:border-emerald focus:ring-emerald">
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

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Statut du compte
              </p>
              <Button
                variant={user.isActive ? "destructive" : "default"}
                onClick={toggleActive}
                className={`w-full ${
                  !user.isActive
                    ? "bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
                    : ""
                }`}
              >
                {user.isActive
                  ? "Désactiver le compte"
                  : "Activer le compte"}
              </Button>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Mot de passe
              </p>
              <Button
                variant="outline"
                onClick={resetPassword}
                className="w-full border-emerald text-emerald hover:bg-emerald-50 transition-all duration-200"
              >
                Réinitialiser le mot de passe
              </Button>
              {tempPassword && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    Mot de passe temporaire :{" "}
                    <code className="font-mono font-bold">{tempPassword}</code>
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Communiquez ce mot de passe à l&apos;utilisateur de manière
                    sécurisée.
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Communication
              </p>
              <Link
                href={`/focus-mgr-7k9x/support?userId=${user.id}`}
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full border-emerald text-emerald hover:bg-emerald-50 transition-all duration-200"
                >
                  Envoyer un message
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Management */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Gestion des crédits</CardTitle>
            <CardDescription className="text-muted-foreground">
              Ajouter ou retirer des crédits manuellement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald">
                  {user.credits}
                </p>
                <p className="text-sm text-emerald-600 mt-1">
                  Solde actuel
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Montant (positif = ajouter, négatif = retirer)
              </label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Ex: 100 ou -50"
                className="border-gray-200 focus:border-emerald focus:ring-emerald"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Raison
              </label>
              <Input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Raison de la modification"
                className="border-gray-200 focus:border-emerald focus:ring-emerald"
              />
            </div>

            <Button
              onClick={submitCreditChange}
              disabled={isCreditSubmitting || !creditAmount}
              className="w-full bg-gradient-to-r from-emerald to-emerald-dark text-white hover:shadow-emerald transition-all duration-200"
            >
              {isCreditSubmitting
                ? "En cours..."
                : "Appliquer la modification"}
            </Button>
          </CardContent>
        </Card>

        {/* Credit Transactions */}
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">
              Historique des crédits
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Les 10 dernières transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCreditLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-emerald border-t-transparent rounded-full animate-spin" />
              </div>
            ) : creditTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune transaction
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {creditTransactions.slice(0, 10).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/20"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="secondary"
                          className={getTransactionBadgeClass(tx.type)}
                        >
                          {getTransactionTypeLabel(tx.type)}
                        </Badge>
                        <span
                          className={`text-sm font-bold ${
                            tx.amount > 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}
                          {tx.amount}
                        </span>
                      </div>
                      {tx.reason && (
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(tx.createdAt)} | Solde:{" "}
                        {tx.balanceBefore} &rarr; {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      {user.events.length > 0 && (
        <Card className="glass-card rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Événements récents</CardTitle>
            <CardDescription className="text-muted-foreground">
              Les 10 derniers événements de cet utilisateur
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.events.map((event) => (
                <div
                  key={event.id}
                  className="flex justify-between items-center p-3 bg-white/50 rounded-xl border border-white/20"
                >
                  <div>
                    <p className="font-medium text-navy">{event.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald"
                  >
                    {event._count.photos} photo
                    {event._count.photos !== 1 ? "s" : ""}
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
