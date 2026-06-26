# Walkthrough Checkable — MemeAI jusqu'a l'APK release

Objectif final : livrer une application Android React Native CLI capable de generer et editer des memes, avec backend Node/Express, IA via une offre gratuite, et un APK release installable.

Contrainte absolue : aucune solution payante. Les outils, APIs, assets, polices, icones, stockage et services doivent rester gratuits ou open source.

---

## 0. Regles de travail

### 0.1 Git

- [ ] Travailler sur une branche de fonctionnalite si possible.
- [ ] Ne pas melanger UI, backend, permissions natives et release dans un seul commit.
- [ ] Faire un commit a chaque changement majeur valide.
- [ ] Avant chaque commit, lancer :

```sh
npm run verify
```

- [ ] Si une verification echoue, corriger avant de commit.

Messages de commit recommandes par phase :

- [ ] `feat: scaffold memeai mobile ui`
- [ ] `feat: add home packages and atelier editor`
- [ ] `feat: add context multimodal inputs`
- [ ] `feat: add settings and theme toggle`
- [ ] `feat: scaffold express backend`
- [ ] `feat: add gemini caption generation`
- [ ] `feat: connect mobile app to backend api`
- [ ] `feat: add media imports and permissions`
- [ ] `feat: prepare android release build`
- [ ] `docs: add development walkthrough`

### 0.2 Definition of Done

Une tache est terminee seulement si :

- [ ] Le code compile avec TypeScript.
- [ ] Les tests Jest passent.
- [ ] Le lint passe.
- [ ] L'ecran concerne a ete teste sur Android.
- [ ] Aucun secret API n'est dans le frontend.
- [ ] Le comportement attendu est note dans ce document ou dans le README.

### 0.3 Outils gratuits autorises

- [ ] React Native CLI.
- [ ] Android Studio et Android SDK.
- [ ] Node.js / Express.
- [ ] Gemini via Google AI Studio avec quota gratuit disponible au moment du TP.
- [ ] Git et GitHub/GitLab gratuit.
- [ ] Assets faits maison, emojis systeme, SVG/code maison, ou ressources libres.
- [ ] Aucun service SaaS payant.
- [ ] Aucune banque d'images payante.
- [ ] Aucun package imposant une licence commerciale.

---

## 1. Etat actuel de l'application mobile

### 1.1 Navigation

- [x] Onglet `Home`.
- [x] Onglet `Context`.
- [x] Onglet `Atelier`.
- [x] Onglet `Social`.
- [x] Onglet `Settings`.
- [x] Theme sombre/clair fonctionnel.
- [x] Icone d'application Android/iOS generee localement.
- [x] Navigation sans dependance visuelle aux fonts `react-native-vector-icons`.

### 1.2 Home

- [x] Affiche des packages de memes.
- [x] Chaque package est une bande horizontale scrollable.
- [x] Chaque package montre des apercus de memes.
- [x] Le bouton `Afficher` ouvre une vue qui montre tous les memes du package.
- [ ] Remplacer les donnees mockees par des donnees locales structurees.
- [ ] Ajouter une action "Utiliser ce meme" qui ouvre `Atelier`.
- [ ] Ajouter un etat vide si aucun package n'est disponible.

### 1.3 Context

- [x] Zone de texte principale.
- [x] Boutons camera, micro et import dans le champ.
- [x] Zone de sortie : aide, loading, resultat.
- [ ] Brancher camera.
- [ ] Brancher micro.
- [ ] Brancher import fichier.
- [ ] Envoyer le contexte au backend.
- [ ] Afficher erreurs reseau et erreurs IA.
- [ ] Ajouter bouton "Envoyer vers Atelier".

### 1.4 Atelier

- [x] Canvas type editeur avec fond quadrille.
- [x] Panneau d'outils en bas : Add, Text, Emoji, Sticker, GIF Sticker, Background.
- [x] Panneau ajuste pour ne pas etre masque par la tab bar.
- [ ] Ajouter selection d'image de fond.
- [ ] Ajouter calques texte.
- [ ] Ajouter deplacement/redimensionnement des calques.
- [ ] Ajouter suppression de calque.
- [ ] Ajouter export image.
- [ ] Ajouter partage Android.
- [ ] Ajouter sauvegarde locale.

### 1.5 Social

- [x] Hub social visuel.
- [x] Affiche WhatsApp, Instagram, TikTok, Facebook, X, Telegram.
- [ ] Definir le vrai perimetre : partage sortant seulement ou import entrant aussi.
- [ ] Brancher partage Android natif.
- [ ] Ajouter raccourci vers WhatsApp.
- [ ] Ajouter gestion si l'application cible n'est pas installee.

