# Focus Racer - Journal de projet

> Fichier de suivi des échanges et progressions sur le projet Focus Racer.
> Consulter ce fichier pour se remémorer le contexte, l'architecture et les actions effectuées.

---

## 1. Présentation du projet

**Nom** : Focus Racer
**Version** : 0.9.0 (pré-production — toutes phases complètes, déploiement en cours)
**Type** : Plateforme SaaS B2B2C de tri automatique et vente de photos de courses sportives
**Objectif** : Automatiser le tri des photos par IA (dossard/visage), permettre aux coureurs de retrouver et acheter leurs photos, et offrir aux pros un outil de gestion complet.

### Trois espaces utilisateurs

| Espace | Rôle | Accès | Fonctionnalités clés |
|--------|------|-------|----------------------|
| **Pro** | Photographe, Organisateur, Agence, Club, Fédération | Authentifié | Upload, gestion événements, triage, stats, packs de vente, CRM |
| **Public** | Coureur / Acheteur | Public | Recherche par dossard/selfie/nom, achat, panier, téléchargement |
| **Super Admin** | Administrateur plateforme | Authentifié (rôle admin) | Gestion comptes, stats globales, paiements, data, CA, pilotage |

---

## 2. Cahier des charges V2 — Résumé

> Source : `Cahier des Charges Focus Racer (1).docx`

### Moteur IA (AWS Rekognition cible)
- OCR dossards (DetectText) + filtrage regex via start-list
- Reconnaissance faciale (SearchFaces) si dossard illisible
- Détection vêtements/accessoires (Label Detection) en dernier recours
- Auto-editing (exposition, contraste, netteté)
- Filtrage qualité (photos floues/mal cadrées écartées)
- Watermarking dynamique (logo événement + filigrane)

### Espace Pro
- Profils multi-types (Organisateur, Photographe, Agence, Club, Fédération)
- Dashboard : upload drag&drop, barre de progression, triage manuel
- Import CRM / Start-list (CSV/Excel) : croisement dossard ↔ nom
- Stats : taux d'ouverture mails, vues/photo, abandon panier, CA/événement
- Gestion commerciale : packs personnalisés (unitaire, pack 5, all-inclusive)
- Branding marque blanche par événement
- Module litiges / SAV

### Espace Coureur (Public)
- Recherche : par dossard, par selfie (face search), par nom
- Galerie avec watermark + lazy loading
- Système de favoris, panier, upselling dynamique
- Paiement : Stripe, Apple Pay, Google Pay
- Délivrance : espace "Mes Achats", email, ZIP

### Paiement (Stripe Connect)
- Split payment automatique (ex: 10% plateforme / 90% photographe)
- Facturation au volume pour le service de tri

### Features "Next Gen"
- Sync Chrono (croisement heure photo ↔ temps de passage)
- Détection émotions (sourires, bras levés)
- Recadrage automatique (Smart Crop)
- Social Teaser (vidéo 15s auto-générée)
- Upload Live (tethering cloud pendant la course)
- RGPD natif (signalement, suppression, audit)
- Marketplace photographes ↔ organisateurs

### Architecture cible (AWS)
- S3 (Ingest / Web / Archive Glacier)
- Lambda + Step Functions (traitement parallélisé)
- PostgreSQL (RDS) + DynamoDB (métadonnées images)
- CloudFront CDN (miniatures < 100ms)
- URLs signées S3 (téléchargement temporaire 24h)

---

## 3. Stack technique actuelle

### Frontend
- **Next.js 14.2.0** (App Router) + **React 18.2.0**
- **TypeScript** (mode strict)
- **Tailwind CSS 3.4.1** (dark mode, animations)
- **Radix UI** / **shadcn/ui** pour les composants
- **React Hook Form** + **Zod** pour la validation
- **Lucide React** pour les icônes

