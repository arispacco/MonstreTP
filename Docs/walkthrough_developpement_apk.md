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
- [x] Remplacer les donnees mockees par des donnees locales structurees.
- [x] Ajouter une action "Utiliser ce meme" qui ouvre `Atelier`.
- [x] Ajouter un etat vide si aucun package n'est disponible.

### 1.3 Context

- [x] Zone de texte principale.
- [x] Boutons camera, micro et import dans le champ.
- [x] Zone de sortie : aide, loading, resultat.
- [x] Brancher camera.
- [x] Brancher micro.
- [x] Brancher import fichier.
- [x] Envoyer le contexte au backend.
- [x] Afficher erreurs reseau et erreurs IA.
- [x] Ajouter bouton "Envoyer vers Atelier".

### 1.4 Atelier

- [x] Canvas type editeur avec fond quadrille.
- [x] Panneau d'outils en bas : Add, Text, Emoji, Sticker, GIF Sticker, Background.
- [x] Panneau ajuste pour ne pas etre masque par la tab bar.
- [x] Ajout de calques locaux sans dependance externe.
- [x] Selection et suppression simple de calque.
- [x] Changement de background mocke.
- [x] Ajouter selection d'image de fond.
- [x] Ajouter calques texte.
- [x] Ajouter deplacement/redimensionnement des calques.
- [x] Ajouter suppression de calque.
- [x] Ajouter export image.
- [x] Ajouter partage Android.
- [x] Ajouter sauvegarde locale.

### 1.5 Social

- [x] Hub social visuel.
- [x] Affiche WhatsApp, Instagram, TikTok, Facebook, X, Telegram.
- [x] Partage natif gratuit via Android share sheet.
- [x] Definir le vrai perimetre : partage sortant seulement ou import entrant aussi.
- [x] Brancher partage Android natif.
- [x] Ajouter raccourci vers WhatsApp.
- [x] Ajouter gestion si l'application cible n'est pas installee.

### 1.6 Settings

- [x] Toggle theme clair/sombre.
- [x] Ajouter configuration URL backend.
- [x] Ajouter affichage version app.
- [x] Ajouter bouton vider cache local.
- [x] Ajouter section credits/licences gratuites.

---

## 2. Architecture cible

### 2.1 Mobile

- [x] React Native CLI.
- [x] TypeScript.
- [x] Bottom tabs.
- [x] Theme local.
- [x] Service API centralise dans `src/services/api.ts`.
- [x] Types partages pour les reponses backend.
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
- [x] Creer dossier `backend/`.
- [x] Initialiser projet Node gratuit :

```sh
mkdir backend
cd backend
npm init -y
npm install express multer dotenv cors
npm install --save-dev nodemon
```

- [x] Ajouter `backend/index.js`.
- [x] Ajouter `backend/.env.example`.
- [x] Ajouter `backend/routes/context.js`.
- [x] Ajouter `backend/routes/voice.js`.
- [x] Ajouter `backend/routes/remixer.js`.
- [x] Ajouter `backend/services/gemini.js`.
- [x] Ajouter nettoyage automatique des uploads temporaires.

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

- [x] Creer une source de donnees locale `src/data/memePackages.ts`.
- [x] Deplacer les packages mockes hors de `HomeScreen`.
- [x] Ajouter categories :
  - [x] Reactions rapides.
  - [x] Campus.
  - [x] WhatsApp Status.
  - [x] Travail/Famille.
- [x] Ajouter bouton "Utiliser" sur chaque meme.
- [x] Ajouter details package avec titre, description, nombre de memes.

### 3.2 Context

- [x] Bouton camera : ouvrir placeholder "Camera bientot disponible".
- [x] Bouton micro : ouvrir etat record mocke.
- [x] Bouton import : ouvrir placeholder "Import fichier bientot disponible".
- [x] Bouton creer : si texte vide, afficher message clair.
- [x] Bouton creer : si texte present, afficher loading puis resultat.
- [x] Ajouter actions resultat :
  - [x] Modifier dans Atelier.
  - [x] Sauvegarder.
  - [x] Partager.

### 3.3 Atelier

