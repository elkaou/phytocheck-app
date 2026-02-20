# PhytoCheck TODO

- [x] Configuration du thème (couleurs teal/vert, typographie)
- [x] Intégration du logo fourni (icon.png)
- [x] Navigation par onglets (5 onglets : Accueil, Recherche, Stock, Premium, À propos)
- [x] Écran Accueil avec boutons Scanner, Recherche manuelle, Gestion stock + carte info base de données
- [x] Préparation des données CSV en JSON embarqué (produits + phrases de risque)
- [x] Écran Recherche avec saisie manuelle par nom ou AMM
- [x] Fonctionnalité de scan d'étiquette via appareil photo (OCR)
- [x] Logique de classification des produits (Homologué, Retiré, CMR, Toxique)
- [x] Écran Résultat produit avec détails complets et badge de classification
- [x] Écran Stock avec grille de statistiques et liste des produits stockés
- [x] Ajout/suppression de produits au stock (AsyncStorage)
- [x] Compteur de recherches restantes (Freemium : 15 max)
- [x] Limite de stock (Freemium : 20 produits max)
- [x] Écran Premium avec comparaison Gratuit/Premium
- [x] Intégration expo-iap pour Google Play Billing et Apple IAP
- [x] Écran À propos avec version, documents légaux et info base de données
- [x] Tests unitaires pour la logique de classification et du store
- [ ] Export PDF du stock (fonctionnalité Premium)
- [x] Bug : OCR non disponible lors du scan d'étiquette sur appareil physique
- [x] Bug : Produits multi-AMM (ex: FOLY R) — demander quel AMM quand un produit a plusieurs AMM avec statuts différents
- [x] Bug : Badge "Homologué Toxique" doit être en orange foncé (pas rouge)
- [x] Bug : Décompte des recherches doit compter par action de recherche (manuelle ou scan), pas par nombre de résultats
- [x] Ajouter champ quantité au stock avec possibilité d'incrémenter si produit déjà en stock
- [x] Bug : Recherche ne trouve pas les produits par noms secondaires (ex: BELKAR)
- [x] Afficher le nom secondaire trouvé dans les résultats de recherche
- [x] Intégration expo-iap pour Google Play Billing et Apple IAP
- [x] Créer le service IAP (connexion store, achat, restauration, vérification)
- [x] Intégrer les boutons d'achat réels dans l'écran Premium
- [x] Configurer les product IDs pour abonnement/achat unique Premium (phytocheck_premium)
- [x] Installer et configurer EAS CLI (v18.0.1)
- [x] Créer eas.json avec profils development, preview et production
- [x] Configurer le keystore Android (via eas credentials)
- [x] Configurer les credentials iOS (Apple Team ID intégré)
- [x] Documenter les instructions de build et publication (BUILD_GUIDE.md)
- [x] Bug : eas.json contient des champs vides non autorisés (submit) — section submit retirée
- [x] Migrer d'achat unique vers abonnements mensuels et annuels
- [x] Mettre à jour le service IAP pour supporter les subscriptions
- [x] Mettre à jour l'écran Premium avec les deux options d'abonnement
- [x] Mettre à jour la documentation BUILD_GUIDE.md avec les IDs d'abonnements
- [x] Bug : Erreur d'analyse lors du scan photo (erreur de connexion internet)
- [x] Ajouter saisie de quantité et unité (L ou Kg) lors de l'ajout au stock
- [x] Ajouter focus automatique sur les résultats après recherche manuelle ou scan
- [x] Modifier le label "Homologués" en "Homologués non CMR, non toxique" dans l'écran stock
- [x] Ajouter des filtres cliquables sur les cartes statistiques (Homologués, PPNU, CMR, Toxiques)
- [x] Modifier la couleur principale (primary) en bleu #0a7ea5
- [x] Modifier la couleur de focus des onglets (tint) en orange #F4830B
- [x] Créer la politique de confidentialité (Privacy Policy)
- [x] Créer les conditions d'utilisation (Terms of Service) avec décharge de responsabilité
- [x] Créer les versions HTML pour publication sur GitHub Pages
- [x] Ajouter les liens "Politique de confidentialité" et "Conditions d'utilisation" dans l'onglet "À propos"
- [x] Créer les pages de visualisation avec bouton "Fermer"
- [x] Bug : Scan photo et galerie ne fonctionnent pas (erreur d'analyse)
- [x] Bug : Recherche "SWITCH" donne un résultat illisible
- [x] Bug : Cliquer sur "Foly R" AMM 9900115 affiche "Centurion R" au lieu de "Foly R"
- [x] Bug : Bouton "Ajouter au stock" inerte (dialogue ne s'affiche pas)
- [x] Rendre la croix rouge cliquable pour supprimer un produit du stock
- [x] Rediriger vers l'onglet "Recherche" après ajout d'un produit au stock
- [x] Afficher le nom secondaire dans le stock (ex: "Centurion R (Foly R)")
- [x] Bug persistant : Affichage vertical des noms courts (SWITCH, ALLIE) dans les résultats de recherche
- [x] Bug persistant : Scan photo s'arrête immédiatement avec erreur d'analyse

## Build 15 - Nouveaux bugs à corriger

- [x] Bug : Label "Homologué non CMR, non toxique" tronqué dans les résultats de recherche (affiche "Homologué non CMR, no")
- [x] Bug : Modal d'ajout au stock avec champ quantité pré-rempli "1" et boutons "Annul" et "Ajo" tronqués
- [x] Bug : Scan photo retourne toujours "Erreur d'analyse" malgré les corrections du build 15 (erreur immédiate = lecture fichier)

## Build 16 - Nouvelles corrections

- [x] Bug : Scan photo ne fonctionne toujours pas malgré l'utilisation de fetch() → utilisation de manipulateAsync pour normaliser l'URI
- [x] Modifier les prix des abonnements : 9,99€/mois et 19,99€/an

## Build 17 - Nouvelles corrections

- [x] Bug : Scan photo ne fonctionne toujours pas (erreur rapide même avec manipulateAsync) → utilisation de base64 direct depuis ImagePicker/Camera
- [x] Modifier la date de mise à jour à 19/02/2026

## Build 18 - Amélioration majeure

- [x] Scan photo : utilisation systématique de manipulateAsync avec option base64:true pour convertir l'image (fonctionne pour caméra et galerie)
