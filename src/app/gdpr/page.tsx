"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function GdprPage() {
  const [type, setType] = useState("DELETION");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [bibNumber, setBibNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/gdpr/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          email: email.trim(),
          name: name.trim(),
          bibNumber: bibNumber.trim() || undefined,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-16 animate-fade-in">
          <div className="container mx-auto px-4 py-12 max-w-lg text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-emerald-600">&#10003;</span>
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2">Demande enregistrée</h1>
            <p className="text-muted-foreground mb-6">
              Votre demande a bien été prise en compte. Conformément au RGPD, nous traiterons votre demande dans un délai maximum de 30 jours. Vous recevrez un email de confirmation.
            </p>
            <Link href="/">
              <Button variant="outline" className="border-orange text-orange hover:bg-orange-50">Retour à l&apos;accueil</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-16 animate-fade-in">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-navy mb-2">Protection des données personnelles</h1>
          <p className="text-muted-foreground mb-8">
            Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d&apos;un droit d&apos;accès, de rectification et de suppression de vos données personnelles.
          </p>

          <Card className="glass-card rounded-2xl">
            <CardHeader>
              <CardTitle>Faire une demande</CardTitle>
              <CardDescription>
                Remplissez le formulaire ci-dessous pour exercer vos droits. Nous traiterons votre demande dans un délai de 30 jours.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de demande</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DELETION">Suppression de mes données et photos</SelectItem>
                      <SelectItem value="ACCESS">Accès à mes données personnelles</SelectItem>
                      <SelectItem value="RECTIFICATION">Rectification de mes données</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jean Dupont"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jean@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bibNumber">Numéro de dossard (si applicable)</Label>
                  <Input
                    id="bibNumber"
                    value={bibNumber}
                    onChange={(e) => setBibNumber(e.target.value)}
                    placeholder="Ex: 1234"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si votre demande concerne des photos spécifiques, indiquez votre numéro de dossard pour accélérer le traitement.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Motif (facultatif)</Label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Décrivez votre demande..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-orange"
                  />
                </div>

                {type === "DELETION" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                    <p className="font-medium mb-1">Attention</p>
                    <p>La suppression de vos données est irréversible. Toutes les photos associées à votre dossard, vos données de start-list et vos informations personnelles seront définitivement supprimées.</p>
                  </div>
                )}

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                <Button type="submit" className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" disabled={isSubmitting}>
                  {isSubmitting ? "Envoi en cours..." : "Soumettre ma demande"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-sm text-muted-foreground space-y-2">
            <p>
              <strong>Focus Racer</strong> s&apos;engage à protéger vos données personnelles conformément au RGPD (Règlement UE 2016/679).
            </p>
            <p>
              Pour toute question relative à la protection de vos données, contactez notre DPO à l&apos;adresse : privacy@focusracer.com
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