- [x] Ajouter barre superieure compacte : retour, titre, exporter.
- [x] Ajouter panneau outils stable sur petits ecrans.
- [x] Ajouter grille outils sans chevauchement avec la tab bar.
- [x] Ajouter preview canvas responsive.
- [x] Ajouter un calque texte par defaut.
- [x] Ajouter selection d'outil visible.

### 3.4 Settings

- [x] Afficher mode courant.
- [x] Ajouter URL backend configurable.
- [x] Ajouter bouton reset theme.
- [x] Ajouter version `0.0.1`.

Validation UI :

- [x] Tester sur petit telephone Android.
- [x] Tester sur telephone normal.
- [x] Tester rotation des ecrans si activee.
- [x] Verifier aucun texte coupe.
- [x] Verifier aucune zone masquee par la tab bar.
- [x] Verifier theme clair.
- [x] Verifier theme sombre.

---

## 4. Backend gratuit

### 4.1 Initialisation

- [x] Creer `backend/package.json`.
- [x] Installer uniquement des dependances gratuites/open source dans le manifeste.
- [ ] Ajouter script dev :

```json
{
  "scripts": {
    "dev": "nodemon index.js",
    "start": "node index.js"
  }
}
```

- [x] Ajouter route `/health`.
- [x] Tester :

```sh
curl http://localhost:3000/health
```

### 4.2 Route context

- [x] Recevoir `{ "text": "..." }`.
- [x] Valider que `text` n'est pas vide.
- [x] Limiter la taille du texte.
- [x] Appeler Gemini via le backend si la cle est configuree.
- [x] Retourner :

```json
{
  "caption": "texte du meme",
  "tone": "ironique"
}
```

- [x] Gerer erreurs avec status HTTP clair.
- [x] Retourner un mock gratuit si `ALLOW_MOCK_AI=true`.

### 4.3 Route voice

- [x] Recevoir fichier audio `multipart/form-data`.
- [x] Limiter taille fichier.
- [x] Stocker temporairement dans `uploads/`.
- [x] Envoyer a Gemini si quota gratuit disponible.
- [x] Retourner transcription + caption.
- [x] Supprimer le fichier temporaire apres traitement.

### 4.4 Route remixer

- [x] Recevoir image.
- [x] Limiter taille fichier.
- [x] Envoyer image a Gemini Vision si disponible gratuitement.
- [x] Retourner caption + suggestion.
- [x] Supprimer le fichier temporaire apres traitement.

### 4.5 Securite minimale

- [x] Ne pas exposer `GEMINI_API_KEY`.
- [x] Ajouter `.env` dans `.gitignore`.
- [x] Ajouter `.env.example`.
- [x] Ajouter limites upload.
- [x] Ajouter messages d'erreur non sensibles.
- [x] Ajouter CORS local seulement pendant dev.

---

## 5. Integration mobile/backend

### 5.1 Service API

- [x] Creer `src/services/api.ts`.
- [x] Configurer l'URL backend depuis `Settings`.
- [x] Ajouter `generateFromText(text)`.
- [x] Ajouter `generateFromAudio(file)`.
- [x] Ajouter `generateFromImage(file)`.
- [x] Centraliser parsing JSON.
- [x] Centraliser erreurs reseau.

### 5.2 Android local

- [x] Pour emulateur Android, utiliser `http://10.0.2.2:3000`.
- [x] Pour telephone physique, utiliser IP locale du PC.
- [x] Verifier que le telephone et le PC sont sur le meme Wi-Fi.
- [x] Verifier pare-feu si l'API ne repond pas.

### 5.3 Context branche

- [x] Remplacer loading mocke par appel `POST /api/context`.
- [x] Afficher caption reelle ou fallback local.
- [x] Afficher tone reel ou fallback local.
- [x] Gerer erreur quota IA par fallback si backend le permet.
- [x] Gerer backend eteint cote mobile.

---

## 6. Permissions et media Android

### 6.1 Permissions

- [x] Ajouter permission micro :

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

- [x] Ajouter permissions images selon version Android :

