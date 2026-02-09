import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const plans = [
  {
    name: "Coureur",
    description: "Retrouvez et achetez vos photos de course",
    price: "Gratuit",
    priceDetail: "Paiement a la photo",
    features: [
      "Recherche par dossard illimitee",
      "Recherche par selfie (IA)",
      "Telechargement HD sans filigrane",
      "Acces a vie aux photos achetees",
    ],
    cta: "Trouver mes photos",
    href: "/runner",
    popular: false,
  },
  {
    name: "Photographe",
    description: "Vendez vos photos de courses sportives",
    price: "0€",
    priceDetail: "15% de commission",
    features: [
      "Upload illimite de photos",
      "Detection automatique des dossards",
      "Galerie personnalisee",
      "Mode Live pour upload en direct",
      "Statistiques detaillees",
      "Paiement via Stripe Connect",
    ],
    cta: "Commencer gratuitement",
    href: "/register",
    popular: true,
  },
  {
    name: "Organisateur",
    description: "Gerez les photos de vos evenements",
    price: "Sur mesure",
    priceDetail: "Contactez-nous",
    features: [
      "Tout ce que Photographe inclut",
      "Multi-photographes par event",
      "Branding personnalise",
      "Acces a la marketplace",
      "Support prioritaire",
      "Facturation entreprise",
    ],
    cta: "Nous contacter",
    href: "/contact",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="gradient-bg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
          <div className="relative container mx-auto px-4 py-16 md:py-20 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in">
              Tarifs simples et transparents
            </h1>
            <p className="text-white/70 max-w-lg mx-auto animate-fade-in animation-delay-100">
              Pas d&apos;abonnement, pas de frais caches. Payez uniquement ce que vous utilisez.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="py-16 md:py-24 gradient-bg-subtle">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan) => (
                <Card
                  key={plan.name}
                  className={`glass-card rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-glass-lg ${
                    plan.popular ? "ring-2 ring-orange shadow-orange-lg" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-xl bg-orange text-white px-3 py-1">
                        Populaire
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl text-navy">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-4xl font-bold text-navy">{plan.price}</p>
                      <p className="text-sm text-muted-foreground">{plan.priceDetail}</p>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <svg
                            className="w-5 h-5 text-orange flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-navy/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={plan.href}>
                      <Button
                        className={`w-full ${
                          plan.popular
                            ? "bg-orange hover:bg-orange-dark text-white shadow-orange"
                            : "bg-white border border-orange/30 text-orange hover:bg-orange-50"
                        } transition-all duration-200`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ preview */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-navy mb-4">
              Des questions ?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Notre equipe est la pour vous aider. N&apos;hesitez pas a nous contacter.
            </p>
            <Link href="/contact">
              <Button className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                Nous contacter
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
