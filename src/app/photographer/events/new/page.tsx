"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const SPORT_TYPES = [
  { value: "RUNNING", label: "Course a pied" },
  { value: "TRAIL", label: "Trail" },
  { value: "TRIATHLON", label: "Triathlon" },
  { value: "CYCLING", label: "Cyclisme" },
  { value: "SWIMMING", label: "Natation" },
  { value: "OBSTACLE", label: "Course a obstacles" },
  { value: "OTHER", label: "Autre" },
];

export default function NewEventPage() {
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sportType, setSportType] = useState("RUNNING");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const date = formData.get("date") as string;
    const location = formData.get("location") as string;
    const description = formData.get("description") as string;

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          date,
          location,
          description,
          sportType,
          status: "DRAFT",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de creer l'evenement",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Evenement cree",
          description: "Vous pouvez maintenant ajouter des photos",
        });
        router.push(`/photographer/events/${data.id}`);
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

  return (
    <div className="p-8 max-w-2xl animate-fade-in">
      <Link
        href="/photographer/events"
        className="text-blue hover:text-blue-700 transition-colors mb-4 inline-block"
      >
        &larr; Retour aux evenements
      </Link>

      <Card className="bg-white border-0 shadow-card rounded-xl">
          <CardHeader>
            <CardTitle className="text-gray-900 font-display">Creer un evenement</CardTitle>
            <CardDescription>
              Renseignez les informations de la course ou de l&apos;evenement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;evenement *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Marathon de Paris 2024"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" name="date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sportType">Type de sport</Label>
                  <Select value={sportType} onValueChange={setSportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un sport" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORT_TYPES.map((sport) => (
                        <SelectItem key={sport.value} value={sport.value}>
                          {sport.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Paris, France"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  name="description"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Decrivez votre evenement (parcours, categories, ambiance...)"
                />
              </div>

              <div className="flex gap-4">
                <Link href="/photographer/events" className="flex-1">
                  <Button type="button" variant="outline" className="w-full text-gray-600 border-gray-200 hover:bg-gray-50 rounded-lg transition-all duration-200">
                    Annuler
                  </Button>
                </Link>
                <Button type="submit" className="flex-1 bg-orange hover:bg-orange-hover text-white shadow-orange rounded-lg transition-all duration-200" disabled={isLoading}>
                  {isLoading ? "Creation..." : "Creer l'evenement"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
