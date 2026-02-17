"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

interface PublicEvent {
  id: string;
  name: string;
  date: string;
  location: string | null;
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
  processedAt: string | null;
  photosDeleted: number;
  facesDeleted: number;
  createdAt: string;
}

const GDPR_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "En attente", className: "bg-amber-100 text-amber-800 border-amber-200" },
  PROCESSING: { label: "En traitement", className: "bg-blue-100 text-blue-800 border-blue-200" },
  COMPLETED: { label: "Terminée", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "Refusée", className: "bg-red-100 text-red-800 border-red-200" },
};

export default function GdprSelfServicePage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [bibNumber, setBibNumber] = useState("");
  const [eventId, setEventId] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch("/api/events/public");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch("/api/gdpr/self-service");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests);
      }
    } catch (error) {
      console.error("Error fetching GDPR requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchEvents();
      fetchRequests();
    }
  }, [session, fetchEvents, fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bibNumber.trim() || !eventId) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le numéro de dossard et sélectionner un événement.",
        variant: "destructive",
      });
      return;
    }

    if (!confirmed) {
      toast({
        title: "Confirmation requise",
        description: "Veuillez confirmer que le dossard est bien lié à votre identité.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gdpr/self-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bibNumber: bibNumber.trim(),
          eventId,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "Demande enregistrée",
          description: "Votre demande RGPD a été soumise. Elle sera traitée dans un délai de 30 jours.",
        });
        setBibNumber("");
        setEventId("");
        setReason("");
        setConfirmed(false);
        fetchRequests();
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de soumettre la demande",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting GDPR request:", error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
        </main>
        <Footer />
      </div>
    );
  }

  const hasPendingRequest = requests.some((r) => r.status === "PENDING" || r.status === "PROCESSING");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-navy">Mes données personnelles (RGPD)</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos données personnelles et exercez vos droits
            </p>
          </div>

          {/* GDPR explanation */}
          <Card className="glass-card rounded-2xl mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Vos droits RGPD
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600">
                <p>
                  Conformément au Règlement Général sur la Protection des Données (RGPD),
                  vous disposez des droits suivants sur vos données personnelles :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Droit d&apos;accès</strong> : obtenir une copie de vos données personnelles
                  </li>
                  <li>
                    <strong>Droit de suppression</strong> : demander l&apos;effacement de vos photos et données biométriques (visage, dossard)
                  </li>
                  <li>
                    <strong>Droit de rectification</strong> : corriger des informations inexactes
                  </li>
                  <li>
                    <strong>Droit à la portabilité</strong> : recevoir vos données dans un format standard
                  </li>
                </ul>
                <p className="text-gray-500 mt-3">
                  Pour exercer votre droit de suppression, remplissez le formulaire ci-dessous.
                  Votre identité sera vérifiée à partir de votre numéro de dossard et de votre nom.
                  La demande sera traitée dans un délai maximum de 30 jours.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Deletion request form */}
          <Card className="glass-card rounded-2xl mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Demande de suppression</CardTitle>
            </CardHeader>
            <CardContent>
              {hasPendingRequest ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <span className="font-medium text-amber-800">Demande en cours</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Vous avez déjà une demande de suppression en cours de traitement.
                    Vous pourrez en soumettre une nouvelle une fois celle-ci terminée.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bibNumber" className="text-gray-700">Numéro de dossard</Label>
                      <Input
                        id="bibNumber"
                        value={bibNumber}
                        onChange={(e) => setBibNumber(e.target.value)}
                        placeholder="Ex: 1234"
                        className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event" className="text-gray-700">Événement</Label>
                      {isLoadingEvents ? (
                        <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
                      ) : (
                        <Select value={eventId} onValueChange={setEventId}>
                          <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald">
                            <SelectValue placeholder="Sélectionnez un événement" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((evt) => (
                              <SelectItem key={evt.id} value={evt.id}>
                                {evt.name} ({new Date(evt.date).toLocaleDateString("fr-FR")})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-gray-700">
                      Motif (optionnel)
                    </Label>
                    <textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Précisions complémentaires sur votre demande..."
                      rows={3}
                      className="flex w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/20 focus:border-emerald disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                    />
                  </div>

                  {/* Confirmation checkbox */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-gray-700">
                        Je confirme que le dossard{" "}
                        <strong>{bibNumber || "___"}</strong> est bien lié à mon nom{" "}
                        <strong>{session?.user?.name || "___"}</strong>.
                        Je comprends que cette demande entraînera la suppression définitive
                        de mes photos et données biométriques associées à cet événement.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting || !confirmed || !bibNumber || !eventId}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                          Soumettre la demande de suppression
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Existing requests */}
          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Historique de vos demandes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRequests ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-4 rounded-lg bg-gray-50 animate-pulse">
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-5 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="h-3 w-48 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : requests.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">Aucune demande RGPD</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => {
                    const statusCfg = GDPR_STATUS_CONFIG[req.status] || GDPR_STATUS_CONFIG.PENDING;

                    return (
                      <div
                        key={req.id}
                        className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              Demande de {req.type === "DELETION" ? "suppression" : req.type === "ACCESS" ? "accès" : "rectification"}
                            </span>
                            <Badge className={`text-xs ${statusCfg.className}`}>
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(req.createdAt).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {req.bibNumber && (
                            <p>Dossard : <strong>{req.bibNumber}</strong></p>
                          )}
                          {req.reason && (
                            <p className="text-gray-500">{req.reason}</p>
                          )}
                          {req.adminNote && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 rounded p-2">
                              <p className="text-xs text-blue-700">
                                <strong>Note de l&apos;administrateur :</strong> {req.adminNote}
                              </p>
                            </div>
                          )}
                          {req.status === "COMPLETED" && (
                            <p className="text-xs text-emerald-600 mt-1">
                              {req.photosDeleted} photo(s) supprimée(s), {req.facesDeleted} donnée(s) biométrique(s) effacée(s)
                            </p>
                          )}
                          {req.processedAt && (
                            <p className="text-xs text-gray-400">
                              Traitée le {new Date(req.processedAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
