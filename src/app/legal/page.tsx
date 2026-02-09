import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LegalPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-16 gradient-bg-subtle">
        <div className="container mx-auto px-4 py-12 max-w-4xl animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-navy mb-8 text-center">
            Mentions legales
          </h1>

          <div className="space-y-8">
            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-navy">Editeur du site</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="text-navy/80">
                  <strong>Focus Racer</strong><br />
                  SAS au capital de 10 000 euros<br />
                  Siege social : [Adresse]<br />
                  RCS : [Numero RCS]<br />
                  SIRET : [Numero SIRET]<br />
                  TVA intracommunautaire : [Numero TVA]
                </p>
                <p className="text-navy/80">
                  <strong>Directeur de la publication :</strong> [Nom du directeur]<br />
                  <strong>Contact :</strong> contact@focusracer.com
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-navy">Hebergement</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none">
                <p className="text-navy/80">
                  Le site Focus Racer est heberge par :<br />
                  <strong>Vercel Inc.</strong><br />
                  340 S Lemon Ave #4133<br />
                  Walnut, CA 91789<br />
                  United States
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-navy">Conditions generales d&apos;utilisation</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none space-y-4">
                <p className="text-navy/80">
                  L&apos;utilisation du site Focus Racer implique l&apos;acceptation pleine et entiere
                  des conditions generales d&apos;utilisation decrites ci-dessous.
                </p>
                <h4 className="text-navy font-semibold">1. Objet</h4>
                <p className="text-navy/80">
                  Focus Racer est une plateforme de mise en relation entre photographes sportifs
                  et participants de courses a pied, trails, triathlons et autres evenements sportifs.
                </p>
                <h4 className="text-navy font-semibold">2. Services proposes</h4>
                <p className="text-navy/80">
                  La plateforme permet aux photographes de publier leurs photos d&apos;evenements sportifs
                  et aux coureurs de retrouver et acheter leurs photos grace a un systeme de
                  reconnaissance automatique des numeros de dossard.
                </p>
                <h4 className="text-navy font-semibold">3. Propriete intellectuelle</h4>
                <p className="text-navy/80">
                  Les photographes conservent l&apos;integralite de leurs droits d&apos;auteur sur les
                  photos publiees. L&apos;achat d&apos;une photo confere a l&apos;acheteur un droit d&apos;usage
                  personnel et non commercial.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-navy">Conditions generales de vente</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none space-y-4">
                <h4 className="text-navy font-semibold">1. Prix</h4>
                <p className="text-navy/80">
                  Les prix des photos sont fixes librement par chaque photographe.
                  Ils sont indiques en euros TTC.
                </p>
                <h4 className="text-navy font-semibold">2. Paiement</h4>
                <p className="text-navy/80">
                  Le paiement s&apos;effectue en ligne par carte bancaire via notre prestataire
                  de paiement securise Stripe.
                </p>
                <h4 className="text-navy font-semibold">3. Livraison</h4>
                <p className="text-navy/80">
                  Les photos sont disponibles au telechargement immediatement apres le paiement,
                  en haute resolution et sans filigrane.
                </p>
                <h4 className="text-navy font-semibold">4. Droit de retractation</h4>
                <p className="text-navy/80">
                  Conformement a l&apos;article L221-28 du Code de la consommation, le droit de
                  retractation ne s&apos;applique pas aux contenus numeriques fournis sur un
                  support immateriel dont l&apos;execution a commence avec l&apos;accord du consommateur.
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-navy">Protection des donnees personnelles</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none space-y-4">
                <p className="text-navy/80">
                  Conformement au Reglement General sur la Protection des Donnees (RGPD),
                  vous disposez d&apos;un droit d&apos;acces, de rectification, de suppression et de
                  portabilite de vos donnees personnelles.
                </p>
                <p className="text-navy/80">
                  Pour exercer ces droits, vous pouvez utiliser notre formulaire de demande RGPD
                  ou nous contacter directement a l&apos;adresse : dpo@focusracer.com
                </p>
                <p className="text-navy/80">
                  Les donnees collectees sont utilisees uniquement pour le fonctionnement du
                  service et ne sont jamais vendues a des tiers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
