"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

const PACK_TYPES = [
  { value: "SINGLE", label: "Photo unitaire", defaultQty: 1 },
  { value: "PACK_5", label: "Pack 5 photos", defaultQty: 5 },
  { value: "PACK_10", label: "Pack 10 photos", defaultQty: 10 },
  { value: "ALL_INCLUSIVE", label: "All-Inclusive (toutes les photos)", defaultQty: null },
];

interface PricePack {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number | null;
  isActive: boolean;
}

export default function PacksPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const [packs, setPacks] = useState<PricePack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [eventName, setEventName] = useState("");

  // New pack form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("SINGLE");
  const [newPrice, setNewPrice] = useState("");
  const [newQuantity, setNewQuantity] = useState("1");
  const [isCreating, setIsCreating] = useState(false);

  const fetchPacks = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}/packs`);
      if (response.ok) {
        setPacks(await response.json());
      }
    } catch (error) {
      console.error("Error fetching packs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchEventName = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}`);
      if (response.ok) {
        const data = await response.json();
        setEventName(data.name);
      }
    } catch (error) {
      console.error("Error fetching event:", error);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPacks();
      fetchEventName();
    }
  }, [status, fetchPacks, fetchEventName]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const packType = PACK_TYPES.find((p) => p.value === newType);
      const response = await fetch(`/api/events/${id}/packs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          type: newType,
          price: parseFloat(newPrice),
          quantity: newType === "ALL_INCLUSIVE" ? null : parseInt(newQuantity) || packType?.defaultQty,
        }),
      });
      if (response.ok) {
        toast({ title: "Pack créé" });
        setNewName("");
        setNewPrice("");
        setNewQuantity("1");
        fetchPacks();
      } else {
        const data = await response.json();
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (pack: PricePack) => {
    try {
      const response = await fetch(`/api/events/${id}/packs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id, isActive: !pack.isActive }),
      });
      if (response.ok) fetchPacks();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleDelete = async (packId: string) => {
    if (!confirm("Supprimer ce pack ?")) return;
    try {
      const response = await fetch(`/api/events/${id}/packs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      if (response.ok) {
        toast({ title: "Pack supprimé" });
        fetchPacks();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  // Auto-fill name and quantity when type changes
  const handleTypeChange = (type: string) => {
    setNewType(type);
    const packType = PACK_TYPES.find((p) => p.value === type);
    if (packType) {
      if (!newName) setNewName(packType.label);
      setNewQuantity(packType.defaultQty?.toString() || "");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <Link
        href={`/photographer/events/${id}`}
        className="text-orange hover:text-orange-dark transition-colors mb-4 inline-block"
      >
        &larr; Retour a {eventName || "l'evenement"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Packs de vente</h1>

        {/* Create pack form */}
        <Card className="mb-8 bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">Créer un pack</CardTitle>
            <CardDescription>Définissez vos offres commerciales pour cet événement</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type de pack</Label>
                  <Select value={newType} onValueChange={handleTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PACK_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-name">Nom du pack *</Label>
                  <Input
                    id="pack-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="ex: Photo unitaire HD"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pack-price">Prix (EUR) *</Label>
                  <Input
                    id="pack-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    placeholder="9.99"
                    required
                  />
                </div>
                {newType !== "ALL_INCLUSIVE" && (
                  <div className="space-y-2">
                    <Label htmlFor="pack-qty">Nombre de photos</Label>
                    <Input
                      id="pack-qty"
                      type="number"
                      min="1"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <Button type="submit" disabled={isCreating} className="bg-orange hover:bg-orange-hover text-white shadow-orange transition-all duration-200">
                {isCreating ? "Création..." : "Créer le pack"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Packs list */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-navy">
              Packs existants
              <Badge variant="secondary" className="ml-2">{packs.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {packs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucun pack créé. Utilisez le formulaire ci-dessus.
              </p>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Quantité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packs.map((pack) => (
                      <TableRow key={pack.id}>
                        <TableCell className="font-medium">{pack.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-orange/30 text-orange">
                            {PACK_TYPES.find((p) => p.value === pack.type)?.label || pack.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{pack.price.toFixed(2)} &euro;</TableCell>
                        <TableCell>{pack.quantity ?? "Illimité"}</TableCell>
                        <TableCell>
                          <Badge variant={pack.isActive ? "default" : "secondary"} className={pack.isActive ? "bg-orange" : ""}>
                            {pack.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(pack)}
                            >
                              {pack.isActive ? "Désactiver" : "Activer"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleDelete(pack.id)}
                            >
                              Supprimer
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
