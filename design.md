# PhytoCheck — Design de l'interface mobile

## Identité visuelle

- **Couleur principale** : `#0F7B5F` (vert foncé phyto) — rappelle la nature et les produits phytosanitaires
- **Couleur secondaire / header** : `#1A8A7D` (teal/sarcelle) — inspiré des captures d'écran
- **Couleur d'accent** : `#0A7EA4` (bleu canard) — pour les éléments interactifs
- **Fond clair** : `#F5F5F5` (gris très clair)
- **Fond blanc** : `#FFFFFF`
- **Texte principal** : `#1A1A1A` (noir profond)
- **Texte secondaire** : `#687076` (gris moyen)
- **Vert homologué** : `#22C55E`
- **Rouge retiré / PPNU** : `#EF4444`
- **Orange CMR** : `#F59E0B`
- **Rose toxique** : `#DC2626`

## Écrans de l'application

### 1. Accueil (Home)
- **Header** : Fond teal avec titre "PhytoCheck" et sous-titre "Vérifiez l'homologation de vos produits"
- **Boutons principaux** (3 cartes arrondies, fond teal, texte blanc) :
  - "Scanner un produit" (icône appareil photo)
  - "Recherche manuelle" (icône loupe)
  - "Gestion du stock" (icône boîte)
- **Carte info** : Fond blanc arrondi, affiche "BASE DE DONNÉES E-PHY", date de mise à jour, nombre de produits référencés (15 052)

### 2. Recherche (Rechercher)
- **Bandeau** : Fond teal avec compteur "X recherches restantes" (Freemium : 15 max, Premium : illimité)
- **Section recherche par nom ou AMM** :
  - Champ de saisie texte avec placeholder "Rechercher par nom ou AMM"
  - Bouton "Rechercher" (fond teal)
- **Section recherche par photo d'étiquette** :
  - Bouton "Scanner une étiquette" (fond teal, icône appareil photo)
  - Texte explicatif : "Prenez une photo de l'étiquette pour identifier le produit automatiquement"
- **Résultats de recherche** : Liste de cartes produit avec nom, AMM, statut (badge coloré)

### 3. Écran Résultat produit
- **Header** : Nom du produit et numéro AMM
- **Badge statut** : Couleur selon classification
  - Vert : "Homologué"
  - Rouge : "Retiré"
  - Orange : "Homologué — CMR"
  - Rose/Rouge foncé : "Homologué — Toxique"
- **Détails** :
  - Substances actives
  - Fabricant / Titulaire
  - Type de produit (Herbicide, Fongicide, etc.)
  - Formulation
  - Date de première autorisation
  - Date de retrait (si applicable)
  - Noms commerciaux secondaires
- **Phrases de risque** : Liste des codes H/EUH avec descriptions
- **Bouton** : "Ajouter au stock" (si le produit n'est pas déjà en stock)

### 4. Stock (Gestion du stock)
- **Header** : Fond teal avec "Gestion du stock" et compteur "Produits: X / 20" (Freemium) ou "X" (Premium)
- **Grille de statistiques** (2x2) :
  - Carte verte : nombre d'homologués
  - Carte rose : nombre de PPNU (Produits Plus Non Utilisables = retirés)
  - Carte orange : nombre de CMR
  - Carte rose foncé : nombre de Toxiques
- **Liste des produits en stock** : Cartes avec nom, AMM, badge statut, bouton supprimer (swipe)
- **État vide** : "Aucun produit dans le stock"

### 5. Premium
- **Header** : Fond teal avec "PhytoCheck Premium" et sous-titre "Débloquez toutes les fonctionnalités avancées"
- **Cartes avantages** :
  - "Recherches illimitées" — Gratuit : 15 recherches au total / Premium : Illimité
  - "Stock illimité" — Gratuit : 20 produits max / Premium : Illimité
  - "Export PDF professionnel" — Gratuit : Non disponible / Premium : Disponible
- **Bouton d'achat** : "Passer à Premium" avec prix (via Google Play Billing / Apple IAP)

### 6. À propos
- **Header** : Fond teal avec "À propos" et sous-titre "PhytoCheck - Vérifiez l'homologation de vos produits"
- **Carte version** : "Version 1.0.0"
- **Documents légaux** :
  - Bouton "Politique de Confidentialité"
  - Bouton "Conditions d'Utilisation"
- **Carte base de données** : "Les données de produits proviennent de la base E-Phy officielle, mise à jour le XX/XX/XXXX"

## Barre de navigation (Tab Bar)

5 onglets en bas de l'écran :
| Onglet | Icône | Label |
|--------|-------|-------|
| Accueil | Maison | Accueil |
| Recherche | Loupe | Recherc... |
| Stock | Boîte/Dossier | Stock |
| Premium | Étoile | Premium |
| À propos | Info (i) | À propos |

## Flux utilisateur principaux

### Flux 1 : Recherche manuelle
1. Accueil → Tap "Recherche manuelle" → Onglet Recherche
2. Saisir nom ou AMM → Tap "Rechercher"
3. Liste de résultats → Tap sur un produit
4. Écran Résultat avec classification et détails
5. Option "Ajouter au stock"

### Flux 2 : Scan d'étiquette
1. Accueil → Tap "Scanner un produit" → Ouverture caméra
2. Prise de photo de l'étiquette
3. OCR/reconnaissance du texte → Extraction nom/AMM
4. Recherche automatique dans la base
5. Écran Résultat avec classification
6. Option "Ajouter au stock"

### Flux 3 : Gestion du stock
1. Accueil → Tap "Gestion du stock" → Onglet Stock
2. Visualisation des statistiques (homologués, PPNU, CMR, toxiques)
3. Liste des produits stockés
4. Possibilité de supprimer un produit du stock

### Flux 4 : Passage Premium
1. Onglet Premium → Voir les avantages
2. Tap "Passer à Premium"
3. Dialogue d'achat Google Play / Apple IAP
4. Confirmation et déblocage des fonctionnalités

## Modèle Freemium / Premium

| Fonctionnalité | Gratuit | Premium |
|----------------|---------|---------|
| Recherches | 15 au total | Illimitées |
| Stock produits | 20 max | Illimité |
| Export PDF | Non | Oui |
| Scan étiquette | Oui | Oui |

## Compatibilité In-App Purchase

- **Android** : `react-native-iap` (compatible Google Play Billing Library v7+)
- **iOS** : `react-native-iap` (compatible StoreKit 2)
- **Note** : `expo-in-app-purchases` est déprécié, `react-native-iap` est la solution recommandée pour Expo SDK 54+
- L'achat sera géré localement avec validation côté client (pas de serveur requis pour la v1)

## Données

- **15 052 produits** référencés (12 415 retirés, 2 637 autorisés)
- **9 126 entrées** de phrases de risque
- **66 codes** de phrases de risque uniques (H et EUH)
- Stockage local des données CSV embarquées dans l'application
- Stockage local du stock utilisateur via AsyncStorage
