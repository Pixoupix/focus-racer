"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function CheckoutCancelPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <div className="min-h-screen gradient-bg-subtle flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl pt-24">
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-amber-600">!</span>
          </div>
          <h1 className="text-2xl font-bold text-navy mb-2">Paiement annule</h1>
          <p className="text-muted-foreground">Votre paiement n&apos;a pas ete effectue</p>
        </div>

        <Card className="glass-card rounded-2xl animate-fade-in">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Vos photos favorites sont toujours sauvegardees. Vous pouvez reprendre votre achat a tout moment.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href={`/events/${id}/checkout`}>
                <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">Reessayer le paiement</Button>
              </Link>
              <Link href={`/events/${id}/favorites`}>
                <Button variant="outline" className="border-orange text-orange hover:bg-orange-50 transition-all duration-200">Retour aux favoris</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