### Backend
- **Next.js API Routes** + **Server Actions**
- **Prisma ORM 5.22.0** avec **PostgreSQL** (via Docker)
- **NextAuth.js 4.24.13** (stratégie JWT, credentials, multi-rôles)
- **AWS Rekognition** pour OCR, reconnaissance faciale, détection labels (Tesseract.js en fallback dev uniquement)
- **Sharp 0.33.0** pour le traitement d'images, auto-editing, watermark, version web optimisée
- **Stripe** (Checkout + Payment Element) pour les paiements
- **Resend** pour les emails transactionnels
- **AWS S3** + **CloudFront CDN** (optionnel, fallback local)
- **bcryptjs** pour le hachage des mots de passe

### Infrastructure / Déploiement
- **Docker** multi-stage (Node 20 slim, standalone Next.js)
- **Docker Compose** prod : PostgreSQL 16 + Next.js + Nginx reverse proxy
- **Nginx** : gzip, rate limiting, cache statique, headers sécurité, prêt HTTPS/Let's Encrypt
- **Cible** : Oracle Cloud Free Tier (4 ARM Ampere, 24 GB RAM, gratuit à vie)

### Configuration clé
- Body size limit Server Actions : **10 MB**
- Alias TypeScript : `@/*` → `./src/*`
- Base de données : PostgreSQL via Docker (`docker-compose.yml`)
- Output Next.js : `standalone` (optimisé Docker)
- AI workers : 4-8 concurrent (configurable via `AI_MAX_CONCURRENT`)

---

## 4. Architecture fichiers actuelle

```
Focus Racer/
├── src/
│   ├── app/
│   │   ├── api/                      # Routes API backend
│   │   │   ├── auth/                 # Authentification (NextAuth + register)
│   │   │   ├── events/              # CRUD événements + listing public + connecteurs
│   │   │   ├── photos/             # Upload + recherche dossard/nom/visage
│   │   │   ├── checkout/           # Payment intent (Stripe)
│   │   │   ├── admin/              # APIs admin (GDPR, AI status, analytics)
│   │   │   ├── marketplace/        # Listings, applications, reviews
│   │   │   ├── webhooks/           # Stripe webhooks
│   │   │   └── gdpr/              # RGPD demandes publiques
│   │   ├── photographer/            # Interface photographe (events, live, marketplace)
│   │   ├── admin/                   # Panel admin (dashboard, paiements, RGPD, IA)
│   │   ├── events/                  # Pages publiques événements + checkout
│   │   ├── account/                 # Espace coureur (achats)
│   │   ├── marketplace/             # Place de marché publique
│   │   ├── gdpr/                    # Formulaire RGPD public
│   │   ├── layout.tsx / page.tsx    # Layout racine + landing
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                      # Composants shadcn/ui
│   │   ├── layout/                  # AdminSidebar, etc.
│   │   └── stripe-payment.tsx       # Payment Element (Apple Pay, Google Pay)
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth config multi-rôles
│   │   ├── prisma.ts                # Client Prisma singleton
│   │   ├── ocr.ts                   # AWS Rekognition OCR (+ Tesseract fallback dev)
│   │   ├── rekognition.ts           # AWS Rekognition (faces, labels, text)
│   │   ├── storage.ts               # Upload local + version web optimisée
│   │   ├── s3.ts                    # AWS S3 upload/download, CloudFront
│   │   ├── watermark.ts             # Watermarking Sharp
│   │   ├── image-processing.ts      # Auto-edit, qualité, Sharp
│   │   ├── face-clustering.ts       # Clustering visages par événement
│   │   ├── auto-cluster.ts          # Clustering automatique debounced (30s)
│   │   ├── processing-queue.ts      # File d'attente bornée (4-8 workers)
│   │   ├── ai-config.ts             # Config IA centralisée
│   │   ├── stripe.ts                # Client Stripe
│   │   ├── pricing.ts               # Calcul prix optimal, upselling
│   │   ├── email.ts                 # Templates email (Resend)
│   │   ├── role-helpers.ts          # isProRole(), isAdmin(), etc.
│   │   └── connectors/              # Njuko, KMS, CSV générique
│   ├── hooks/                       # use-toast.ts
│   └── types/                       # Types TS + extensions NextAuth
├── prisma/
│   ├── schema.prisma                # 15+ modèles PostgreSQL
│   └── seed.ts                      # Données de test
├── public/uploads/                  # Photos (HD + web + thumbnails)
├── scripts/deploy.sh                # Script déploiement Oracle Cloud
├── Dockerfile                       # Multi-stage, ARM compatible
├── .dockerignore
├── docker-compose.yml               # Dev (PostgreSQL uniquement)
├── docker-compose.prod.yml          # Prod (PostgreSQL + App + Nginx)
├── nginx.conf                       # Reverse proxy, cache, rate limiting
├── .env.example                     # Template variables d'environnement
├── next.config.mjs                  # output: standalone
└── CLAUDE.md                        # CE FICHIER
```

