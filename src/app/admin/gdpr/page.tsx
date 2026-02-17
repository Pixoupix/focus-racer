"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
}

interface GdprRequest {
  id: string;
  type: string;
  status: string;
  email: string;
  name: string;
  bibNumber: string | null;
  eventId: string | null;
  reason: string | null;
  adminNote: string | null;
  photosDeleted: number;
  facesDeleted: number;
  createdAt: string;
  processedAt: string | null;
  auditLogs: AuditLog[];
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "En attente", variant: "secondary" },
  PROCESSING: { label: "En cours", variant: "default" },
  COMPLETED: { label: "Traitée", variant: "outline" },
  REJECTED: { label: "Rejetée", variant: "destructive" },
};

const TYPE_LABELS: Record<string, string> = {
  DELETION: "Suppression",
  ACCESS: "Accès",
  RECTIFICATION: "Rectification",
};

export default function AdminGdprPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const url = filter === "all" ? "/api/admin/gdpr" : `/api/admin/gdpr?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        setRequests(await response.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN") {
        router.push("/");
        return;
      }
      fetchRequests();
    }
  }, [status, session, router, fetchRequests]);

  const handleProcess = async (requestId: string) => {
    if (!confirm("Traiter cette demande RGPD ? Les données associées seront supprimées de manière irréversible.")) return;

    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/admin/gdpr/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Demande traitée",
          description: `${data.photosDeleted} photo(s) supprimée(s)`,
        });
        fetchRequests();
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt("Motif du rejet :");
    if (reason === null) return;

    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/admin/gdpr/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", adminNote: reason }),
      });
      if (response.ok) {
        toast({ title: "Demande rejetée" });
        fetchRequests();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-white/50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-white/50 animate-fade-in">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-navy">Focus Racer</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Link href="/focus-mgr-7k9x/dashboard" className="text-emerald hover:text-emerald-dark transition-colors mb-4 inline-block">
          &larr; Retour au tableau de bord
        </Link>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-navy">RGPD - Demandes</h1>
            <p className="text-muted-foreground mt-1">
              {pendingCount > 0 ? `${pendingCount} demande${pendingCount > 1 ? "s" : ""} en attente` : "Aucune demande en attente"}
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="PROCESSING">En cours</SelectItem>
              <SelectItem value="COMPLETED">Traitées</SelectItem>
              <SelectItem value="REJECTED">Rejetées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {requests.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucune demande RGPD</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const statusInfo = STATUS_LABELS[req.status] || STATUS_LABELS.PENDING;
              return (
                <Card key={req.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {req.name} — {req.email}
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          <Badge variant="outline">{TYPE_LABELS[req.type] || req.type}</Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(req.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {req.bibNumber && ` • Dossard #${req.bibNumber}`}
                        </CardDescription>
                      </div>
                      {req.status === "PENDING" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleProcess(req.id)}
                            disabled={processingId === req.id}
                          >
                            {processingId === req.id ? "Traitement..." : "Traiter"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                          >
                            Rejeter
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {req.reason && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Motif :</span> {req.reason}
                      </p>
                    )}
                    {req.adminNote && (
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="font-medium">Note admin :</span> {req.adminNote}
                      </p>
                    )}
                    {req.status === "COMPLETED" && (
                      <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                        <span>{req.photosDeleted} photo(s) supprimée(s)</span>
                        <span>{req.facesDeleted} visage(s) supprimé(s)</span>
                      </div>
                    )}
                    {req.auditLogs.length > 0 && (
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Journal d&apos;audit</p>
                        <div className="space-y-1">
                          {req.auditLogs.map((log) => (
                            <div key={log.id} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString("fr-FR")}
                              </span>
                              <span>{log.details}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
