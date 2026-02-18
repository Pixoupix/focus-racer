"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageCategory =
  | "BILLING"
  | "SORTING"
  | "GDPR"
  | "ACCOUNT"
  | "TECHNICAL"
  | "EVENT"
  | "OTHER";

type MessageStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface MessageUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MessageRow {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: MessageCategory;
  status: MessageStatus;
  eventId: string | null;
  orderId: string | null;
  adminReply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: MessageUser;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatusCounts {
  OPEN: number;
  IN_PROGRESS: number;
  RESOLVED: number;
  CLOSED?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<MessageCategory, string> = {
  BILLING: "Facturation",
  SORTING: "Tri photos",
  GDPR: "RGPD",
  ACCOUNT: "Compte",
  TECHNICAL: "Technique",
  EVENT: "Événement",
  OTHER: "Autre",
};

const CATEGORY_COLORS: Record<MessageCategory, string> = {
  BILLING: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  SORTING: "bg-sky-100 text-sky-700 hover:bg-sky-100",
  GDPR: "bg-rose-100 text-rose-700 hover:bg-rose-100",
  ACCOUNT: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
  TECHNICAL: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  EVENT: "bg-teal-100 text-teal-700 hover:bg-teal-100",
  OTHER: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const STATUS_LABELS: Record<MessageStatus, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const STATUS_COLORS: Record<MessageStatus, string> = {
  OPEN: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  IN_PROGRESS: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  RESOLVED: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  CLOSED: "bg-gray-100 text-gray-500 hover:bg-gray-100",
};

const STATUS_BORDER_COLORS: Record<MessageStatus, string> = {
  OPEN: "border-l-amber-500",
  IN_PROGRESS: "border-l-blue-500",
  RESOLVED: "border-l-emerald-500",
  CLOSED: "border-l-gray-400",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminMessagesPage() {
  const { toast } = useToast();

  // Data state
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [closingId, setClosingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ---------------------------------------------------------------------------
  // Fetch messages
  // ---------------------------------------------------------------------------

  const fetchMessages = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: "20",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const response = await fetch(`/api/admin/messages?${params}`);
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des messages");
        }

        const data = await response.json();
        setMessages(data.messages);
        setPagination(data.pagination);
        setStatusCounts({
          OPEN: data.statusCounts?.OPEN ?? 0,
          IN_PROGRESS: data.statusCounts?.IN_PROGRESS ?? 0,
          RESOLVED: data.statusCounts?.RESOLVED ?? 0,
          CLOSED: data.statusCounts?.CLOSED ?? 0,
        });
      } catch (error) {
        console.error("Error fetching messages:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, categoryFilter, statusFilter, toast]
  );

  useEffect(() => {
    fetchMessages(1);
  }, [fetchMessages]);

  // ---------------------------------------------------------------------------
  // Reply / Update status
  // ---------------------------------------------------------------------------

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez saisir une réponse",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la mise à jour");
      }

      toast({
        title: "Réponse envoyée",
        description: "Le message passe en statut \"En cours\"",
      });

      setExpandedId(null);
      setReplyText("");
      fetchMessages(pagination.page);
    } catch (error) {
      console.error("Error updating message:", error);
      toast({
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Impossible de mettre à jour le message",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async (messageId: string) => {
    setClosingId(messageId);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (!response.ok) {
        throw new Error("Erreur");
      }

      toast({ title: "Conversation clôturée" });
      setExpandedId(null);
      setReplyText("");
      fetchMessages(pagination.page);
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setClosingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Expand / Collapse
  // ---------------------------------------------------------------------------

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setReplyText("");
    } else {
      const msg = messages.find((m) => m.id === id);
      setExpandedId(id);
      setReplyText(msg?.adminReply ?? "");
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + "..." : text;

  const totalOpen = statusCounts.OPEN ?? 0;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-navy">Messagerie</h1>
          {totalOpen > 0 && (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-sm px-3 py-1">
              {totalOpen} ouvert{totalOpen > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">
          Gérez les messages et demandes des utilisateurs
        </p>
      </div>

      {/* Status counter cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(
          [
            { key: "OPEN" as MessageStatus, label: "Ouverts", color: "amber" },
            {
              key: "IN_PROGRESS" as MessageStatus,
              label: "En cours",
              color: "blue",
            },
            {
              key: "RESOLVED" as MessageStatus,
              label: "Résolus",
              color: "emerald",
            },
            {
              key: "CLOSED" as MessageStatus,
              label: "Fermés",
              color: "gray",
            },
          ] as const
        ).map(({ key, label, color }) => (
          <Card
            key={key}
            className={`glass-card rounded-2xl border-l-4 border-l-${color}-500 cursor-pointer transition-all hover:shadow-md ${
              statusFilter === key ? "ring-2 ring-emerald/50" : ""
            }`}
            onClick={() =>
              setStatusFilter(statusFilter === key ? "active" : key)
            }
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <p
                className={`text-2xl font-bold ${
                  color === "amber"
                    ? "text-amber-600"
                    : color === "blue"
                    ? "text-blue-600"
                    : color === "emerald"
                    ? "text-emerald-600"
                    : "text-gray-500"
                }`}
              >
                {statusCounts[key] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <Input
          placeholder="Rechercher par sujet, utilisateur, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:w-80"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as MessageCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Actifs uniquement</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {(Object.keys(STATUS_LABELS) as MessageStatus[]).map((st) => (
              <SelectItem key={st} value={st}>
                {STATUS_LABELS[st]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages list */}
      {isLoading ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Chargement des messages...</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card className="glass-card rounded-2xl">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-lg mb-1">
              Aucun message trouvé
            </p>
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || categoryFilter !== "all" || statusFilter !== "all"
                ? "Essayez de modifier vos filtres"
                : "Les messages des utilisateurs apparaîtront ici"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => {
            const isExpanded = expandedId === msg.id;

            return (
              <Card
                key={msg.id}
                className={`glass-card rounded-2xl border-l-4 ${
                  STATUS_BORDER_COLORS[msg.status]
                } transition-all ${
                  isExpanded ? "ring-1 ring-emerald/30 shadow-lg" : ""
                }`}
              >
                {/* Message summary - clickable */}
                <div
                  className="cursor-pointer hover:bg-white/30 transition-colors rounded-t-2xl"
                  onClick={() => toggleExpand(msg.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      {/* Left: User info + subject */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-navy text-sm">
                            {msg.user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {msg.user.email}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-emerald/30 text-emerald text-xs"
                          >
                            {getRoleLabel(msg.user.role)}
                          </Badge>
                        </div>
                        <CardTitle className="text-base text-navy leading-snug">
                          {msg.subject}
                        </CardTitle>
                      </div>

                      {/* Right: Badges + date */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={CATEGORY_COLORS[msg.category]}>
                          {CATEGORY_LABELS[msg.category]}
                        </Badge>
                        <Badge className={STATUS_COLORS[msg.status]}>
                          {STATUS_LABELS[msg.status]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 pb-3">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isExpanded ? "" : truncate(msg.message, 150)}
                    </p>
                    {!isExpanded && (
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </span>
                        {msg.adminReply && (
                          <Badge
                            variant="outline"
                            className="text-xs border-emerald/30 text-emerald"
                          >
                            Répondu
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <CardContent className="pt-0 border-t border-gray-100">
                    {/* Full message */}
                    <div className="mt-4 mb-6">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Message complet
                      </p>
                      <div className="bg-white/60 rounded-xl p-4 text-sm text-navy leading-relaxed whitespace-pre-wrap">
                        {msg.message}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Envoyé le {formatDate(msg.createdAt)}</span>
                        {msg.eventId && (
                          <span>Événement : {msg.eventId}</span>
                        )}
                        {msg.orderId && (
                          <span>Commande : {msg.orderId}</span>
                        )}
                      </div>
                    </div>

                    {/* Previous admin reply */}
                    {msg.adminReply && msg.repliedAt && (
                      <div className="mb-6">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Réponse précédente
                        </p>
                        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-navy leading-relaxed whitespace-pre-wrap border border-emerald-100">
                          {msg.adminReply}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Répondu le {formatDate(msg.repliedAt)}
                          {msg.repliedBy && ` par ${msg.repliedBy}`}
                        </p>
                      </div>
                    )}

                    {/* Reply form */}
                    <div className="bg-white/40 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                        {msg.adminReply ? "Modifier la réponse" : "Répondre"}
                      </p>

                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Saisissez votre réponse..."
                        rows={4}
                        className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[100px]"
                      />

                      <div className="flex items-center gap-2 mt-3 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setExpandedId(null);
                            setReplyText("");
                          }}
                          disabled={isSubmitting}
                        >
                          Annuler
                        </Button>
                        {msg.status !== "CLOSED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300 text-gray-600 hover:bg-gray-100"
                            onClick={() => handleClose(msg.id)}
                            disabled={closingId === msg.id || isSubmitting}
                          >
                            {closingId === msg.id ? "..." : "Clôturer"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-emerald hover:bg-emerald-dark text-white"
                          onClick={() => handleReply(msg.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? "Envoi..." : "Répondre"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-3">
          <p className="text-sm text-muted-foreground">
            {pagination.total} message{pagination.total !== 1 ? "s" : ""} au
            total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchMessages(pagination.page - 1)}
            >
              Précédent
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchMessages(pagination.page + 1)}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
