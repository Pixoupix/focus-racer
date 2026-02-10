"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-helpers";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      toast({
        title: "Profil mis a jour",
        description: "Vos informations ont ete enregistrees.",
      });
      await update();
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-gray-900">Parametres</h1>
        <p className="text-gray-500 mt-1">Gerez votre compte et vos preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Profil</CardTitle>
            <CardDescription className="text-gray-500">Vos informations personnelles</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-orange">
                  {session?.user?.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2) || "?"}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{session?.user?.name}</p>
                  <span className="inline-block mt-1 text-xs font-medium bg-orange-50 text-orange px-2.5 py-1 rounded-md">
                    {getRoleLabel(session?.user?.role || "")}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700">Nom complet</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-gray-700">Societe</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Votre entreprise"
                    className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700">Telephone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-orange hover:bg-orange-hover text-white rounded-lg shadow-orange transition-all duration-200"
                >
                  {isLoading ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Mot de passe</CardTitle>
            <CardDescription className="text-gray-500">Modifiez votre mot de passe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password" className="text-gray-700">Mot de passe actuel</Label>
                <Input
                  id="current-password"
                  type="password"
                  className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-gray-700">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-700">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  className="bg-gray-50 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange/20 focus:border-orange"
                />
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  className="text-orange border-orange/30 hover:bg-orange-50 rounded-lg"
                >
                  Modifier le mot de passe
                </Button>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-display text-gray-900">Notifications</CardTitle>
            <CardDescription className="text-gray-500">Configurez vos preferences de notification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { id: "orders", label: "Nouvelles commandes", desc: "Recevez un email a chaque vente" },
                { id: "marketing", label: "Newsletter", desc: "Actualites et conseils Focus Racer" },
                { id: "marketplace", label: "Marketplace", desc: "Nouvelles opportunites correspondant a votre profil" },
              ].map((notif) => (
                <div key={notif.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{notif.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{notif.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="bg-white border-0 shadow-card rounded-xl border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="text-lg font-display text-red-600">Zone de danger</CardTitle>
            <CardDescription className="text-gray-500">Actions irreversibles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-red-50">
              <div>
                <p className="font-medium text-gray-900 text-sm">Supprimer mon compte</p>
                <p className="text-xs text-gray-500 mt-0.5">Cette action est irreversible et supprimera toutes vos donnees.</p>
              </div>
              <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-100 rounded-lg">
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