### 1.6 Settings

- [x] Toggle theme clair/sombre.
- [ ] Ajouter configuration URL backend.
- [ ] Ajouter affichage version app.
- [ ] Ajouter bouton vider cache local.
- [ ] Ajouter section credits/licences gratuites.

---

## 2. Architecture cible

### 2.1 Mobile

- [x] React Native CLI.
- [x] TypeScript.
- [x] Bottom tabs.
- [x] Theme local.
- [ ] Service API centralise dans `src/services/api.ts`.
- [ ] Types partages pour les reponses backend.
- [ ] Gestion d'etats `idle/loading/success/error`.
- [ ] Gestion permissions Android.

Structure cible :

```txt
src/
  components/
  navigation/
  screens/
  services/
    api.ts
  theme/
  types/
  utils/
```

### 2.2 Backend

- [ ] Creer dossier `backend/`.
- [ ] Initialiser projet Node gratuit :

```sh
mkdir backend
cd backend
npm init -y
npm install express multer dotenv cors
npm install --save-dev nodemon
```

- [ ] Ajouter `backend/index.js`.
- [ ] Ajouter `backend/.env.example`.
- [ ] Ajouter `backend/routes/context.js`.
- [ ] Ajouter `backend/routes/voice.js`.
- [ ] Ajouter `backend/routes/remixer.js`.
- [ ] Ajouter `backend/services/gemini.js`.
- [ ] Ajouter nettoyage automatique des uploads temporaires.

Endpoints cibles :

```txt
POST /api/context
POST /api/voice
POST /api/remixer
GET  /health
```

### 2.3 IA gratuite

- [ ] Creer une cle API sur Google AI Studio en utilisant l'offre gratuite disponible.
- [ ] Stocker la cle uniquement dans `backend/.env`.
- [ ] Ne jamais placer la cle dans React Native.
- [ ] Prevoir un fallback si le quota gratuit est atteint.
- [ ] Documenter les limites : quota, latence, erreurs possibles.

Fichier `.env.example` :

```env
PORT=3000
GEMINI_API_KEY=replace_me
```

---

## 3. Phase UI finale avant backend

### 3.1 Home

- [ ] Creer une source de donnees locale `src/data/memePackages.ts`.
- [ ] Deplacer les packages mockes hors de `HomeScreen`.
- [ ] Ajouter categories :
  - [ ] Reactions rapides.
  - [ ] Campus.
  - [ ] WhatsApp Status.
  - [ ] Travail/Famille.
- [ ] Ajouter bouton "Utiliser" sur chaque meme.
- [ ] Ajouter details package avec titre, description, nombre de memes.

### 3.2 Context

- [ ] Bouton camera : ouvrir placeholder "Camera bientot disponible".
- [ ] Bouton micro : ouvrir etat record mocke.
- [ ] Bouton import : ouvrir placeholder "Import fichier bientot disponible".
- [ ] Bouton creer : si texte vide, afficher message clair.
- [ ] Bouton creer : si texte present, afficher loading puis resultat.
- [ ] Ajouter actions resultat :
  - [ ] Modifier dans Atelier.
  - [ ] Sauvegarder.
  - [ ] Partager.

### 3.3 Atelier

- [ ] Ajouter barre superieure compacte : retour, titre, exporter.
- [ ] Ajouter panneau outils stable sur petits ecrans.
- [ ] Ajouter grille outils sans chevauchement avec la tab bar.
- [ ] Ajouter preview canvas responsive.
- [ ] Ajouter un calque texte par defaut.
- [ ] Ajouter selection d'outil visible.

### 3.4 Settings

- [ ] Afficher mode courant.
- [ ] Ajouter URL backend configurable.
- [ ] Ajouter bouton reset theme.
- [ ] Ajouter version `0.0.1`.

Validation UI :

- [ ] Tester sur petit telephone Android.
- [ ] Tester sur telephone normal.
- [ ] Tester rotation des ecrans si activee.
- [ ] Verifier aucun texte coupe.
- [ ] Verifier aucune zone masquee par la tab bar.
- [ ] Verifier theme clair.
- [ ] Verifier theme sombre.

---

## 4. Backend gratuit

### 4.1 Initialisation

