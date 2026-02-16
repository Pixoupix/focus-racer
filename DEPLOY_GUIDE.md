# 🚀 Guide de déploiement sur serveur dédié

## Serveur : focusracer.swipego.app (79.137.88.192)

### Specs serveur :
- **CPU** : AMD EPYC 4344P (8c/16t) @ 3.8-5.3 GHz
- **RAM** : 64 Go DDR5 5200 MHz
- **Stockage** : 4×1.92 To SSD NVMe RAID
- **OS** : Ubuntu
- **Domaine** : https://focusracer.swipego.app

---

## 📋 Prérequis

1. **Accès SSH** au serveur
2. **Sudo/root** privileges
3. **DNS configuré** : ✅ focusracer.swipego.app → 79.137.88.192

---

## 🚀 Installation (One-Command)

### Étape 1 : Connexion SSH

```bash
ssh root@79.137.88.192
# OU
ssh votre_user@79.137.88.192
```

### Étape 2 : Télécharger le script

```bash
curl -fsSL https://raw.githubusercontent.com/Pixoupix/focus-racer/master/scripts/deploy-server.sh -o deploy-server.sh
chmod +x deploy-server.sh
```

### Étape 3 : Lancer le déploiement

```bash
sudo ./deploy-server.sh
```

Le script va :
- ✅ Installer Docker + Docker Compose
- ✅ Cloner le repo GitHub
- ✅ Créer le fichier `.env` (à configurer)
- ✅ Build + démarrer les conteneurs (PostgreSQL, Next.js, Caddy)

---

## ⚙️ Configuration de .env

### Après l'installation, éditez le .env :

```bash
nano /opt/focusracer/.env
```

### Variables à configurer :

```bash
# Database
DB_PASSWORD=CHANGEZ_MOI_PASSWORD_SECURISE

# NextAuth
NEXTAUTH_SECRET=CHANGEZ_MOI_SECRET_LONG_ET_ALEATOIRE

# Stripe (vos vraies clés)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Resend
RESEND_API_KEY=re_...
EMAIL_FROM=Focus Racer <noreply@focusracer.swipego.app>

# AWS (remplacez par VOS vraies clés du .env local)
AWS_ACCESS_KEY_ID=AKIA_YOUR_KEY_HERE
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY_HERE
AWS_S3_BUCKET=your-bucket-name

# AI optimisé pour votre serveur 8-core
AI_MAX_CONCURRENT=8
```

### Sauvegarder :
- `Ctrl+O` → Entrée → `Ctrl+X`

---

## 🔄 Redémarrer après config

```bash
cd /opt/focusracer
docker-compose -f docker-compose.production.yml restart
```

---

## 🗄️ Setup base de données

### Migrations Prisma

```bash
cd /opt/focusracer
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

### Seed (données de test)

```bash
docker-compose -f docker-compose.production.yml exec app npm run seed
```

**Comptes créés** :
- Admin : `admin@focusracer.com` / `admin123`
- Photographe : `photographe@test.com` / `photo123`
- Coureur : `coureur@test.com` / `runner123`

---

## 📊 Commandes utiles

### Voir les logs en temps réel

```bash
cd /opt/focusracer
docker-compose -f docker-compose.production.yml logs -f
```

### Voir les logs d'un seul service

```bash
docker-compose -f docker-compose.production.yml logs -f app
docker-compose -f docker-compose.production.yml logs -f postgres
docker-compose -f docker-compose.production.yml logs -f caddy
```

### Redémarrer un service

```bash
docker-compose -f docker-compose.production.yml restart app
```

### Arrêter tout

```bash
docker-compose -f docker-compose.production.yml down
```

### Démarrer tout

```bash
docker-compose -f docker-compose.production.yml up -d
```

### Rebuild après changement de code

```bash
git pull origin master
docker-compose -f docker-compose.production.yml build --no-cache app
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔐 SSL/HTTPS

Caddy gère **automatiquement** le certificat Let's Encrypt :
- ✅ HTTPS activé dès le premier démarrage
- ✅ Renouvellement automatique
- ✅ Redirection HTTP → HTTPS

**Aucune config manuelle nécessaire !**

---

## 🎯 Performance attendue

Avec votre serveur **AMD EPYC 8-core + 64GB RAM** :

| Métrique | Render Free | Serveur dédié |
|----------|-------------|---------------|
| RAM | 512 MB | 64 GB (128x) |
| CPU Cores | 1 | 8 (8x) |
| AI Workers | 1 | 8 (8x) |
| Traitement 413 photos | 20+ min | **3-5 min** |
| Sharp heap | 400 MB | 8 GB (20x) |
| Timeout Cloudflare | 100s ❌ | Pas de limite ✅ |

---

## ✅ Checklist finale

- [ ] SSH connection OK
- [ ] Script deploy-server.sh exécuté
- [ ] .env configuré avec vraies clés
- [ ] Services redémarrés
- [ ] Migrations Prisma exécutées
- [ ] Seed database (optionnel)
- [ ] https://focusracer.swipego.app accessible
- [ ] Upload de test (10-20 photos)
- [ ] Upload massif (400+ photos)

---

## 🆘 Problèmes courants

### Le site ne répond pas

```bash
# Vérifier l'état des services
docker-compose -f docker-compose.production.yml ps

# Vérifier les logs
docker-compose -f docker-compose.production.yml logs caddy
```

### Erreur base de données

```bash
# Vérifier PostgreSQL
docker-compose -f docker-compose.production.yml logs postgres

# Recréer la DB (⚠️ efface les données)
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml exec app npx prisma migrate deploy
```

### Certificat SSL pas généré

```bash
# Vérifier les logs Caddy
docker-compose -f docker-compose.production.yml logs caddy

# Vérifier que le port 80/443 est ouvert
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🎉 Vous êtes prêt !

Votre serveur est **128x plus puissant que Render free tier**.

Profitez de :
- ✅ Uploads illimités
- ✅ Traitement ultra-rapide (8 workers)
- ✅ Pas de timeout
- ✅ Stockage illimité (7.68 To)
- ✅ SSL automatique

**Bon courage ! 🚀**