---

## 5. Modèles de données actuels (Prisma — PostgreSQL)

| Modèle | Description |
|--------|-------------|
| **User** | Compte unifié multi-rôles (PHOTOGRAPHER, ORGANIZER, AGENCY, CLUB, FEDERATION, ADMIN, RUNNER) |
| **Event** | Événement de course (date, lieu, sport, branding, métadonnées) |
| **Photo** | Photo uploadée (path HD, webPath optimisée, thumbnailPath watermark, champs IA : qualityScore, isBlurry, autoEdited, labels, faceIndexed, ocrProvider, s3Key) |
| **BibNumber** | Dossard détecté par OCR (numéro, score de confiance, source) |
| **StartListEntry** | Entrée start-list (dossard, nom, prénom, email, notifiedAt) |
| **PricePack** | Pack de prix par événement (unitaire, pack 5, all-inclusive) |
| **Order** | Commande (Stripe session/payment intent, statut, guest email) |
| **OrderItem** | Item de commande (lié à Photo + PricePack, token de téléchargement) |
| **GdprRequest** | Demande RGPD (type, statut, email, audit) |
| **GdprAuditLog** | Journal d'audit RGPD |
| **MarketplaceListing** | Annonce marketplace photographe ↔ organisateur |
| **MarketplaceApplication** | Candidature sur une annonce |
| **MarketplaceReview** | Avis/notation après collaboration |

---

## 6. Fonctionnalités implémentées (toutes phases)

### Fondations (Phase 1)
- [x] PostgreSQL via Docker
- [x] Modèle User unifié multi-rôles (7 rôles)
- [x] Inscription multi-profils
- [x] RBAC middleware (admin, pro, authenticated)
- [x] Panel admin de base
- [x] Seed de données de test

### Espace Pro (Phase 2)
- [x] Dashboard pro avec stats
- [x] Gestion événements (vignettes, descriptions, sports)
- [x] Upload massif avec progression
- [x] Import Start-List CSV/Excel
- [x] Triage manuel (grille drag&drop)
- [x] Watermarking dynamique Sharp
- [x] Packs de vente personnalisés
- [x] Branding événementiel

### Galerie publique (Phase 3)
- [x] Page événement avec galerie watermarkée
- [x] Recherche par dossard, par nom, par selfie (face search)
- [x] Viewer photo avec zoom/navigation
- [x] Système de favoris (localStorage → panier)
- [x] Mobile First responsive
- [x] SEO pages événements

### Paiement (Phase 4)
- [x] Stripe Checkout + Payment Element (Apple Pay, Google Pay, SEPA)
- [x] Panier avec upselling dynamique
- [x] Tunnel d'achat complet
- [x] Téléchargement HD post-achat (ZIP, token)
- [x] Espace "Mes Achats"
- [x] Emails transactionnels (Resend)

### Admin (Phase 5)
- [x] Dashboard KPIs (CA, événements, photos, utilisateurs)
- [x] Gestion paiements Stripe
- [x] Analytics par événement
- [x] Module litiges / remboursements
- [x] Export CSV (BOM + semicolons pour Excel FR)

