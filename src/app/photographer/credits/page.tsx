"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface CreditTransaction {
  id: string;
  type: "PURCHASE" | "DEDUCTION" | "REFUND" | "ADMIN_GRANT";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  createdAt: string;
}

const CREDIT_PACKS = [
  { amount: 10, label: "10 credits" },
  { amount: 50, label: "50 credits" },
  { amount: 100, label: "100 credits" },
  { amount: 500, label: "500 credits" },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  PURCHASE: { label: "Achat", color: "bg-blue-100 text-blue-700" },
  DEDUCTION: { label: "Deduction", color: "bg-orange-100 text-orange-700" },
  REFUND: { label: "Remboursement", color: "bg-emerald-100 text-emerald-700" },
  ADMIN_GRANT: { label: "Admin", color: "bg-purple-100 text-purple-700" },
};

export default function CreditsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number>(0);
  const [isTestMode, setIsTestMode] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPack, setLoadingPack] = useState<number | null>(null);

  const fetchCredits = useCallback(async () => {
    try {
      const res = await fetch("/api/credits");
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        setIsTestMode(data.isTestMode);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    }
  }, []);

  const fetchTransactions = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/credits/transactions?page=${p}&limit=15`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }, []);

  useEffect(() => {
    fetchCredits();
    fetchTransactions(1);
  }, [fetchCredits, fetchTransactions]);

  const buyCredits = async (amount: number) => {
    setLoadingPack(amount);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        toast({
          title: "Credits ajoutes",
          description: `${amount} credits ont ete ajoutes a votre compte.`,
        });
        fetchTransactions(1);
        setPage(1);
      } else {
        throw new Error("Erreur");
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les credits.",
        variant: "destructive",
      });
    } finally {
      setLoadingPack(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTransactions(newPage);
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Credits & Facturation</h1>
        <p className="text-gray-500 mt-1">Gerez vos credits pour importer des photos</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recharge */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Recharger</CardTitle>
              <CardDescription className="text-gray-500">
                1 credit = 1 photo importee. Credits rembourses si aucun dossard detecte.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CREDIT_PACKS.map((pack) => (
                  <Button
                    key={pack.amount}
                    variant="outline"
                    className="h-auto py-4 flex flex-col gap-1 border-gray-200 hover:border-orange-300 hover:bg-orange-50 rounded-xl transition-all"
                    onClick={() => buyCredits(pack.amount)}
                    disabled={loadingPack !== null}
                  >
                    {loadingPack === pack.amount ? (
                      <svg className="animate-spin h-5 w-5 text-orange-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-gray-900">+{pack.amount}</span>
                        <span className="text-xs text-gray-500">{pack.label}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Compte Stripe</CardTitle>
              <CardDescription className="text-gray-500">Recevez vos paiements de ventes directement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#635BFF]/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Stripe Connect</p>
                    <p className="text-sm text-gray-500">
                      {session?.user?.stripeAccountId ? "Compte connecte" : "Non configure"}
                    </p>
                  </div>
                </div>
                <Button
                  className={
                    session?.user?.stripeAccountId
                      ? "text-orange-500 border-orange-200 hover:bg-orange-50 rounded-lg"
                      : "bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-orange"
                  }
                  variant={session?.user?.stripeAccountId ? "outline" : "default"}
                >
                  {session?.user?.stripeAccountId ? "Gerer" : "Configurer"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transaction history */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Historique des transactions</CardTitle>
              <CardDescription className="text-gray-500">Toutes vos operations de credits</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <p className="text-gray-500">Aucune transaction pour le moment</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                          <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                          <th className="text-right py-3 px-2 text-gray-500 font-medium">Montant</th>
                          <th className="text-right py-3 px-2 text-gray-500 font-medium">Solde</th>
                          <th className="text-left py-3 px-2 text-gray-500 font-medium">Raison</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => {
                          const typeInfo = TYPE_LABELS[tx.type] || { label: tx.type, color: "bg-gray-100 text-gray-700" };
                          const isPositive = tx.type === "PURCHASE" || tx.type === "REFUND" || tx.type === "ADMIN_GRANT";

                          return (
                            <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                              <td className="py-3 px-2 text-gray-600 whitespace-nowrap">
                                {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3 px-2">
                                <Badge className={`${typeInfo.color} border-0 text-xs`}>
                                  {typeInfo.label}
                                </Badge>
                              </td>
                              <td className={`py-3 px-2 text-right font-medium whitespace-nowrap ${
                                isPositive ? "text-emerald-600" : "text-red-500"
                              }`}>
                                {isPositive ? "+" : "-"}{tx.amount}
                              </td>
                              <td className="py-3 px-2 text-right text-gray-600">
                                {tx.balanceAfter}
                              </td>
                              <td className="py-3 px-2 text-gray-500 max-w-[200px] truncate">
                                {tx.reason || "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="rounded-lg"
                      >
                        Precedent
                      </Button>
                      <span className="flex items-center text-sm text-gray-500 px-3">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className="rounded-lg"
                      >
                        Suivant
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Balance card */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0 shadow-lg shadow-orange-500/20 rounded-xl">
            <CardContent className="p-6">
              <p className="text-orange-100 text-sm">Solde disponible</p>
              <p className="text-4xl font-bold font-display mt-2">
                {credits.toLocaleString("fr-FR")}
              </p>
              <p className="text-orange-200 text-sm mt-1">credits</p>
              {isTestMode && (
                <Badge className="mt-3 bg-white/20 text-white border-0 text-xs">
                  Mode test - Credits illimites
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Comment ca marche ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-600">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">1</span>
                <p>Rechargez votre compte en credits</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">2</span>
                <p>Importez vos photos (1 photo = 1 credit)</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">3</span>
                <p>L&apos;IA analyse automatiquement vos photos</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">↩</span>
                <p>Credits rembourses si aucun dossard detecte</p>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Besoin d&apos;aide ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a
                href="#"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
                <span className="text-gray-700">FAQ Credits</span>
              </a>
              <a
                href="/contact"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <span className="text-gray-700">Contacter le support</span>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
