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
                  <strong>OVHcloud</strong><br />
                  2 Rue Kellermann<br />
                  59100 Roubaix, France<br />
                  SAS au capital de 10 174 560 euros
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

            <Card className="glass-card rounded-2xl" id="protection-photos">
              <CardHeader>
                <CardTitle className="text-navy">Protection des photos et droits d&apos;auteur</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none space-y-4">
                <h4 className="text-navy font-semibold">1. Droits d&apos;auteur</h4>
                <p className="text-navy/80">
                  Toutes les photographies publiees sur Focus Racer sont protegees par le droit d&apos;auteur
                  (articles L111-1 et suivants du Code de la propriete intellectuelle). Elles appartiennent
                  exclusivement aux photographes qui les ont publiees.
                </p>
                <p className="text-navy/80">
                  Toute reproduction, representation, modification, publication, adaptation de tout ou
                  partie des photographies, quel que soit le moyen ou le procede utilise, est interdite,
                  sauf autorisation ecrite prealable du photographe titulaire des droits.
                </p>

                <h4 className="text-navy font-semibold">2. Mesures de protection techniques</h4>
                <p className="text-navy/80">
                  Les photographies affichees sur la plateforme sont protegees par des mesures techniques
                  conformement a l&apos;article L331-5 du Code de la propriete intellectuelle :
                </p>
                <ul className="text-navy/80 list-disc pl-6 space-y-1">
                  <li>Filigrane (watermark) visible sur toutes les photos en consultation</li>
                  <li>Resolution reduite (les originaux en haute definition ne sont accessibles qu&apos;apres achat)</li>
                  <li>Protection contre le telechargement non autorise</li>
                  <li>Protection contre l&apos;integration sur des sites tiers (hotlink)</li>
                  <li>Limitation de debit pour prevenir le telechargement automatise</li>
                </ul>
                <p className="text-navy/80">
                  Le contournement de ces mesures de protection est interdit et passible de sanctions
                  penales (article L335-3-1 du Code de la propriete intellectuelle : 3 750 euros d&apos;amende).
                </p>

                <h4 className="text-navy font-semibold">3. Licence d&apos;utilisation</h4>
                <p className="text-navy/80">
                  L&apos;achat d&apos;une photo sur Focus Racer confere a l&apos;acheteur une licence d&apos;utilisation
                  personnelle et non exclusive. Cette licence autorise :
                </p>
                <ul className="text-navy/80 list-disc pl-6 space-y-1">
                  <li>L&apos;impression pour un usage personnel (albums, tirages, cadres)</li>
                  <li>Le partage sur les reseaux sociaux personnels avec mention du photographe</li>
                  <li>L&apos;utilisation dans un contexte prive et non commercial</li>
                </ul>
                <p className="text-navy/80">
                  Sont explicitement interdits : la revente, la redistribution, l&apos;utilisation commerciale
                  (publicite, presse, merchandising), la modification des metadonnees ou la suppression
                  du credit photographe.
                </p>

                <h4 className="text-navy font-semibold">4. Sanctions</h4>
                <p className="text-navy/80">
                  Toute utilisation non autorisee constitue une contrefacon sanctionnee par les
                  articles L335-2 et suivants du Code de la propriete intellectuelle (jusqu&apos;a 300 000
                  euros d&apos;amende et 3 ans d&apos;emprisonnement).
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card rounded-2xl" id="dmca">
              <CardHeader>
                <CardTitle className="text-navy">Procedure de signalement (DMCA / retrait)</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-gray max-w-none space-y-4">
                <p className="text-navy/80">
                  Si vous constatez qu&apos;une photographie vous appartenant est utilisee sur un site
                  tiers sans votre autorisation, ou si vous souhaitez signaler une violation de droits
                  d&apos;auteur, veuillez nous contacter.
                </p>

                <h4 className="text-navy font-semibold">Pour les photographes</h4>
                <p className="text-navy/80">
                  Si vous decouvrez que vos photos Focus Racer sont reproduites illegalement sur un
                  autre site, envoyez-nous les elements suivants a <strong>dmca@focusracer.com</strong> :
                </p>
                <ul className="text-navy/80 list-disc pl-6 space-y-1">
                  <li>Votre identite et vos coordonnees</li>
                  <li>L&apos;URL de votre photo originale sur Focus Racer</li>
                  <li>L&apos;URL du site contrevenant</li>
                  <li>Une capture d&apos;ecran de la violation</li>
                  <li>Une declaration sur l&apos;honneur que vous etes titulaire des droits</li>
                </ul>
                <p className="text-navy/80">
                  Nous adresserons une mise en demeure au site contrevenant sous 48 heures ouvrees.
                </p>

                <h4 className="text-navy font-semibold">Pour les tiers</h4>
                <p className="text-navy/80">
                  Si vous estimez qu&apos;un contenu publie sur Focus Racer porte atteinte a vos droits,
                  envoyez une notification a <strong>dmca@focusracer.com</strong> comprenant :
                </p>
                <ul className="text-navy/80 list-disc pl-6 space-y-1">
                  <li>L&apos;identification precise du contenu litigieux (URL)</li>
                  <li>La justification de vos droits sur ce contenu</li>
                  <li>Vos coordonnees completes</li>
                </ul>
                <p className="text-navy/80">
                  Conformement a l&apos;article 6-I-5 de la loi pour la confiance dans l&apos;economie numerique
                  (LCEN), nous procederons au retrait du contenu litigieux dans les meilleurs delais
                  apres verification de votre demande.
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