### IA & AWS (Phase 6)
- [x] OCR AWS Rekognition (Tesseract fallback dev)
- [x] Reconnaissance faciale (IndexFaces + SearchFaces)
- [x] Détection labels (vêtements, accessoires)
- [x] Auto-editing (exposition, contraste, netteté)
- [x] Filtrage qualité (détection flou)
- [x] S3 + CloudFront CDN (optionnel)
- [x] Page admin IA avec statuts et seuils

### Features Next Gen (Phase 7)
- [x] Apple Pay / Google Pay (Payment Element)
- [x] Notifications email coureurs
- [x] RGPD complet (formulaire, suppression cascade, audit)
- [x] Upload Live SSE (temps réel)
- [x] Marketplace photographes ↔ organisateurs
- [x] Connecteurs API (Njuko, KMS, CSV générique)

### Optimisations Pipeline (Session 3)
- [x] Version web optimisée des photos (1600px, JPEG q80, ~200-400KB)
- [x] Pipeline IA sur version web (< 4MB, compatible AWS Rekognition)
- [x] OCR simplifié : AWS uniquement en prod, Tesseract dev-only
- [x] File d'attente bornée (4-8 workers concurrents)
- [x] Auto-clustering debounced (30s après dernier traitement)
- [x] Photos HD servies uniquement à l'achat

---

## 7. ROADMAP DE DÉVELOPPEMENT — Plan de travail priorisé

### PHASE 1 — Fondations & Authentification multi-rôles ✅
> Priorité : CRITIQUE — Complète

- [x] **1.1** Migration SQLite → PostgreSQL (Prisma + Docker)
- [x] **1.2** Refonte schéma BDD : modèle `User` unifié avec rôle (PHOTOGRAPHER, ORGANIZER, AGENCY, CLUB, FEDERATION, ADMIN, RUNNER)
- [x] **1.3** Système d'inscription multi-profils
- [x] **1.4** Authentification renforcée (NextAuth + RBAC middleware)
- [x] **1.5** Super Admin — Panel de base
- [x] **1.6** Seed de données de test

### PHASE 2 — Espace Pro complet ✅
> Priorité : HAUTE — Complète

- [x] **2.1** Dashboard Pro avec stats
- [x] **2.2** Gestion d'événements améliorée
- [x] **2.3** Upload massif avec progression
- [x] **2.4** Import Start-List (CSV/Excel)
- [x] **2.5** Module de triage manuel
- [x] **2.6** Watermarking dynamique (Sharp)
- [x] **2.7** Packs de vente personnalisés
- [x] **2.8** Branding événementiel

### PHASE 3 — Galerie publique & Expérience coureur ✅
> Priorité : HAUTE — Complète

- [x] **3.1** Galerie publique watermarkée + lazy loading
- [x] **3.2** Recherche par dossard
- [x] **3.3** Recherche par nom/prénom
- [x] **3.4** Viewer photo HD protégé
- [x] **3.5** Système de favoris
- [x] **3.6** Mobile First responsive
- [x] **3.7** SEO pages événements

### PHASE 4 — Paiement & Délivrance ✅
> Priorité : HAUTE — Complète

- [x] **4.1** Stripe Checkout + Payment Element
- [x] **4.2** Panier + upselling dynamique
- [x] **4.3** Tunnel d'achat complet
- [x] **4.4** Téléchargement HD post-achat (ZIP + token)
- [x] **4.5** Espace "Mes Achats"
- [x] **4.6** Stripe Connect : split payment (calculé, activation future)
- [x] **4.7** Emails transactionnels (Resend)

### PHASE 5 — Super Admin complet & Analytics ✅
> Priorité : MOYENNE — Complète

- [x] **5.1** Dashboard KPIs globaux
- [x] **5.2** Gestion paiements Stripe
- [x] **5.3** Gestion des comptes
- [x] **5.4** Stats par événement
- [x] **5.5** Module litiges / remboursements
- [x] **5.6** Export CSV (BOM + semicolons FR)

### PHASE 6 — IA avancée & Migration AWS ✅
> Priorité : MOYENNE — Complète

