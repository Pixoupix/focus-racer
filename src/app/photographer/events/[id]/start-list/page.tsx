"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface StartListEntry {
  id: string;
  bibNumber: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

interface ParsedEntry {
  bibNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export default function StartListPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<StartListEntry[]>([]);
  const [preview, setPreview] = useState<ParsedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [eventName, setEventName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Connector state
  interface ConnectorInfo {
    id: string;
    name: string;
    description: string;
    requiredFields: Array<{ key: string; label: string; placeholder: string; type?: string }>;
  }
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [connectorConfig, setConnectorConfig] = useState<Record<string, string>>({});
  const [isConnectorImporting, setIsConnectorImporting] = useState(false);

  const fetchEntries = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}/start-list`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error("Error fetching start list:", error);
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
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const fetchConnectors = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${id}/connectors`);
      if (response.ok) {
        setConnectors(await response.json());
      }
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEntries();
      fetchEventName();
      fetchConnectors();
    }
  }, [status, fetchEntries, fetchEventName, fetchConnectors]);

  const normalizeHeader = (header: string): string => {
    const h = header.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (h.includes("dossard") || h.includes("bib") || h === "n°" || h === "no" || h === "numero" || h === "number") return "bibNumber";
    if (h.includes("prenom") || h === "first" || h === "firstname" || h === "first_name" || h === "first name") return "firstName";
    if (h.includes("nom") || h === "last" || h === "lastname" || h === "last_name" || h === "last name" || h === "name") return "lastName";
    if (h.includes("email") || h.includes("mail") || h.includes("courriel")) return "email";
    return h;
  };

  const parseRows = (rows: Record<string, string>[]): ParsedEntry[] => {
    return rows
      .map((row) => {
        const mapped: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          mapped[normalizeHeader(key)] = value;
        }
        return {
          bibNumber: mapped.bibNumber || "",
          firstName: mapped.firstName || "",
          lastName: mapped.lastName || "",
          email: mapped.email || undefined,
        };
      })
      .filter((e) => e.bibNumber && (e.firstName || e.lastName));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = parseRows(results.data as Record<string, string>[]);
          setPreview(parsed);
          if (parsed.length === 0) {
            toast({
              title: "Aucune entrée valide",
              description: "Vérifiez que le fichier contient les colonnes : dossard, prénom, nom",
              variant: "destructive",
            });
          }
        },
        error: () => {
          toast({ title: "Erreur de lecture du fichier CSV", variant: "destructive" });
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, { defval: "" });
        const parsed = parseRows(rows);
        setPreview(parsed);
        if (parsed.length === 0) {
          toast({
            title: "Aucune entrée valide",
            description: "Vérifiez que le fichier contient les colonnes : dossard, prénom, nom",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: "Format non supporté",
        description: "Utilisez un fichier CSV ou Excel (.xlsx, .xls)",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) return;
    setIsImporting(true);
    try {
      const response = await fetch(`/api/events/${id}/start-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: preview }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Import réussi",
          description: `${data.imported} entrée(s) importée(s)${data.failed > 0 ? `, ${data.failed} erreur(s)` : ""}`,
        });
        setPreview([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchEntries();
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur d'import", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConnectorImport = async () => {
    if (!selectedConnector) return;
    setIsConnectorImporting(true);
    try {
      const response = await fetch(`/api/events/${id}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorId: selectedConnector,
          config: connectorConfig,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Import réussi",
          description: data.message,
        });
        setSelectedConnector(null);
        setConnectorConfig({});
        fetchEntries();
      } else {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur de connexion", variant: "destructive" });
    } finally {
      setIsConnectorImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Supprimer toute la start-list ? Cette action est irréversible.")) return;
    try {
      const response = await fetch(`/api/events/${id}/start-list`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Start-list supprimée" });
        setEntries([]);
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const filteredEntries = searchFilter
    ? entries.filter(
        (e) =>
          e.bibNumber.includes(searchFilter) ||
          e.firstName.toLowerCase().includes(searchFilter.toLowerCase()) ||
          e.lastName.toLowerCase().includes(searchFilter.toLowerCase())
      )
    : entries;

  return (
    <div className="p-8 max-w-4xl animate-fade-in">
      <Link
        href={`/photographer/events/${id}`}
        className="text-orange hover:text-orange-dark transition-colors mb-4 inline-block"
      >
        &larr; Retour a {eventName || "l'evenement"}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Start-List</h1>

        {/* Import section */}
        <Card className="mb-8 bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle>Importer une start-list</CardTitle>
            <CardDescription>
              Importez un fichier CSV ou Excel avec les colonnes : Dossard, Prénom, Nom, Email (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Fichier CSV ou Excel</Label>
              <Input
                ref={fileInputRef}
                id="file"
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleFileChange}
              />
            </div>

            {preview.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    <Badge variant="secondary">{preview.length}</Badge> entrée(s) détectée(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPreview([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      Annuler
                    </Button>
                    <Button size="sm" onClick={handleImport} disabled={isImporting} className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200">
                      {isImporting ? "Import en cours..." : "Importer"}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dossard</TableHead>
                        <TableHead>Prénom</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.slice(0, 50).map((entry, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{entry.bibNumber}</TableCell>
                          <TableCell>{entry.firstName}</TableCell>
                          <TableCell>{entry.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{entry.email || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {preview.length > 50 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            ... et {preview.length - 50} autres entrées
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connectors */}
        {connectors.length > 0 && (
          <Card className="mb-8 bg-white border-0 shadow-sm rounded-2xl">
            <CardHeader>
              <CardTitle>Importer depuis une plateforme</CardTitle>
              <CardDescription>
                Connectez-vous à une plateforme d&apos;inscription pour importer automatiquement la start-list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => {
                      setSelectedConnector(
                        selectedConnector === connector.id ? null : connector.id
                      );
                      setConnectorConfig({});
                    }}
                    className={`text-left p-4 rounded-lg border-2 transition-colors ${
                      selectedConnector === connector.id
                        ? "border-orange bg-orange-50"
                        : "border-orange/20 hover:border-orange/40"
                    }`}
                  >
                    <p className="font-medium text-sm">{connector.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{connector.description}</p>
                  </button>
                ))}
              </div>

              {selectedConnector && (() => {
                const connector = connectors.find((c) => c.id === selectedConnector);
                if (!connector) return null;
                return (
                  <div className="space-y-4 border-t pt-4">
                    <p className="text-sm font-medium">Configuration — {connector.name}</p>
                    {connector.requiredFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-sm">{field.label}</Label>
                        <Input
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          value={connectorConfig[field.key] || ""}
                          onChange={(e) =>
                            setConnectorConfig((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleConnectorImport}
                        disabled={isConnectorImporting}
                        size="sm"
                        className="bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200"
                      >
                        {isConnectorImporting ? "Import en cours..." : "Importer"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedConnector(null);
                          setConnectorConfig({});
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Current start list */}
        <Card className="bg-white border-0 shadow-sm rounded-2xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  Start-list actuelle
                  <Badge variant="secondary" className="ml-2">{entries.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Liste des coureurs inscrits pour cet événement
                </CardDescription>
              </div>
              {entries.length > 0 && (
                <Button variant="outline" size="sm" className="text-red-600" onClick={handleDeleteAll}>
                  Tout supprimer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Aucune start-list importée. Utilisez le formulaire ci-dessus pour importer un fichier.
              </p>
            ) : (
              <div className="space-y-4">
                <Input
                  placeholder="Rechercher par dossard, nom ou prénom..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="max-w-sm"
                />
                <div className="border rounded-xl overflow-hidden max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dossard</TableHead>
                        <TableHead>Prénom</TableHead>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">#{entry.bibNumber}</TableCell>
                          <TableCell>{entry.firstName}</TableCell>
                          <TableCell>{entry.lastName}</TableCell>
                          <TableCell className="text-muted-foreground">{entry.email || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredEntries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Aucun résultat
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
