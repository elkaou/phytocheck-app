# PhytoCheck - Guide de Build et Publication

## Prérequis

Avant de commencer, assurez-vous d'avoir :

| Élément | Description |
|---------|-------------|
| **Compte Expo** | Connecté via `eas login` |
| **Compte Google Play Console** | Pour publier sur le Play Store |
| **Compte Apple Developer** | Pour publier sur l'App Store (99 $/an) |
| **Node.js 18+** | Installé sur votre machine locale |
| **EAS CLI** | Installé via `npm install -g eas-cli` |

---

## 1. Configuration initiale

### Connexion à Expo

```bash
eas login
```

### Lier le projet à votre compte Expo

```bash
cd phytocheck-app
eas init
```

Cela va créer un `projectId` dans votre `app.json` et lier le projet à votre compte Expo.

---

## 2. Configuration des identifiants (Credentials)

### Android - Keystore

Vous avez mentionné posséder déjà un keystore. Pour le configurer :

```bash
eas credentials --platform android
```

Sélectionnez "Keystore" puis "I want to upload my own keystore" et suivez les instructions pour fournir votre fichier `.jks` ou `.keystore`, le mot de passe du keystore, l'alias de la clé et le mot de passe de la clé.

Si vous souhaitez que EAS génère un nouveau keystore :

```bash
eas credentials --platform android
# Sélectionnez "Generate new keystore"
```

### iOS - Certificats et Provisioning

EAS peut gérer automatiquement les certificats iOS :

```bash
eas credentials --platform ios
```

EAS vous demandera de vous connecter à votre compte Apple Developer et gérera automatiquement la création du certificat de distribution et du provisioning profile.

**Apple Team ID** : `4be0624c-2bbd-48be-9ff8-19063048c684` (déjà configuré dans `eas.json`).

---

## 3. Profils de Build

Le fichier `eas.json` contient 4 profils de build :

| Profil | Usage | Format Android | iOS |
|--------|-------|----------------|-----|
| `development` | Test sur appareil physique | APK (debug) | Device build |
| `development-simulator` | Test sur simulateur iOS | APK (debug) | Simulator build |
| `preview` | Test interne (beta) | APK | Ad-hoc distribution |
| `production` | Publication sur les stores | AAB (app bundle) | App Store build |

---

## 4. Lancer un Build

### Build de développement (pour tester sur appareil)

```bash
# Android uniquement
pnpm eas:build:dev:android

# iOS uniquement
pnpm eas:build:dev:ios

# Les deux plateformes
pnpm eas:build:dev
```

### Build de preview (test interne)

```bash
# Android uniquement
pnpm eas:build:preview:android

# iOS uniquement
pnpm eas:build:preview:ios
```

### Build de production (publication)

```bash
# Android (génère un .aab pour le Play Store)
pnpm eas:build:prod:android

# iOS (génère un .ipa pour l'App Store)
pnpm eas:build:prod:ios
```

---

## 5. Publication sur les Stores

### Google Play Store

#### Prérequis Google Play

1. Créez votre application dans la **Google Play Console**.
2. Créez un **compte de service** pour l'API Google Play :
   - Allez dans Google Play Console > Paramètres > Accès API.
   - Créez un compte de service avec les permissions "Release manager".
   - Téléchargez le fichier JSON de la clé de service.
3. Mettez à jour `eas.json` avec le chemin vers la clé :

```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal",
  "releaseStatus": "draft"
}
```

#### Configurer le produit IAP sur Google Play

1. Google Play Console > Monétiser > Produits > Produits intégrés à l'application.
2. Créez un nouveau produit avec l'ID : **`phytocheck_premium`**.
3. Définissez le prix (ex: 4,99 €).
4. Activez le produit.

#### Soumettre sur Google Play

Avant de soumettre, ajoutez la section `submit` dans `eas.json` :

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-service-account.json",
      "track": "internal",
      "releaseStatus": "draft"
    }
  }
}
```

Puis lancez :

```bash
pnpm eas:submit:android
```

### Apple App Store

#### Prérequis App Store

1. Créez votre application dans **App Store Connect**.
2. Renseignez l'**Apple ID** et l'**ASC App ID** dans `eas.json` :

```json
"ios": {
  "appleId": "votre@email.com",
  "ascAppId": "1234567890",
  "appleTeamId": "4be0624c-2bbd-48be-9ff8-19063048c684"
}
```

#### Configurer le produit IAP sur App Store

1. App Store Connect > Votre app > Fonctionnalités > Achats intégrés.
2. Créez un nouvel achat intégré de type "Non-consommable".
3. ID de référence : **`phytocheck_premium`**.
4. Définissez le prix (ex: 4,99 €).
5. Ajoutez les informations de localisation (nom, description).

#### Soumettre sur l'App Store

Avant de soumettre, ajoutez la section iOS dans `submit` de `eas.json` :

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "votre@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "4be0624c-2bbd-48be-9ff8-19063048c684"
    }
  }
}
```

Puis lancez :

```bash
pnpm eas:submit:ios
```

---

## 6. Mises à jour OTA (Over-The-Air)

Pour pousser des mises à jour JavaScript sans repasser par les stores :

```bash
pnpm eas:update
```

Cela permet de corriger des bugs ou d'ajouter du contenu sans soumettre une nouvelle version aux stores.

---

## 7. Identifiants de l'application

| Paramètre | Valeur |
|-----------|--------|
| **Package Android** | `siteswebs.phytocheck.app.t20260219` |
| **Bundle ID iOS** | `siteswebs.phytocheck.app.t20260219` |
| **Apple Team ID** | `4be0624c-2bbd-48be-9ff8-19063048c684` |
| **Product ID IAP** | `phytocheck_premium` |
| **Version** | `1.0.0` |

---

## 8. Résolution de problèmes courants

### "Cannot find native module ExpoIap"

Ce message est normal en mode web ou dans Expo Go. Le module natif `expo-iap` ne fonctionne que dans un **development build** ou un **build de production**. Lancez un build de développement pour tester les achats in-app.

### Erreur de keystore Android

Si vous rencontrez des problèmes avec votre keystore existant :

```bash
eas credentials --platform android
# Sélectionnez "Remove current keystore" puis "Upload a keystore"
```

### Erreur de provisioning iOS

```bash
eas credentials --platform ios
# Sélectionnez "Let EAS handle it" pour une gestion automatique
```

---

## 9. Commandes utiles

```bash
# Vérifier la configuration
eas config

# Voir les builds en cours
eas build:list

# Voir les credentials configurés
eas credentials

# Mettre à jour les métadonnées
eas metadata:push

# Vérifier la santé du projet
npx expo-doctor
```
