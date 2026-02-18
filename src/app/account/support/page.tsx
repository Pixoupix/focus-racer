"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSSENotifications } from "@/hooks/useSSENotifications";
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

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: "BILLING", label: "Facturation / Paiement" },
  { value: "ACCOUNT", label: "Mon compte" },
  { value: "TECHNICAL", label: "Problème technique" },
  { value: "EVENT", label: "Événement / Photos" },
  { value: "GDPR", label: "RGPD / Données personnelles" },
  { value: "OTHER", label: "Autre" },
];

const CATEGORY_LABELS: Record<string, string> = {
  BILLING: "Facturation",
  SORTING: "Tri photos",
  GDPR: "RGPD",
  ACCOUNT: "Mon compte",
  TECHNICAL: "Technique",
  EVENT: "Événement",
  OTHER: "Autre",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  OPEN: { label: "Ouvert", className: "bg-amber-100 text-amber-800 border-amber-200" },
  IN_PROGRESS: { label: "En cours", className: "bg-blue-100 text-blue-800 border-blue-200" },
  RESOLVED: { label: "Résolu", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CLOSED: { label: "Fermé", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

export default function RunnerSupportPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Form state
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  const fetchMessages = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/support?page=${pageNum}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setPagination(data.pagination);
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching support messages:", error);
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
    if (session) {
      fetchMessages(page);
    }
  }, [session, page, fetchMessages]);

  // Auto-refresh message list (silently) when admin replies via SSE
  const pageRef = useRef(page);
  pageRef.current = page;

  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/support?page=${pageRef.current}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setPagination(data.pagination);
      }
    } catch {
      // silent
    }
  }, []);

  // SSE: auto-refresh when admin replies
  useSSENotifications(["user_unread", "connected"], silentRefresh);

  // Also poll every 10s as safety net
  useEffect(() => {
    const interval = setInterval(silentRefresh, 10000);
    return () => clearInterval(interval);
  }, [silentRefresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir le sujet et le message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), category }),
      });

      if (res.ok) {
        toast({
          title: "Message envoyé",
          description: "Notre équipe vous répondra dans les meilleurs délais.",
        });
        setSubject("");
        setCategory("OTHER");
        setMessage("");
        setShowForm(false);
        setPage(1);
        fetchMessages(1);
      } else {
        const data = await res.json();
        toast({
          title: "Erreur",
          description: data.error || "Impossible d'envoyer le message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending support message:", error);
      toast({
        title: "Erreur",
        description: "Erreur de connexion au serveur",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (sessionStatus === "loading" || (isLoading && messages.length === 0 && sessionStatus === "authenticated")) {
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy">Support</h1>
              <p className="text-muted-foreground mt-1">
                Besoin d&apos;aide ? Contactez notre équipe
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className={
                showForm
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg"
                  : "bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
              }
            >
              {showForm ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Fermer
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Contacter le support
                </>
              )}
            </Button>
          </div>

          {/* New message form */}
          {showForm && (
            <Card className="glass-card rounded-2xl mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Nouveau message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-700">Sujet</Label>
                      <Input
                        id="subject"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Ex: Problème de téléchargement"
                        className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-gray-700">Catégorie</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald">
                          <SelectValue placeholder="Sélectionnez" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-700">Message</Label>
                    <textarea
                      id="message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Décrivez votre problème ou votre question..."
                      rows={5}
                      className="flex w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/20 focus:border-emerald disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
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
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                          </svg>
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Messages list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card rounded-2xl animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-5 w-48 bg-gray-200 rounded" />
                      <div className="flex gap-2">
                        <div className="h-5 w-20 bg-gray-200 rounded" />
                        <div className="h-5 w-16 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-4 w-full bg-gray-100 rounded mt-2" />
                    <div className="h-4 w-3/4 bg-gray-100 rounded mt-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <Card className="glass-card rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <p className="text-muted-foreground mb-2">Aucun message</p>
                <p className="text-sm text-gray-400 mb-6">
                  Vous n&apos;avez pas encore contacté le support.
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
                >
                  Poser une question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {messages.map((msg) => {
                  const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.OPEN;
                  const isExpanded = expandedId === msg.id;

                  return (
                    <Card
                      key={msg.id}
                      className="glass-card rounded-2xl hover:shadow-glass-lg transition-all duration-200 cursor-pointer"
                      onClick={() => toggleExpanded(msg.id)}
                    >
                      <CardContent className="p-6">
                        {/* Header row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{msg.subject}</h3>
                            {msg.adminReply && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Répondu
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${statusCfg.className}`}>
                              {statusCfg.label}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[msg.category] || msg.category}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                          </div>
                        </div>

                        {/* Preview */}
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.message}</p>
                        )}

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-3 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                            </div>

                            {msg.adminReply && (
                              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="text-sm font-medium text-emerald-700">Réponse de l&apos;équipe Focus Racer</span>
                                  {msg.repliedAt && (
                                    <span className="text-xs text-emerald-500">
                                      {new Date(msg.repliedAt).toLocaleDateString("fr-FR", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-emerald-800 whitespace-pre-wrap">{msg.adminReply}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} sur {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