- [ ] Creer `backend/package.json`.
- [ ] Installer uniquement des dependances gratuites/open source.
- [ ] Ajouter script dev :

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  }
}
```

- [ ] Ajouter route `/health`.
- [ ] Tester :

```sh
curl http://localhost:3000/health
```

### 4.2 Route context

- [ ] Recevoir `{ "text": "..." }`.
- [ ] Valider que `text` n'est pas vide.
- [ ] Limiter la taille du texte.
- [ ] Appeler Gemini via le backend.
- [ ] Retourner :

```json
{
  "caption": "texte du meme",
  "tone": "ironique"
}
```

- [ ] Gerer erreurs avec status HTTP clair.

### 4.3 Route voice

- [ ] Recevoir fichier audio `multipart/form-data`.
- [ ] Limiter taille fichier.
- [ ] Stocker temporairement dans `uploads/`.
- [ ] Envoyer a Gemini si quota gratuit disponible.
- [ ] Retourner transcription + caption.
- [ ] Supprimer le fichier temporaire apres traitement.

### 4.4 Route remixer

- [ ] Recevoir image.
- [ ] Limiter taille fichier.
- [ ] Envoyer image a Gemini Vision si disponible gratuitement.
- [ ] Retourner caption + suggestion.
- [ ] Supprimer le fichier temporaire apres traitement.

### 4.5 Securite minimale

- [ ] Ne pas exposer `GEMINI_API_KEY`.
- [ ] Ajouter `.env` dans `.gitignore`.
- [ ] Ajouter `.env.example`.
- [ ] Ajouter limites upload.
- [ ] Ajouter messages d'erreur non sensibles.
- [ ] Ajouter CORS local seulement pendant dev.

---

## 5. Integration mobile/backend

### 5.1 Service API

- [ ] Creer `src/services/api.ts`.
- [ ] Configurer `BASE_URL`.
- [ ] Ajouter `generateFromText(text)`.
- [ ] Ajouter `generateFromAudio(file)`.
- [ ] Ajouter `generateFromImage(file)`.
- [ ] Centraliser parsing JSON.
- [ ] Centraliser erreurs reseau.

### 5.2 Android local

- [ ] Pour emulateur Android, utiliser `http://10.0.2.2:3000`.
- [ ] Pour telephone physique, utiliser IP locale du PC.
- [ ] Verifier que le telephone et le PC sont sur le meme Wi-Fi.
- [ ] Verifier pare-feu si l'API ne repond pas.

### 5.3 Context branche

- [ ] Remplacer loading mocke par appel `POST /api/context`.
- [ ] Afficher caption reelle.
- [ ] Afficher tone reel.
- [ ] Gerer erreur quota IA.
- [ ] Gerer backend eteint.

---

## 6. Permissions et media Android

### 6.1 Permissions

- [ ] Ajouter permission micro :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

- [ ] Ajouter permissions images selon version Android :

```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

- [ ] Eviter `MANAGE_EXTERNAL_STORAGE` sauf justification forte, car c'est sensible.

### 6.2 Camera

- [ ] Choisir une librairie gratuite compatible React Native CLI.
- [ ] Demander permission camera au moment d'utiliser la camera.
- [ ] Tester refus permission.
- [ ] Tester acceptation permission.
- [ ] Envoyer l'image au backend.

### 6.3 Micro

- [ ] Choisir une librairie gratuite compatible React Native CLI.
- [ ] Demander permission micro au moment d'enregistrer.
- [ ] Afficher chronometre.
- [ ] Ajouter stop.
- [ ] Envoyer audio au backend.

### 6.4 Import fichier

- [ ] Choisir un picker gratuit/open source.
- [ ] Filtrer images/audio.
- [ ] Gerer annulation utilisateur.
- [ ] Envoyer fichier au backend.

---

## 7. Atelier editeur manuel

### 7.1 Donnees internes

- [ ] Definir un type `EditorLayer`.
- [ ] Supporter layers :
  - [ ] image.
  - [ ] text.
  - [ ] emoji.
  - [ ] sticker.
  - [ ] background.
- [ ] Stocker position x/y.
- [ ] Stocker taille.
- [ ] Stocker rotation si necessaire.
- [ ] Stocker style texte.

### 7.2 Interactions

- [ ] Selectionner un calque.
- [ ] Deplacer un calque.
- [ ] Redimensionner un calque.
- [ ] Supprimer un calque.
- [ ] Modifier texte.
- [ ] Changer couleur texte.
- [ ] Changer background.

### 7.3 Export

- [ ] Capturer le canvas en image.
- [ ] Sauvegarder dans galerie.
- [ ] Partager via Android share sheet.
- [ ] Verifier permission stockage si necessaire.

---

## 8. Social

### 8.1 Scope TP raisonnable

Version gratuite et realiste pour le TP :

- [ ] Partager un meme genere via Android share sheet.
- [ ] Proposer raccourcis visuels vers reseaux populaires.
- [ ] Ne pas integrer APIs officielles payantes/complexes.
- [ ] Ne pas demander login reseaux sociaux.

### 8.2 Validation

- [ ] Partage WhatsApp fonctionne si WhatsApp est installe.
- [ ] Partage Instagram fonctionne via share sheet si disponible.
- [ ] Si aucune app compatible, afficher message clair.

---

## 9. Tests

### 9.1 Tests automatiques

- [ ] `npm run typecheck`.
- [ ] `npm test -- --runInBand`.
- [ ] `npm run lint`.
- [ ] `npm run verify`.

### 9.2 Tests manuels mobile

- [ ] Lancement app.
- [ ] Splash visible.
- [ ] Icone app visible apres rebuild.
- [ ] Home scroll horizontal.
- [ ] Home bouton Afficher.
- [ ] Context texte vide.
- [ ] Context texte rempli.
- [ ] Atelier pas masque par tab bar.
- [ ] Social affiche reseaux.
- [ ] Settings toggle theme.
- [ ] Retour app apres passage background.

### 9.3 Tests backend

- [ ] `/health`.
- [ ] `/api/context` texte normal.
- [ ] `/api/context` texte vide.
- [ ] `/api/context` texte trop long.
- [ ] `/api/voice` sans fichier.
- [ ] `/api/remixer` sans fichier.
- [ ] Gestion quota IA.

---

## 10. APK release gratuit

### 10.1 Pre-release

- [ ] Verifier nom app dans `android/app/src/main/res/values/strings.xml`.
- [ ] Verifier icon app.
- [ ] Verifier versionName/versionCode dans `android/app/build.gradle`.
- [ ] Verifier aucune cle API dans le frontend.
- [ ] Verifier backend URL de production ou LAN selon demo.
- [ ] Lancer :

```sh
npm run verify
```

### 10.2 Keystore local gratuit

Creer une cle release localement avec `keytool` inclus avec Java/JDK :

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/memeai-release-key.keystore -alias memeai -keyalg RSA -keysize 2048 -validity 10000
```

