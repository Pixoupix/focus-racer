"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          title: "Erreur de connexion",
          description: result.error,
          variant: "destructive",
        });
      } else {
        // Fetch session to get role for redirect
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const role = session?.user?.role;

        if (role === "ADMIN") {
          router.push("/admin/dashboard");
        } else if (["PHOTOGRAPHER", "ORGANIZER", "AGENCY", "CLUB", "FEDERATION"].includes(role)) {
          router.push("/photographer/dashboard");
        } else {
          router.push("/runner");
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

  return (
    <main className="min-h-screen gradient-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMC41IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
      <div className="w-full max-w-md relative animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center shadow-orange">
              <span className="text-white font-bold">FR</span>
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white mt-4">
            Focus <span className="text-orange-light">Racer</span>
          </h1>
          <p className="text-white/60 mt-2">Connectez-vous a votre compte</p>
        </div>

        <Card className="glass-card rounded-2xl border-white/20">
          <CardHeader>
            <CardTitle className="text-navy">Connexion</CardTitle>
            <CardDescription>
              Entrez vos identifiants pour acceder a votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="vous@example.com"
                  required
                  className="bg-white/50 border-white/30 focus:border-orange focus:ring-orange"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="bg-white/50 border-white/30 focus:border-orange focus:ring-orange"
                />
              </div>
              <Button type="submit" className="w-full bg-orange hover:bg-orange-dark text-white shadow-orange transition-all duration-200" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-orange hover:text-orange-dark font-medium transition-colors">
                Creer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
