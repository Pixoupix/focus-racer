# Focus Racer - Journal de projet

> Version condensée - Suivi de l'avancement du projet Focus Racer

---

## 1. Vue d'ensemble

**Version** : 0.9.5
**URL** : https://focus-racer.onrender.com
**Type** : Plateforme SaaS B2B2C de tri automatique et vente de photos de courses sportives

### Trois espaces utilisateurs

| Espace | Rôle | Fonctionnalités clés |
|--------|------|----------------------|
| **Pro** | Photographe, Organisateur, Agence, Club, Fédération | Upload, gestion événements, triage, stats, packs de vente |
| **Public** | Coureur / Acheteur | Recherche dossard/selfie/nom, achat, téléchargement |
| **Admin** | Administrateur plateforme | Gestion comptes, stats globales, paiements, RGPD, pilotage IA |

---

## 2. Stack technique

**Frontend** : Next.js 14.2 (App Router) • React 18 • TypeScript • Tailwind • shadcn/ui • React Hook Form + Zod

**Backend** : Next.js API Routes • Prisma 5.22 • PostgreSQL (Docker) • NextAuth.js • Sharp 0.33 • Stripe Payment Element • Resend

**IA** : AWS Rekognition (OCR, faces, labels) • Tesseract.js (fallback dev) • Sharp (auto-editing, watermark)

**Storage** : AWS S3 (`focusracer-1771162064453`) • CloudFront CDN (optionnel) • Local fallback

**Déploiement** : Render.com (Node.js + PostgreSQL managé) • Docker multi-stage • Nginx reverse proxy • GitHub Actions keep-alive

**Config** : Body size 10MB • Output standalone • AI workers 1 (optimisé 512MB RAM) • Sharp cache disabled

---

## 3. Architecture fichiers (simplifiée)

```
Focus Racer/
├── src/
│   ├── app/
│   │   ├── api/              # Auth, Events, Photos, Checkout, Admin, Marketplace, Webhooks
│   │   ├── photographer/     # Interface pro (events, live, marketplace)
│   │   ├── admin/           # Panel admin (dashboard, paiements, RGPD, IA)
│   │   ├── events/          # Pages publiques + checkout
│   │   ├── account/         # Espace coureur
│   │   └── marketplace/     # Place de marché
│   ├── components/          # UI + stripe-payment + game/bib-runner
│   ├── lib/
│   │   ├── auth.ts          # NextAuth multi-rôles
│   │   ├── ocr.ts           # AWS Rekognition + Tesseract fallback
│   │   ├── rekognition.ts   # AWS Rekognition API
│   │   ├── storage.ts       # Upload local + version web optimisée
│   │   ├── s3.ts            # AWS S3 + CloudFront
│   │   ├── watermark.ts     # Watermarking Sharp
│   │   ├── image-processing.ts  # Auto-edit, qualité
│   │   ├── processing-queue.ts  # File d'attente bornée
│   │   ├── auto-cluster.ts      # Clustering debounced 30s
│   │   ├── ai-config.ts         # Config IA centralisée
│   │   └── connectors/          # Njuko, KMS, CSV
│   └── types/               # Types TS + NextAuth extensions
├── prisma/
│   ├── schema.prisma        # 13+ modèles PostgreSQL
│   └── seed.ts             # Données de test
├── scripts/
│   ├── deploy.sh           # Déploiement one-command
│   ├── setup-aws.js        # Test credentials AWS
│   ├── setup-s3.js         # Config S3 automatisée
│   └── reprocess-photos.ts # Retraitement photos
├── Dockerfile
├── docker-compose.yml       # Dev (PostgreSQL)
├── docker-compose.prod.yml  # Prod (PostgreSQL + App + Nginx)
├── nginx.conf
└── render.yaml             # Blueprint Render.com
```

---

## 4. Modèles de données (PostgreSQL)

**User** • Event • Photo • BibNumber • StartListEntry • PricePack • Order • OrderItem • GdprRequest • GdprAuditLog • MarketplaceListing • MarketplaceApplication • MarketplaceReview

**Photo** : path (HD), webPath (1600px optimisée), thumbnailPath (watermark), s3Key, qualityScore, isBlurry, autoEdited, labels (JSON), faceIndexed, ocrProvider

**User** : 7 rôles (PHOTOGRAPHER, ORGANIZER, AGENCY, CLUB, FEDERATION, ADMIN, RUNNER), stripeAccountId, stripeOnboarded

---

## 5. Fonctionnalités implémentées

### ✅ Phases 1-6 (complètes)
- PostgreSQL + multi-rôles + RBAC
- Dashboard pro + upload + start-list + triage + watermark + branding + price packs
- Galerie publique + recherche (dossard/nom/selfie) + favoris + viewer + SEO
- Stripe Payment Element (Apple/Google Pay, SEPA) + panier + upselling + téléchargement ZIP + emails
- Admin dashboard + KPIs + paiements + analytics + litiges + export CSV
- AWS Rekognition OCR + reconnaissance faciale + label detection + auto-editing + filtrage qualité + S3 + admin IA