- [ ] Ne pas commit le fichier `.keystore`.
- [ ] Ne pas publier les mots de passe.
- [ ] Ajouter les infos sensibles dans `android/gradle.properties` local ou variables d'environnement.
- [ ] Ajouter un exemple documente sans secret.

### 10.3 Configuration Gradle

- [ ] Configurer signing release dans `android/app/build.gradle`.
- [ ] Lire mots de passe depuis `gradle.properties`.
- [ ] Verifier que `.gitignore` exclut les secrets.

### 10.4 Build APK

Commande :

```sh
npm run android:release
```

APK attendu :

```txt
android/app/build/outputs/apk/release/app-release.apk
```

- [ ] Installer l'APK sur telephone.
- [ ] Verifier lancement.
- [ ] Verifier navigation.
- [ ] Verifier permissions.
- [ ] Verifier generation de meme avec backend allume.
- [ ] Faire une video demo 3 a 5 minutes.

---

## 11. Demo finale TP

Scenario conseille :

- [ ] Montrer l'icone MemeAI sur le telephone.
- [ ] Ouvrir l'application.
- [ ] Montrer `Home` et les packages.
- [ ] Ouvrir un package avec `Afficher`.
- [ ] Aller dans `Context`.
- [ ] Coller un texte.
- [ ] Generer un meme.
- [ ] Envoyer vers `Atelier` ou montrer l'atelier.
- [ ] Ajouter texte/sticker manuellement.
- [ ] Montrer `Social`.
- [ ] Montrer `Settings` et changer theme.
- [ ] Expliquer que la cle IA reste dans le backend.
- [ ] Montrer l'APK release installe.

---

## 12. Risques et parades

- [ ] Quota IA gratuit atteint : preparer reponses mockees pour demo.
- [ ] Backend inaccessible sur telephone : utiliser meme Wi-Fi et IP locale.
- [ ] Permissions Android refusees : afficher un message et permettre retry.
- [ ] WhatsApp statuses indisponibles : expliquer que le dossier existe seulement apres avoir vu des statuts.
- [ ] Release APK ne s'installe pas : verifier signature, versionCode, minSdk.
- [ ] Icônes vectorielles absentes : garder `IconSymbol` systeme.

---

## 13. Journal de progression

Utiliser cette section apres chaque session.

### Session 1

- [ ] Date :
- [ ] Objectif :
- [ ] Fait :
- [ ] Bloquants :
- [ ] Tests lances :
- [ ] Commit :

### Session 2

- [ ] Date :
- [ ] Objectif :
- [ ] Fait :
- [ ] Bloquants :
- [ ] Tests lances :
- [ ] Commit :

### Session 3

- [ ] Date :
- [ ] Objectif :
- [ ] Fait :
- [ ] Bloquants :
- [ ] Tests lances :
- [ ] Commit :
