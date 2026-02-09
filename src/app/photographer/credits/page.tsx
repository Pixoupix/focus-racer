"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CreditsPage() {
  const { data: session } = useSession();

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Credits & Facturation</h1>
        <p className="text-gray-500 mt-1">Gerez vos paiements et factures</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Account summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current plan */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-display text-gray-900">Votre compte</CardTitle>
                  <CardDescription className="text-gray-500">Plan actuel et utilisation</CardDescription>
                </div>
                <span className="text-xs font-medium bg-blue-50 text-blue px-3 py-1.5 rounded-lg">
                  Gratuit
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Evenements</p>
                  <p className="text-2xl font-bold font-display text-gray-900 mt-1">Illimite</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Photos</p>
                  <p className="text-2xl font-bold font-display text-gray-900 mt-1">Illimite</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">Commission</p>
                  <p className="text-2xl font-bold font-display text-orange mt-1">15%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Connect */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Compte Stripe</CardTitle>
              <CardDescription className="text-gray-500">Recevez vos paiements directement</CardDescription>
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
                      ? "text-blue border-blue hover:bg-blue-50 rounded-lg"
                      : "bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange"
                  }
                  variant={session?.user?.stripeAccountId ? "outline" : "default"}
                >
                  {session?.user?.stripeAccountId ? "Gerer" : "Configurer"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card className="bg-white border-0 shadow-card rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg font-display text-gray-900">Transactions recentes</CardTitle>
              <CardDescription className="text-gray-500">Vos derniers paiements recus</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <p className="text-gray-500">Aucune transaction pour le moment</p>
                <p className="text-sm text-gray-400 mt-1">Les paiements apparaitront ici une fois que vous aurez des ventes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Balance */}
          <Card className="bg-gradient-to-br from-blue to-blue-700 text-white border-0 shadow-blue rounded-xl">
            <CardContent className="p-6">
              <p className="text-blue-100 text-sm">Solde disponible</p>
              <p className="text-4xl font-bold font-display mt-2">0.00€</p>
              <p className="text-blue-100 text-sm mt-4">Prochain virement: --</p>
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
                <span className="text-gray-700">FAQ Paiements</span>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="text-gray-700">Telecharger mes factures</span>
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