```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

- [x] Eviter `MANAGE_EXTERNAL_STORAGE` sauf justification forte, car c'est sensible.

### 6.2 Camera

- [x] Choisir une librairie gratuite compatible React Native CLI.
- [x] Demander permission camera au moment d'utiliser la camera.
- [x] Tester refus permission.
- [x] Tester acceptation permission.
- [x] Envoyer l'image au backend.

### 6.3 Micro

- [x] Choisir une librairie gratuite compatible React Native CLI.
- [x] Demander permission micro au moment d'enregistrer.
- [x] Afficher chronometre.
- [x] Ajouter stop.
- [x] Envoyer audio au backend.

### 6.4 Import fichier

- [x] Choisir un picker gratuit/open source.
- [x] Filtrer images/audio.
- [x] Gerer annulation utilisateur.
- [x] Envoyer fichier au backend.

---

## 7. Atelier editeur manuel

### 7.1 Donnees internes

- [x] Definir un type `EditorLayer`.
- [x] Supporter layers :
  - [x] image.
  - [x] text.
  - [x] emoji.
  - [x] sticker.
  - [x] background.
- [x] Stocker position x/y.
- [x] Stocker taille.
- [x] Stocker rotation si necessaire.
- [x] Stocker style texte.

### 7.2 Interactions

- [x] Selectionner un calque.
- [x] Deplacer un calque.
- [x] Redimensionner un calque.
- [x] Supprimer un calque.
- [x] Modifier texte.
- [x] Changer couleur texte.
- [x] Changer background.

### 7.3 Export

- [x] Capturer le canvas en image.
- [x] Sauvegarder dans galerie.
- [x] Partager via Android share sheet.
- [x] Verifier permission stockage si necessaire.

---

## 8. Social

### 8.1 Scope TP raisonnable

Version gratuite et realiste pour le TP :

- [x] Partager un meme genere via Android share sheet.
- [x] Proposer raccourcis visuels vers reseaux populaires.
- [x] Ne pas integrer APIs officielles payantes/complexes.
- [x] Ne pas demander login reseaux sociaux.

### 8.2 Validation

- [x] Partage WhatsApp fonctionne si WhatsApp est installe.
- [x] Partage Instagram fonctionne via share sheet si disponible.
- [x] Si aucune app compatible, afficher message clair.

---

## 9. Tests

### 9.1 Tests automatiques

- [x] `npm run typecheck`.
- [x] `npm test -- --runInBand`.
- [x] `npm run lint`.
- [x] `npm run verify`.

### 9.2 Tests manuels mobile

- [x] Lancement app.
- [x] Splash visible.
- [x] Icone app visible apres rebuild.
- [x] Home scroll horizontal.
- [x] Home bouton Afficher.
- [x] Context texte vide.
- [x] Context texte rempli.
- [x] Atelier pas masque par tab bar.
- [x] Social affiche reseaux.
- [x] Settings toggle theme.
- [x] Retour app apres passage background.

### 9.3 Tests backend

- [x] `/health`.
- [x] `/api/context` texte normal.
- [x] `/api/context` texte vide.
- [x] `/api/context` texte trop long.
- [x] `/api/voice` sans fichier.
- [x] `/api/remixer` sans fichier.
- [x] Gestion quota IA.

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

- [x] Configurer signing release dans `android/app/build.gradle`.
- [x] Lire mots de passe depuis `gradle.properties` ou variables d'environnement.
- [x] Verifier que `.gitignore` exclut les secrets.
- [x] Ajouter `android/gradle.properties.example`.

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

- [x] Date : 2026-06-28
- [x] Objectif : Finaliser le backend Gemini, brancher les fonctionnalités d'import/caméra/micro et créer l'Atelier d'édition manuelle avec export image.
- [x] Fait : Implémenté l'AtelierScreen avancé avec drag and drop via PanResponder, preset gradients, text/sticker/emoji layers, export de canvas avec react-native-view-shot. Connecté le micro/caméra/picker natifs à l'API backend dans ContextScreen. Résolu les erreurs de compilation Jest/TypeScript.
- [x] Bloquants : Aucun.
- [x] Tests lances : npm run verify (passed!)
- [x] Commit : feat: integration complete et validation tp

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
