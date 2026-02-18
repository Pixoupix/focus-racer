"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSSENotifications } from "@/hooks/useSSENotifications";
import { useSession } from "next-auth/react";
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

interface Reply {
  role: "user" | "admin";
  content: string;
  date: string;
  author?: string;
}

interface SupportMessage {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  adminReply: string | null;
  repliedAt: string | null;
  repliedBy: string | null;
  replies: Reply[];
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: "BILLING", label: "Facturation" },
  { value: "SORTING", label: "Tri photos" },
  { value: "GDPR", label: "RGPD" },
  { value: "ACCOUNT", label: "Mon compte" },
  { value: "TECHNICAL", label: "Problème technique" },
  { value: "EVENT", label: "Événement" },
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

export default function PhotographerSupportPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // New message form
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [message, setMessage] = useState("");

  // Reply form
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchMessages = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/support?page=${pageNum}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching support messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchMessages(page);
      fetch("/api/support/mark-read", { method: "POST" }).catch(() => {});
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
      // Also mark as read since we're looking at the page
      fetch("/api/support/mark-read", { method: "POST" }).catch(() => {});
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
        toast({ title: "Message envoyé", description: "Nous vous répondrons dans les meilleurs délais." });
        setSubject("");
        setCategory("OTHER");
        setMessage("");
        setShowForm(false);
        setPage(1);
        fetchMessages(1);
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.error || "Impossible d'envoyer le message", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (msgId: string) => {
    if (!replyText.trim()) {
      toast({ title: "Champs requis", description: "Veuillez saisir une réponse", variant: "destructive" });
      return;
    }

    setIsReplying(true);
    try {
      const res = await fetch(`/api/support/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });

      if (res.ok) {
        toast({ title: "Réponse envoyée" });
        setReplyText("");
        fetchMessages(page);
      } else {
        const data = await res.json();
        toast({ title: "Erreur", description: data.error || "Impossible d'envoyer la réponse", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    } finally {
      setIsReplying(false);
    }
  };

  const handleClose = async (msgId: string) => {
    setClosingId(msgId);
    try {
      const res = await fetch(`/api/support/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });

      if (res.ok) {
        toast({ title: "Conversation clôturée" });
        setExpandedId(null);
        setReplyText("");
        fetchMessages(page);
      } else {
        toast({ title: "Erreur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setClosingId(null);
    }
  };

  const toggleExpanded = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setReplyText("");
    } else {
      setExpandedId(id);
      setReplyText("");
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-gray-900">Support</h1>
          <p className="text-gray-500 mt-1">
            Contactez notre équipe pour toute question ou problème
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className={
            showForm
              ? "bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg"
              : "bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
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
              Nouveau message
            </>
          )}
        </Button>
      </div>

      {/* New message form */}
      {showForm && (
        <Card className="glass-card rounded-2xl mb-8 border-0 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">
              Nouveau message
            </CardTitle>
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
                    placeholder="Décrivez brièvement votre problème"
                    className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700">Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald/20 focus:border-emerald">
                      <SelectValue placeholder="Sélectionnez une catégorie" />
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
                  placeholder="Décrivez votre problème en détail..."
                  rows={5}
                  className="flex w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/20 focus:border-emerald disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  required
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
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
            <Card key={i} className="bg-white border-0 shadow-card rounded-xl animate-pulse">
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
        <Card className="glass-card rounded-2xl border-0 shadow-card">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>
            <p className="text-gray-500 mb-2">Aucun message de support</p>
            <p className="text-sm text-gray-400 mb-6">
              Vous n&apos;avez pas encore envoyé de message au support.
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-emerald hover:bg-emerald-hover text-white rounded-lg shadow-emerald transition-all duration-200"
            >
              Envoyer un premier message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {messages.map((msg) => {
              const statusCfg = STATUS_CONFIG[msg.status] || STATUS_CONFIG.OPEN;
              const isExpanded = expandedId === msg.id;
              const isClosed = msg.status === "CLOSED";
              const replies: Reply[] = Array.isArray(msg.replies) ? msg.replies : [];
              const hasConversation = replies.length > 0 || msg.adminReply;

              return (
                <Card
                  key={msg.id}
                  className={`bg-white border-0 shadow-card rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer ${isClosed ? "opacity-70" : ""}`}
                  onClick={() => toggleExpanded(msg.id)}
                >
                  <CardContent className="p-6">
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{msg.subject}</h3>
                        {hasConversation && (
                          <span className="flex items-center gap-1 text-xs text-blue-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                            {replies.length + (msg.adminReply && replies.length === 0 ? 1 : 0)} réponse{(replies.length + (msg.adminReply && replies.length === 0 ? 1 : 0)) > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
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
                      <p className="text-sm text-gray-500 line-clamp-2">{msg.message}</p>
                    )}

                    {/* Expanded: conversation thread */}
                    {isExpanded && (
                      <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Initial message */}
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">Vous</span>
                            <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap ml-8">{msg.message}</p>
                        </div>

                        {/* Legacy admin reply (if no replies array entries) */}
                        {msg.adminReply && replies.length === 0 && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-emerald-700">Support</span>
                              {msg.repliedAt && (
                                <span className="text-xs text-emerald-500">{formatDate(msg.repliedAt)}</span>
                              )}
                            </div>
                            <p className="text-sm text-emerald-800 whitespace-pre-wrap ml-8">{msg.adminReply}</p>
                          </div>
                        )}

                        {/* Conversation thread from replies array */}
                        {replies.map((reply, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-4 ${
                              reply.role === "admin"
                                ? "bg-emerald-50 border border-emerald-100"
                                : "bg-blue-50 border border-blue-100"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                reply.role === "admin" ? "bg-emerald-200" : "bg-blue-200"
                              }`}>
                                <svg className={`w-3.5 h-3.5 ${reply.role === "admin" ? "text-emerald-700" : "text-blue-700"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  {reply.role === "admin" ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                  )}
                                </svg>
                              </div>
                              <span className={`text-sm font-medium ${reply.role === "admin" ? "text-emerald-700" : "text-blue-700"}`}>
                                {reply.role === "admin" ? "Support" : "Vous"}
                              </span>
                              <span className={`text-xs ${reply.role === "admin" ? "text-emerald-500" : "text-blue-500"}`}>
                                {formatDate(reply.date)}
                              </span>
                            </div>
                            <p className={`text-sm whitespace-pre-wrap ml-8 ${reply.role === "admin" ? "text-emerald-800" : "text-blue-800"}`}>
                              {reply.content}
                            </p>
                          </div>
                        ))}

                        {/* Reply form + Close button (only if not closed) */}
                        {!isClosed && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 mt-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Votre réponse..."
                              rows={3}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald/20 focus:border-emerald resize-y min-h-[80px]"
                            />
                            <div className="flex items-center gap-2 mt-3 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-gray-300 text-gray-600 hover:bg-gray-100"
                                onClick={() => handleClose(msg.id)}
                                disabled={closingId === msg.id || isReplying}
                              >
                                {closingId === msg.id ? "..." : "Clôturer"}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald hover:bg-emerald-hover text-white"
                                onClick={() => handleReply(msg.id)}
                                disabled={isReplying || !replyText.trim()}
                              >
                                {isReplying ? "Envoi..." : "Répondre"}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Closed notice */}
                        {isClosed && (
                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                            <p className="text-sm text-gray-500">Cette conversation est clôturée</p>
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
              <span className="text-sm text-gray-500">
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
  );
}