- [x] **6.1** OCR AWS Rekognition (DetectText) + Tesseract fallback dev
- [x] **6.2** Reconnaissance faciale (IndexFaces + SearchFaces)
- [x] **6.3** Label Detection (vêtements, accessoires)
- [x] **6.4** Auto-editing IA (Sharp)
- [x] **6.5** Filtrage qualité (détection flou Laplacien)
- [x] **6.6** S3 + CloudFront CDN
- [x] **6.7** Seuils configurables + admin IA

### PHASE 7 — Features "Next Gen" & Écosystème (partiel)
> Priorité : BASSE — 6/11 complètes

- [ ] **7.1** Sync Chrono (croisement heure photo ↔ temps de passage officiel)
- [ ] **7.2** Détection émotions (sourires, effort héroïque)
- [ ] **7.3** Recadrage automatique (Smart Crop)
- [ ] **7.4** Social Teaser (vidéo 15s auto-générée)
- [x] **7.5** Notifications email coureurs (Resend)
- [ ] **7.6** QR Codes dynamiques par coureur
- [x] **7.7** Upload Live (SSE temps réel)
- [x] **7.8** Marketplace photographes ↔ organisateurs
- [x] **7.9** Apple Pay / Google Pay (Payment Element)
- [x] **7.10** Connecteurs API (Njuko, KMS, CSV générique)
- [x] **7.11** RGPD complet (formulaire, suppression cascade, audit)

### DÉPLOIEMENT — Infrastructure de production (en cours)
> Ajouté Session 3, mis à jour Session 4

- [x] Dockerfile multi-stage (ARM compatible)
- [x] docker-compose.prod.yml (PostgreSQL + App + Nginx)
- [x] nginx.conf (reverse proxy, rate limiting, cache, sécurité)
- [x] .env.example (template complet)
- [x] scripts/deploy.sh (déploiement one-command)
- [x] next.config.mjs output: standalone
- [x] Compte Oracle Cloud créé (région : France Central Paris)
- [ ] Création instance ARM (bloqué : capacité ARM saturée sur Paris, impossible de changer de région — limite 1 région par tenancy Free Tier)
- [ ] Ouvrir ports 80/443 (Security List)
- [ ] Installation Docker + Docker Compose sur instance
- [ ] Transfert code + .env
- [ ] Déploiement effectif + DNS + HTTPS Let's Encrypt

**Note** : Options pour débloquer l'instance ARM :
1. Retenter plus tard (la capacité se libère régulièrement, surtout nuit/matin)
2. Créer un nouveau compte Oracle avec une autre carte sur Frankfurt
3. Alternative : shape AMD VM.Standard.E2.1.Micro (1 OCPU, 1 GB — très limité)
4. Alternative : Render.com ou Railway.app (free tier, moins puissant mais dispo immédiatement)

---

## 8. Variables d'environnement (.env)

| Variable | Description |
|----------|-------------|
| **Base de données** | |
| `DATABASE_URL` | URL PostgreSQL (`postgresql://postgres:focusracer@localhost:5432/focusracer?schema=public`) |
| `DB_PASSWORD` | Mot de passe PostgreSQL (docker-compose.prod) |
| **NextAuth** | |
| `NEXTAUTH_SECRET` | Clé de signature des sessions |
| `NEXTAUTH_URL` | URL de callback auth |
| **Upload** | |
| `UPLOAD_DIR` | Répertoire de stockage (`./public/uploads`) |
| **Stripe** | |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe |
| `PLATFORM_FEE_PERCENT` | Commission plateforme (défaut: 10) |
| `NEXT_PUBLIC_APP_URL` | URL publique de l'app |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé Stripe côté client |
| **Email** | |
| `RESEND_API_KEY` | Clé API Resend |
| `EMAIL_FROM` | Adresse expéditeur |
| **AWS** | |
| `AWS_REGION` | Région AWS (eu-west-1) |
| `AWS_ACCESS_KEY_ID` | Clé d'accès AWS |
| `AWS_SECRET_ACCESS_KEY` | Secret AWS |
| `AWS_REKOGNITION_COLLECTION_ID` | Collection faces Rekognition |
| `AWS_S3_BUCKET` | Bucket S3 (optionnel) |
| `AWS_CLOUDFRONT_URL` | URL CDN CloudFront (optionnel) |
| **IA** | |
| `AI_OCR_CONFIDENCE_THRESHOLD` | Seuil confiance OCR (défaut: 70) |
| `AI_QUALITY_THRESHOLD` | Seuil qualité photo (défaut: 30) |
| `AI_AUTO_EDIT_ENABLED` | Activer auto-editing (true/false) |
| `AI_FACE_INDEX_ENABLED` | Activer indexation faciale (true/false) |
| `AI_LABEL_DETECTION_ENABLED` | Activer détection labels (true/false) |
| `AI_MAX_CONCURRENT` | Workers parallèles (défaut: 4, prod: 8) |

