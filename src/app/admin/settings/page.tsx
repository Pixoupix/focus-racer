"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Upload } from "lucide-react";

interface WatermarkSettings {
  id: string;
  watermarkPath: string | null;
  watermarkOpacity: number;
  updatedAt: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<WatermarkSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [opacity, setOpacity] = useState(0.3);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings/watermark")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setOpacity(data.watermarkOpacity ?? 0.3);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      formData.append("opacity", opacity.toString());

      const res = await fetch("/api/admin/settings/watermark", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }

      const data = await res.json();
      setSettings(data);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setMessage({ type: "success", text: "Watermark mis a jour" });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Erreur" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer le watermark custom ? Le watermark par defaut sera utilise.")) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings/watermark", { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur");

      const data = await res.json();
      setSettings(data);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessage({ type: "success", text: "Watermark supprime, retour au defaut" });
    } catch {
      setMessage({ type: "error", text: "Erreur lors de la suppression" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">Reglages</h1>
        <p className="text-muted-foreground">Configuration globale de la plateforme</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
          message.type === "success"
            ? "bg-emerald-50 text-emerald-700 border border-emerald"
            : "bg-red-50 text-red-700 border border-red-500"
        }`}>
          {message.text}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Watermark</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current status */}
          {settings?.watermarkPath ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Watermark custom actif :</p>
              <div
                className="inline-block p-4 rounded-xl"
                style={{
                  backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.watermarkPath}
                  alt="Watermark actuel"
                  className="max-w-xs max-h-48 object-contain"
                />
              </div>
              <div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Supprimer
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-xl text-sm text-muted-foreground">
              Watermark par defaut : <strong>FOCUS RACER</strong> (texte repete en diagonale)
            </div>
          )}

          {/* Upload new */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {settings?.watermarkPath ? "Remplacer le watermark" : "Uploader un watermark custom"}
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                Image PNG avec transparence recommandee. Le watermark sera etire sur toute la photo.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>

            {previewUrl && (
              <div
                className="inline-block p-4 rounded-xl"
                style={{
                  backgroundImage: "repeating-conic-gradient(#e5e7eb 0% 25%, transparent 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Apercu"
                  className="max-w-xs max-h-48 object-contain"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opacite : {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full max-w-xs accent-emerald-600"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || (!selectedFile && opacity === (settings?.watermarkOpacity ?? 0.3))}
              className="bg-emerald hover:bg-emerald-dark"
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Mettre a jour
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
