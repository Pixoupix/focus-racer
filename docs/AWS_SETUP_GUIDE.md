# 🚀 Guide de configuration AWS Rekognition

## Étape 1️⃣ : Créer un compte AWS (5 min)

### Si tu n'as PAS de compte AWS :

1. Va sur [aws.amazon.com](https://aws.amazon.com)
2. Clique sur **"Créer un compte AWS"**
3. Remplis le formulaire :
   - Email
   - Mot de passe
   - Nom du compte (ex: "FocusRacer")
4. **Carte bancaire requise** (mais pas de débit si tu restes dans le Free Tier)
5. Vérifie ton email et numéro de téléphone
6. Choisis le plan **"Gratuit"** (Basic Support)

### Si tu as DÉJÀ un compte AWS :

7. Connecte-toi sur [console.aws.amazon.com](https://console.aws.amazon.com)

---

## Étape 2️⃣ : Créer un utilisateur IAM avec permissions Rekognition (3 min)

### A. Aller sur IAM

1. Dans la console AWS, cherche **"IAM"** dans la barre de recherche en haut
2. Clique sur **"IAM"** (Identity and Access Management)

### B. Créer l'utilisateur

3. Dans le menu de gauche, clique sur **"Users"** (Utilisateurs)
4. Clique sur le bouton **"Create user"** (Créer un utilisateur)
5. **Nom d'utilisateur** : `focusracer-rekognition`
6. **DÉCOCHER** "Provide user access to the AWS Management Console" (on veut juste un accès API)
7. Clique sur **"Next"** (Suivant)

### C. Définir les permissions

8. Sélectionne **"Attach policies directly"** (Attacher des stratégies directement)
9. Dans la barre de recherche des policies, tape : **"Rekognition"**
10. **COCHE** la policy : ✅ **`AmazonRekognitionFullAccess`**
11. Clique sur **"Next"** (Suivant)

### D. Révision et création

12. Vérifie que tout est bon :
    - User name : `focusracer-rekognition`
    - Permissions : `AmazonRekognitionFullAccess`
13. Clique sur **"Create user"** (Créer l'utilisateur)

---

## Étape 3️⃣ : Générer les clés d'accès (2 min)

### A. Accéder à l'utilisateur créé

1. Tu es normalement sur la page de l'utilisateur `focusracer-rekognition`
2. Sinon, dans IAM → Users → Clique sur `focusracer-rekognition`

### B. Créer les Access Keys

3. Clique sur l'onglet **"Security credentials"**
4. Scrolle jusqu'à la section **"Access keys"**
5. Clique sur **"Create access key"** (Créer une clé d'accès)

### C. Cas d'utilisation

6. Sélectionne : ☑️ **"Application running outside AWS"** (Application exécutée en dehors d'AWS)
7. Clique sur **"Next"**

### D. Description (optionnelle)

8. Description tag (optionnel) : "Focus Racer Rekognition"
9. Clique sur **"Create access key"**

### E. ⚠️ IMPORTANT : Copier les clés MAINTENANT

10. Tu vas voir 2 informations **TRÈS IMPORTANTES** :

```
Access key ID: AKIA.....................
Secret access key: ........................................
```

11. **COPIE-COLLE ces deux valeurs** quelque part (Notepad, bloc-notes)
12. ⚠️ **TU NE POURRAS PLUS VOIR LE SECRET APRÈS** (une seule fois)
13. Clique sur **"Download .csv file"** pour sauvegarder (recommandé)
14. Clique sur **"Done"**

---

## Étape 4️⃣ : Tester les clés localement

### Reviens dans ton terminal et lance :

```bash
cd "C:\Users\shoot\Focus Racer"
node scripts/setup-aws.js
```

Le script va te demander :
1. **Région AWS** : tape `eu-west-1` (Paris = eu-west-3, Irlande = eu-west-1)
2. **AWS Access Key ID** : colle la clé qui commence par `AKIA...`
3. **AWS Secret Access Key** : colle la longue clé secrète

Si tout est bon, tu verras :
```
✅ Connexion AWS réussie !
📦 Collections Rekognition trouvées: 0
```

---

## Étape 5️⃣ : Configurer Render (2 min)

Le script t'a affiché les variables à copier. Maintenant :

1. Va sur [dashboard.render.com](https://dashboard.render.com)
2. Clique sur **"focus-racer"** (Web Service)
3. Clique sur l'onglet **"Environment"**
4. Pour chaque variable, clique sur **"Add Environment Variable"** :

```
AWS_REGION = eu-west-1
AWS_ACCESS_KEY_ID = AKIA.....................
AWS_SECRET_ACCESS_KEY = ........................................
AWS_REKOGNITION_COLLECTION_ID = focusracer-faces
```

5. Clique sur **"Save Changes"** en bas
6. Render va **redéployer automatiquement** (3-5 min)

---

## Étape 6️⃣ : Tester en production (après déploiement)

1. Une fois Render redéployé, va sur ton espace photographe
2. Upload 3 photos avec **mode Premium AWS Rekognition** (3 crédits/photo)
3. Les dossards devraient être détectés avec 85-95% de précision ! 🎉

---

## 🎁 Bonus : Free Tier AWS Rekognition

Tu as **GRATUITEMENT** pendant 12 mois :
- ✅ 1 000 images analysées par mois (DetectText pour OCR)
- ✅ 1 000 faces indexées par mois
- ✅ 1 000 recherches de faces par mois

**Parfait pour démarrer sans frais !** 🚀

---

## ❓ Problèmes ?

Si tu as une erreur, vérifie :
- [ ] Les clés sont correctes (pas d'espace avant/après)
- [ ] L'utilisateur IAM a bien `AmazonRekognitionFullAccess`
- [ ] La région est correcte (eu-west-1 ou eu-west-3)
- [ ] Les variables sont bien configurées sur Render