---

## 9. Historique des échanges et actions

### Session 1 — 2026-02-05
- **Exploration** : Analyse complète du projet existant et création de ce fichier `claude.md`
- **Consolidation** : Le projet était réparti entre deux dossiers (`Focus Racer/` vide et `race-photo-sorter/` avec le code). Tout déplacé dans `Focus Racer/`, ancien dossier supprimé.
- **Cahier des charges** : Lecture et intégration du CDC V2 complet (`Cahier des Charges Focus Racer (1).docx`)
- **Roadmap** : Définition du plan de travail en 7 phases priorisées
- **État actuel** : V0.1.0 fonctionnelle avec OCR basique, auth photographe simple, recherche par dossard. Tout le socle V2 reste à construire.

### Session 2 — 2026-02-05 (Phase 7)
- **7.9 Apple Pay / Google Pay** : Passage de Stripe Checkout Sessions (redirect) à Stripe Payment Element embarqué. Nouveau composant `StripePayment`, nouvelle route `create-payment-intent`, support Apple Pay/Google Pay/Link/SEPA natif.
- **7.5 Notifications email** : Système de notification des coureurs quand leurs photos sont prêtes. Croisement start-list + dossards détectés. Bouton "Notifier les coureurs" sur la page événement photographe. Template email HTML via Resend. Champ `notifiedAt` ajouté à StartListEntry.
- **7.11 RGPD** : Formulaire public de demande (`/gdpr`), API de suppression en cascade (photos, faces, start-list, commandes anonymisées), audit trail complet, page admin de gestion des demandes (`/admin/gdpr`). Nouveaux modèles `GdprRequest` + `GdprAuditLog`.
- **7.7 Upload Live** : Architecture temps réel avec SSE. API d'upload live avec statut en mémoire + listeners SSE. Page dédiée en mode sombre (`/photographer/events/[id]/live`) avec drop zone, stats temps réel et flux de photos traitées.
- **7.8 Marketplace** : Module complet photographes ↔ organisateurs. Modèles `MarketplaceListing`, `MarketplaceApplication`, `MarketplaceReview`. API CRUD avec candidatures, acceptation/rejet, système de notation. Page publique `/marketplace` avec filtres par sport.
- **7.10 Connecteurs API** : Système de connecteurs modulaires (`src/lib/connectors/`). Connecteurs Njuko, KMS/Chronorace, et CSV générique depuis URL. API d'import via connecteur intégrée à la page start-list avec auto-détection des colonnes.