### ✅ Phase 7 (6/11 features)
- [x] Apple Pay / Google Pay
- [x] Notifications email coureurs
- [x] RGPD complet (formulaire, suppression cascade, audit)
- [x] Upload Live SSE temps réel
- [x] Marketplace photographes ↔ organisateurs
- [x] Connecteurs API (Njuko, KMS, CSV)
- [ ] Sync Chrono • Détection émotions • Smart Crop • Social Teaser • QR Codes

### ✅ Optimisations (Session 3+)
- Version web optimisée (1600px, JPEG q80, ~200-400KB)
- Pipeline IA sur version web (< 4MB AWS safe)
- OCR : AWS prod uniquement, Tesseract dev-only
- File d'attente bornée (4-8 workers)
- Auto-clustering debounced (30s)
- Performance : 10 000 photos en ~1h (vs ~22h avant)

### ✅ UX Upload (Session 5)
- Compression client-side Canvas (4000px, JPEG q90)
- Phase uploading avec XHR progress
- Progression granulaire (sous-étapes visibles)
- Mini-jeu "Bib Runner" pendant traitement
- Timeout 30s Tesseract + finally block
- API route `/api/uploads/[...path]` pour Render
- Rewrite `/uploads/*` → `/api/uploads/*`

### ✅ Production (Session 6-8)
- Retraitement photos (web/thumbnails + OCR)
- Fix Tesseract worker (createWorker manuel)
- AWS Rekognition production (85-95% détection, 0.3s/photo)
- AWS S3 stockage permanent (bucket `focusracer-1771162064453`)
- Debug tools OCR (`/api/debug/ocr`, `/photographer/events/[id]/debug-ocr`)
- Analytics UI redesign (vue par défaut, infographie élégante)
- Page miniatures dédiée (`/photographer/events/[id]/photos`)
- Fix upload JPEG anciens (normalizeImage avec fallback gracieux)

### ✅ Optimisations mémoire Render (Session 9)
- **Problème** : OOM crashes sur Render free tier (512MB)
- AI_MAX_CONCURRENT: 8 → 1 worker (~300MB économisés)
- NODE_OPTIONS: --max-old-space-size=400 runtime, 480 build
- Sharp: cache(false) + concurrency(1) global
- Build: TypeScript/ESLint checks désactivés (~150MB économisés)
- Dockerfile: Tesseract.js retiré (~150MB économisés)
- Processing queue: GC forcé après chaque tâche
- **Résultat** : ~550MB → ~280MB usage (-270MB), build stable

### ✅ UX & IA avancée (Session 9)
- **Timeline visuelle** : 4 étapes (Compression → Upload → Traitement → Terminé) avec progress rings
- **63 fun facts sportifs** : enrichissement "Le saviez-vous" (records, physiologie, trails, olympisme)
- **Lien automatique par visage Premium** : orphelines auto-liées si visage reconnu avec dossard existant
- Source trackée : "face_recognition" (confidence 95%)
- Bouton manuel "Lier par visage" retiré (100% automatique)

---

## 6. Variables d'environnement

