"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPES = [
  {
    role: "RUNNER",
    title: "Coureur",
    description: "Retrouvez et achetez vos photos de course",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      </svg>
    ),
  },
  {
    role: "PHOTOGRAPHER",
    title: "Photographe",
    description: "Uploadez et vendez vos photos de course",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
  },
  {
    role: "ORGANIZER",
    title: "Organisateur",
    description: "Gerez les photos de vos evenements sportifs",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" />
      </svg>
    ),
  },
  {
    role: "AGENCY",
    title: "Agence",
    description: "Gerez plusieurs photographes et evenements",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    role: "CLUB",
    title: "Club",
    description: "Gerez les photos de votre club sportif",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    role: "FEDERATION",
    title: "Federation",
    description: "Pilotez les photos a l'echelle federale",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    ),
  },
];

const REFERRAL_SOURCES = [
  { value: "word_of_mouth", label: "Bouche a oreille" },
  { value: "google", label: "Recherche Google" },
  { value: "social_media", label: "Reseaux sociaux" },
  { value: "event", label: "Salon / Evenement" },
  { value: "friend", label: "Ami / Collegue" },
  { value: "other", label: "Autre" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedCgu, setAcceptedCgu] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [referralSource, setReferralSource] = useState("");

  const isProRole = ["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION"].includes(selectedRole);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!acceptedCgu) {
      toast({
        title: "CGU requises",
        description: "Vous devez accepter les Conditions Generales d'Utilisation",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const phone = formData.get("phone") as string;
    const company = formData.get("company") as string;
    const postalCode = formData.get("postalCode") as string;
    const city = formData.get("city") as string;
    const portfolio = formData.get("portfolio") as string;

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          role: selectedRole,
          phone: phone || undefined,
          company: company || undefined,
          postalCode: postalCode || undefined,
          city: city || undefined,
          portfolio: portfolio || undefined,
          referralSource: referralSource || undefined,
          acceptedCgu,
          newsletterOptIn,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erreur d'inscription",
          description: data.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Inscription reussie",
          description: "Bienvenue sur Focus Racer !",
        });
        // Auto-login after registration
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!result?.error) {
          if (selectedRole === "RUNNER") {
            router.push("/runner");
          } else {
            router.push("/photographer/dashboard");
          }
        }
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "bg-white/50 border-white/30 focus:border-emerald focus:ring-emerald";

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
      <div className="w-full max-w-2xl relative animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-emerald flex items-center justify-center shadow-emerald">
              <span className="text-white font-bold">FR</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">
            Focus <span className="text-emerald-light">Racer</span>
          </h1>
          <p className="text-white/60 mt-2">Creez votre compte</p>
        </div>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-center mb-6 text-white">
              Quel type de compte souhaitez-vous creer ?
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {ACCOUNT_TYPES.map((type) => (
                <div
                  key={type.role}
                  className={`glass-card rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-glass-lg ${
                    selectedRole === type.role
                      ? "ring-2 ring-emerald shadow-emerald-lg border-emerald/30"
                      : "border-white/20"
                  }`}
                  onClick={() => setSelectedRole(type.role)}
                >
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-200 ${
                      selectedRole === type.role
                        ? "bg-emerald text-white"
                        : "bg-emerald-50 text-emerald"
                    }`}>
                      {type.icon}
                    </div>
                    <h3 className="font-semibold text-navy text-lg">{type.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button
                size="lg"
                disabled={!selectedRole}
                onClick={() => setStep(2)}
                className="bg-white text-navy hover:bg-white/90 shadow-glass-lg px-8 transition-all duration-200"
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <Card className="glass-card rounded-2xl border-white/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="text-emerald hover:text-emerald-dark text-sm transition-colors"
                >
                  &larr; Retour
                </button>
              </div>
              <CardTitle className="text-navy">Creer un compte</CardTitle>
              <CardDescription>
                Remplissez le formulaire pour creer votre compte {ACCOUNT_TYPES.find(t => t.role === selectedRole)?.title}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                {/* Row 1: Prenom + Nom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      placeholder="Jean"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      placeholder="Dupont"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Row 2: Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vous@example.com"
                    required
                    className={inputClass}
                  />
                </div>

                {/* Row 3: Mot de passe */}
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 6 caracteres</p>
                </div>

                {/* Row 4: Telephone + Societe */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      className={inputClass}
                    />
                  </div>
                  {isProRole && (
                    <div className="space-y-2">
                      <Label htmlFor="company">Societe / Organisation</Label>
                      <Input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Nom de votre entreprise"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>

                {/* Row 5: Code postal + Ville */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Code postal</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      type="text"
                      placeholder="75001"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="Paris"
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Row 6: Portfolio (pro only) */}
                {isProRole && (
                  <div className="space-y-2">
                    <Label htmlFor="portfolio">Site web / Portfolio</Label>
                    <Input
                      id="portfolio"
                      name="portfolio"
                      type="url"
                      placeholder="https://www.monsite.com"
                      className={inputClass}
                    />
                  </div>
                )}

                {/* Row 7: Referral source */}
                <div className="space-y-2">
                  <Label>Comment avez-vous connu Focus Racer ?</Label>
                  <Select value={referralSource} onValueChange={setReferralSource}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Selectionnez une option" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Row 8: CGU */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptedCgu"
                    checked={acceptedCgu}
                    onChange={(e) => setAcceptedCgu(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <Label htmlFor="acceptedCgu" className="text-sm cursor-pointer leading-relaxed">
                    J&apos;accepte les{" "}
                    <Link href="/legal" className="text-emerald underline hover:text-emerald-dark" target="_blank">
                      Conditions Generales d&apos;Utilisation
                    </Link>{" "}
                    *
                  </Label>
                </div>

                {/* Row 9: Newsletter */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="newsletterOptIn"
                    checked={newsletterOptIn}
                    onChange={(e) => setNewsletterOptIn(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <Label htmlFor="newsletterOptIn" className="text-sm cursor-pointer leading-relaxed">
                    Je souhaite recevoir la newsletter et les actualites Focus Racer
                  </Label>
                </div>

                {/* Row 10: Submit */}
                <Button
                  type="submit"
                  className="w-full bg-emerald hover:bg-emerald-dark text-white shadow-emerald transition-all duration-200"
                  disabled={isLoading || !acceptedCgu}
                >
                  {isLoading ? "Inscription..." : "Creer mon compte"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center text-sm text-white/60">
          Deja un compte ?{" "}
          <Link href="/login" className="text-emerald-light hover:text-white font-medium transition-colors">
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