**Fichiers créés** :
- `src/app/api/checkout/create-payment-intent/route.ts`
- `src/components/stripe-payment.tsx`
- `src/app/api/events/[id]/notify-runners/route.ts`
- `src/app/api/gdpr/request/route.ts`
- `src/app/api/admin/gdpr/route.ts` + `[id]/route.ts`
- `src/app/gdpr/page.tsx`
- `src/app/admin/gdpr/page.tsx`
- `src/app/api/events/[id]/live-upload/route.ts`
- `src/app/photographer/events/[id]/live/page.tsx`
- `src/app/api/marketplace/listings/route.ts` + `[id]/route.ts` + `[id]/apply/route.ts`
- `src/app/api/marketplace/applications/[id]/route.ts`
- `src/app/api/marketplace/reviews/route.ts`
- `src/app/marketplace/page.tsx`
- `src/lib/connectors/base.ts`, `njuko.ts`, `kms.ts`, `generic-csv.ts`, `index.ts`
- `src/app/api/events/[id]/connectors/route.ts`

**Fichiers modifiés** :
- `prisma/schema.prisma` (ajout GdprRequest, GdprAuditLog, MarketplaceListing, MarketplaceApplication, MarketplaceReview, champs User)
- `src/lib/email.ts` (ajout template notification coureur)
- `src/app/api/webhooks/stripe/route.ts` (support payment_intent.succeeded)
- `src/app/events/[id]/checkout/page.tsx` (Payment Element embarqué)
- `src/app/photographer/events/[id]/page.tsx` (boutons Notifier + Mode Live)
- `src/app/photographer/events/[id]/start-list/page.tsx` (section connecteurs API)
- `src/app/admin/dashboard/page.tsx` (lien RGPD)

### Session 3 — 2026-02-06 (Optimisations pipeline + Déploiement)

**Corrections build** : 9 erreurs TypeScript/ESLint corrigées (variables inutilisées, types manquants dans NextAuth pour `stripeAccountId`/`stripeOnboarded`, apostrophes non échappées).

**Auto-clustering** : Nouveau module `src/lib/auto-cluster.ts`. Le clustering facial se déclenche automatiquement 30s après le dernier traitement photo d'un événement (debounced). Plus besoin de bouton manuel.

**Version web optimisée des photos** :
- À l'upload, Sharp génère une version web (1600px max, JPEG q80, ~200-400KB) dans `/uploads/{eventId}/web/`
- Champ `webPath` ajouté au modèle Photo
- Tout le pipeline IA (OCR, face indexing, labels) utilise la version web (< 4MB, compatible AWS Rekognition)
- Galerie/recherche servent : `thumbnailPath` (watermark) > `webPath` (optimisé) > `path` (HD fallback)
- Les originaux HD (`path`) ne sont servis qu'à l'achat

**Simplification OCR** :
- AWS Rekognition uniquement en production (~0.3s/photo)
- Tesseract.js uniquement en dev (quand pas de clés AWS)
- Plus de double pipeline, gain de performance majeur

**File d'attente de traitement** : Nouveau module `src/lib/processing-queue.ts`. Concurrence bornée (défaut 4 workers via `AI_MAX_CONCURRENT`). Empêche la saturation CPU/RAM avec 10 000 photos simultanées.

**Performance estimée** : 10 000 photos en ~1h (vs ~22h avant optimisations) grâce à : version web + AWS-only OCR + workers bornés.