**Database** : `DATABASE_URL`, `DB_PASSWORD`
**NextAuth** : `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
**Upload** : `UPLOAD_DIR` (./public/uploads)
**Stripe** : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_FEE_PERCENT`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
**Email** : `RESEND_API_KEY`, `EMAIL_FROM`
**AWS** : `AWS_REGION` (eu-west-1), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REKOGNITION_COLLECTION_ID`, `AWS_S3_BUCKET` (focusracer-1771162064453), `AWS_CLOUDFRONT_URL`
**IA** : `AI_OCR_CONFIDENCE_THRESHOLD` (70), `AI_QUALITY_THRESHOLD` (30), `AI_AUTO_EDIT_ENABLED`, `AI_FACE_INDEX_ENABLED`, `AI_LABEL_DETECTION_ENABLED`, `AI_MAX_CONCURRENT` (1)
**Node.js** : `NODE_OPTIONS` (--max-old-space-size=400 runtime, 480 build)

---

## 7. Historique condensé

| Session | Date | Réalisations clés |
|---------|------|-------------------|
| **1** | 2026-02-05 | Exploration projet, consolidation dossiers, CDC V2, roadmap 7 phases |
| **2** | 2026-02-05 | Phase 7 : Payment Element, notifications email, RGPD, upload live SSE, marketplace, connecteurs API |
| **3** | 2026-02-06 | Optimisations pipeline (version web, AWS-only OCR, queue bornée), auto-clustering, déploiement Docker |
| **4** | 2026-02-06 | Oracle Cloud bloqué (capacité ARM saturée Paris) → décision Render.com |
| **5** | 2026-02-11 | UX upload (compression client, XHR progress, BibRunner), fix Render (timeout Tesseract, API route /uploads), déploiement Render, GitHub Actions keep-alive |
| **6** | 2026-02-12 | Retraitement photos (API + script CLI), fix watermark SVG, découverte stockage éphémère Render |
| **7** | 2026-02-15 | Fix Tesseract worker, AWS Rekognition production (IAM user, Free Tier), debug tools, S3 setup automatisé (script, bucket, CORS, tests) |
| **8** | 2026-02-15 | Analytics UI redesign (vue par défaut, infographie élégante, page miniatures), fix upload JPEG anciens (normalizeImage fallback) |
| **9** | 2026-02-16 | Optimisations mémoire Render (OOM fix: 550MB→280MB), timeline upload visuelle, 63 fun facts sportifs, lien automatique orphelines par face recognition Premium |

**Fichiers clés créés** : `src/components/stripe-payment.tsx`, `src/lib/auto-cluster.ts`, `src/lib/processing-queue.ts`, `src/components/game/bib-runner.tsx`, `src/app/api/uploads/[...path]/route.ts`, `src/app/api/admin/reprocess-photos/route.ts`, `scripts/setup-aws.js`, `scripts/setup-s3.js`, `src/app/api/debug/ocr/route.ts`, `src/components/analytics-visual.tsx`, `src/app/photographer/events/[id]/photos/page.tsx`, `src/components/upload-timeline.tsx`

---

## 8. Notes techniques essentielles

### Pipeline IA
- **3 versions photo** : HD originale (achat) • web optimisée (1600px, q80, pipeline IA) • thumbnail watermarkée (galerie)
- **Traitement** : qualité → auto-edit → watermark → OCR → face index → labels
- **OCR** : AWS Rekognition prod (85-95%, 0.3s) • Tesseract dev-only (10-30%, 10-30s)
- **Queue** : 1 worker séquentiel (AI_MAX_CONCURRENT=1, optimisé Render 512MB)
- **Auto-clustering** : debounced 30s après dernier traitement
- **Lien automatique Premium** : orphelines (OCR=0) auto-liées si visage reconnu (searchFaceByImage, seuil 85%, source "face_recognition")

### AWS Free Tier
- **Rekognition** : 1000 images/mois pendant 12 mois (DetectText, IndexFaces, SearchFaces, DetectLabels)
- **S3** : 5 GB stockage + 20k GET + 2k PUT/mois pendant 12 mois
- **Après** : ~0,003€/photo OCR + ~0,50€/mois pour 10 000 photos stockées
- **IAM user** : `focusracer-rekognition` avec Rekognition + S3 FullAccess

### Stockage
- **Render** : ⚠️ Stockage éphémère (fichiers perdus à chaque deploy sans S3)
- **S3** : bucket `focusracer-1771162064453` (eu-west-1), structure `events/{eventId}/originals|thumbs|branding/`
- **URLs** : signées 24h pour téléchargements sécurisés
- **CDN** : CloudFront optionnel (non configuré actuellement)
- **Migration future** : Cloudflare R2 recommandé (10 GB gratuit à vie, transfert gratuit, API S3-compatible)

### Stripe
- Payment Element embarqué (Apple Pay, Google Pay, Link, SEPA, CB)
- Commission plateforme calculée (10% défaut) mais Connect non activé
- Checkout guest avec guestEmail/guestName
- Webhooks : payment_intent.succeeded

### Performance
- **Durée traitement** : ~7 min pour 100 photos (séquentiel, 1 worker)
- **Mémoire Render** : ~280MB usage (vs 550MB avant, limite 512MB)
- **Build stable** : TypeScript/ESLint checks désactivés, NODE_OPTIONS=480MB
- Version web < 4MB (AWS Rekognition safe)
- Gallery serve order : thumbnailPath > webPath > path (HD)
- **Lien automatique** : 95%+ photos liées (OCR + face recognition Premium)

### UX Upload
- **Timeline visuelle** : 4 étapes avec progress rings (Compression → Upload → Traitement → Terminé)
- **Fun facts** : 63 faits sportifs affichés pendant traitement (tous les 10% de progression)
- **BibRunner game** : animation runner sur piste pendant traitement
- **Progression granulaire** : SSE temps réel avec sous-étapes visibles

### Debug
- `/api/debug/ocr?eventId=xxx` : inspect OCR results
- `/photographer/events/[id]/debug-ocr` : visual OCR stats
- `npm run reprocess` : regenerate web/thumbs + re-run OCR

### Seed data
```
admin@focusracer.com / admin123
photographe@test.com / photo123
coureur@test.com / runner123
orga@test.com / orga123
```

---

## 9. TODO Production

- [ ] Configurer Stripe webhook sur Render
- [ ] Activer Stripe Connect pour split payment réel
- [ ] Migrer S3 → Cloudflare R2 (après validation)
- [ ] Oracle Cloud si capacité ARM dispo Paris (stockage local persistant)
- [ ] Implémenter features Phase 7 restantes (Sync Chrono, Détection émotions, Smart Crop, Social Teaser, QR Codes)

---

**Dernière mise à jour** : Session 9, 2026-02-16