**Déploiement Oracle Cloud** :
- `Dockerfile` multi-stage (deps → build → runtime minimal avec Sharp + Tesseract)
- `docker-compose.prod.yml` (PostgreSQL 16 + Next.js + Nginx)
- `nginx.conf` (reverse proxy, gzip, cache, rate limiting 10r/s API + 2r/s upload, SSE live upload, headers sécurité, prêt Let's Encrypt)
- `.env.example` (template complet de toutes les variables)
- `scripts/deploy.sh` (build + start + health check en une commande)
- `next.config.mjs` : ajout `output: "standalone"`

**Fichiers créés** :
- `src/lib/auto-cluster.ts`
- `src/lib/processing-queue.ts`
- `Dockerfile`
- `.dockerignore`
- `docker-compose.prod.yml`
- `nginx.conf`
- `.env.example`
- `scripts/deploy.sh`

**Fichiers modifiés** :
- `prisma/schema.prisma` (ajout `webPath` sur Photo)
- `src/lib/storage.ts` (génération version web optimisée)
- `src/lib/ocr.ts` (simplifié AWS-only + Tesseract fallback dev)
- `src/lib/watermark.ts` (accepte sourcePath au lieu de reconstruire le chemin)
- `src/app/api/photos/upload/route.ts` (pipeline sur version web, queue bornée, auto-clustering)
- `src/app/api/events/[id]/live-upload/route.ts` (idem)
- `src/app/api/events/public/[id]/route.ts` (serve webPath)
- `src/app/api/photos/search/route.ts` (serve webPath)
- `src/app/api/photos/search-face/route.ts` (serve webPath)
- `src/app/photographer/events/[id]/page.tsx` (affiche webPath)
- `src/types/next-auth.d.ts` (ajout stripeAccountId, stripeOnboarded)
- `src/lib/auth.ts` (passe stripeAccountId/stripeOnboarded dans session)
- `next.config.mjs` (output: standalone)

### Session 4 — 2026-02-06 (Tentative déploiement Oracle Cloud)

- **Compte Oracle Cloud créé** : région France Central (Paris)
- **CLAUDE.md mis à jour** : version 0.9.0, stack complète, roadmap cochée, env vars, architecture fichiers, sessions 1-3
- **Architecture expliquée** : Oracle (serveur gratuit : Next.js + PostgreSQL + Nginx) + AWS (API payantes : Rekognition OCR/faces/labels) + Stripe (revenus)
- **Création instance bloquée** : capacité ARM (VM.Standard.A1.Flex) saturée sur Paris. Impossible de changer de région (limite 1 région par tenancy Free Tier). Impossible de créer un 2e compte (même carte détectée).
- **Oracle abandonné temporairement** : capacité ARM totalement épuisée sur Paris. Impossible de changer de région (1 seule autorisée). Impossible de créer un 2e compte. Suppression de compte = 30 jours de délai.
- **Décision : déployer sur Render.com** à la place (compte déjà existant)
- **Prochaines étapes** :
  1. Initialiser git dans le projet + créer repo GitHub
  2. Pousser le code sur GitHub
  3. Connecter Render.com au repo GitHub
  4. Configurer PostgreSQL + Web Service sur Render
  5. Configurer les variables d'environnement
  6. Déployer
  7. (Plus tard) Migrer sur Oracle quand capacité ARM dispo sur Paris

---

## 10. Notes techniques

- **BDD** : PostgreSQL 16 via Docker, 13+ modèles Prisma
- **IA** : Pipeline optimisé sur version web (qualité → auto-edit → watermark → OCR → face → labels). AWS Rekognition en prod, Tesseract.js en dev uniquement. File d'attente bornée (4-8 workers).
- **Photos** : 3 versions par photo — HD originale (achat uniquement), web optimisée (1600px, JPEG q80, pipeline IA + affichage), thumbnail watermarkée (galerie publique)
- **Auto-clustering** : Debounced 30s après dernier traitement par événement. Module `auto-cluster.ts`.
- **Paiement** : Stripe Payment Element (Apple Pay, Google Pay, Link, SEPA, CB). Commission plateforme calculée (Connect non activé).
- **Email** : Resend (confirmation achat + notification coureurs quand photos prêtes)
- **Temps réel** : SSE pour l'upload live (in-memory store, listeners par event)
- **RGPD** : Formulaire public, suppression en cascade, audit trail complet
- **Marketplace** : Listings, candidatures, reviews avec ratings
- **Connecteurs** : Architecture modulaire (Njuko, KMS, CSV). Interface `Connector` pour ajout facile.
- **Stockage** : Local + S3/CloudFront optionnel, URLs signées 24h
- **Déploiement** : Docker multi-stage + Nginx reverse proxy. Cible Oracle Cloud Free Tier (4 ARM, 24 GB RAM).
- **Performance** : ~1h pour 10 000 photos (version web + AWS OCR + 4 workers parallèles)
- **Seed data** : `admin@focusracer.com/admin123`, `photographe@test.com/photo123`, `coureur@test.com/runner123`, `orga@test.com/orga123`
