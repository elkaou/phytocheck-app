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

## Build 19 - Amélioration de la reconnaissance

- [x] Le scan photo ne reconnaît toujours pas les produits correctement → adoption de la méthode label-scanner : FileSystem.readAsStringAsync direct + allowsEditing

## Build 21 - Build APK pour débogage

- [x] Créer un build APK (au lieu de AAB) pour permettre l'installation directe et le débogage avec Chrome DevTools
- [x] Erreur immédiate après prise de photo → FileSystem.readAsStringAsync() ne peut pas lire l'URI caméra directement → utilisation de manipulateAsync pour normaliser l'URI puis FileSystem pour lire le base64

## Build 22 - Diagnostic clé trouvé

- [x] L'ancienne version fonctionnelle demandait de recadrer la photo (allowsEditing), la nouvelle non → Remplacement de CameraView par ImagePicker.launchCameraAsync avec allowsEditing: true pour caméra ET galerie

## Build 23 - Erreur après recadrage

- [x] Le recadrage fonctionne mais erreur "une erreur est survenue lors de l'analyse de l'image" après → utilisation de manipulateAsync avec base64:true pour obtenir un base64 fiable directement (sans FileSystem.readAsStringAsync qui peut corrompre)

## Build 24 - Analyse de l'ancienne version fonctionnelle

- [x] Comparer routers.ts et trpc.ts de l'ancienne version avec la version actuelle pour identifier la différence critique
- [x] Appliquer uniquement la correction nécessaire au scan photo sans modifier le reste de l'application
  * Changement de imageBase64 à imageUrl (Data URL) dans le endpoint ocr.analyzeLabel
  * Envoi direct de la Data URL au LLM (pas d'upload S3)
  * Prompt système détaillé de l'ancienne version avec instructions précises
  * Côté client : création de Data URL `data:image/jpeg;base64,${base64}`

## Build 25 - Ne fonctionne toujours pas

- [x] Comparer label-scanner.tsx fonctionnel avec scan.tsx actuel pour identifier les différences exactes
- [x] Appliquer les corrections identifiées
  * Utilisation de FileSystem.readAsStringAsync directement (sans manipulateAsync)
  * Ajout d'un endpoint analyzeLabel à la racine du router (comme dans l'ancienne version)
  * Format de réponse avec { success, data: { productName, amm, function } }
  * Adaptation du code client pour utiliser result.data.productName au lieu de result.nom

## Build 26 - Toujours la même erreur

- [x] Ajouter des logs détaillés pour afficher l'erreur complète dans une alerte au lieu de "Erreur d'analyse"

## Build 27 - Problème identifié : URL relative au lieu d'absolue

- [x] Erreur "Invalid URL: /api/trpc/analyzeLabel?batch=1" → L'URL tRPC est relative au lieu d'être absolue (https://...) → Android ne sait pas quel serveur contacter
  * Ajout de la variable d'environnement EXPO_PUBLIC_API_BASE_URL avec l'URL complète du serveur API

## Build 28 - Même erreur : variable d'environnement non incluse dans le build

- [x] La variable EXPO_PUBLIC_API_BASE_URL n'est pas incluse dans les builds EAS → Codé en dur l'URL du serveur API dans oauth.ts (ligne 50-52)

## Build 29 - Scan fonctionne mais ne trouve pas les noms secondaires

- [x] L'IA détecte correctement les noms (Belkar, Rackam) mais la recherche ne trouve pas les produits
- [x] La recherche actuelle cherche uniquement dans les noms principaux
- [x] Corriger la logique de recherche pour inclure les noms secondaires des produits
- [x] Améliorer la normalisation pour supprimer les symboles ®, ™, ©, etc.

## Build 31 - Améliorations UX après tests réels

- [x] Bug : Le produit ajouté au stock affiche le nom principal au lieu du nom secondaire détecté (ex: affiche nom principal au lieu de "MOVENTO")
- [x] Bug : Disposition de la fenêtre "Ajouter au stock" - les boutons "Ajouter (L)" et "Ajouter (Kg)" sont mal positionnés avec le clavier numérique (ajout ScrollView)
- [x] Amélioration : Supprimer l'étape de redimensionnement (allowsEditing) lors du scan photo pour éviter le double recadrage
- [x] Bug : Texte en bas de l'écran Premium (informations abonnement Google Play) peu lisible (bleu foncé sur fond bleu) → texte blanc avec fond semi-transparent
- [x] Amélioration : Vider le champ de saisie "nom ou AMM" quand on clique sur l'onglet "Recherche"
- [x] Amélioration : Masquer la section de recherche après validation et afficher uniquement les résultats

## Build 32 - Bug couleur iOS

- [x] Bug : La page d'accueil iOS s'affiche avec un fond vert au lieu du fond bleu utilisé sur les autres pages (remplacé bg-primary par couleur bleue directe)

## Build 34 - Amélioration UX recherche

- [x] Ajouter un bouton "Nouvelle recherche" fixe en haut de l'écran de recherche pour réinitialiser après affichage des résultats

## Build 35 - Amélioration disposition modal stock

- [x] Réorganiser la modal "Ajouter au stock" en grille 2x2 : ligne 1 (L | Kg), ligne 2 (Ajouter | Annuler)

## Build 36 - Export PDF du stock (Premium)

- [x] Ajouter un bouton "Export en PDF" en haut de la page Stock
- [x] Le bouton est actif uniquement pour les utilisateurs Premium
- [x] Implémenter la génération du PDF avec la liste du stock (expo-print + expo-sharing)

## Build 37 - Corrections modal et nom produit

- [x] Bug : Modal "Ajouter au stock" doit avoir 2 champs de saisie (L et Kg) au lieu de boutons de sélection
- [x] Bug : Le stock affiche le nom principal (GLOBUS) au lieu du nom détecté par l'IA (Rackam) quand c'est un nom secondaire → Inversé l'affichage pour montrer le nom secondaire en priorité

## Build 38 - Champs mutuellement exclusifs

- [x] Amélioration : Rendre les champs L et Kg mutuellement exclusifs dans la modal "Ajouter au stock" (si on remplit L, Kg se vide automatiquement et inversement)

## Build 39 - Bug scan photo nom secondaire

- [x] Bug critique : Le scan photo détecte "Belkar" mais affiche et stocke "Mozzar" (nom principal) au lieu du nom secondaire détecté par l'IA
- [x] La recherche manuelle fonctionne correctement (affiche et stocke le nom secondaire)
- [x] Solution : Rediriger vers l'écran de recherche avec le nom détecté par l'IA (même logique que la recherche manuelle)

## Build 40 - Amélioration détection nom produit

- [x] Problème : L'IA détecte "Belkar™ Arylex™ active" au lieu de juste "Belkar", donc la recherche échoue
- [x] Solution : Essayer plusieurs stratégies de recherche (nom complet, puis chaque mot individuellement jusqu'à trouver un résultat)

## Build 41 - Corrections UX et erreur JSON

- [x] Bug UX : Modal "Ajouter au stock" trop basse, le pavé numérique cache les boutons "Ajouter" et "Annuler" → Repositionnée en haut de l'écran
- [x] Bug affichage : Dans la modal "Ajouter au stock", le nom du produit principal est affiché au lieu du nom secondaire pour les produits secondaires → Corrigé
- [x] Bug critique : Erreur JSON Parse "Unexpected character: <" lors de l'analyse IA (caractères spéciaux dans la réponse) → Nettoyage des caractères spéciaux côté serveur

## Build 42 - Correction définitive JSON Parse

- [x] Bug critique persistant : L'erreur JSON Parse "Unexpected character: <" apparaît toujours sur iPhone et Android malgré le build 41
- [x] Cause identifiée : Le nettoyage se faisait APRÈS le parsing JSON, donc trop tard
- [x] Solution : Nettoyer le contenu JSON AVANT le parsing (suppression des balises HTML, symboles trademark, guillemets intelligents)

## Investigation - Erreur JSON Parse persistante

- [ ] L'erreur "JSON Parse error: Unexpected character: <" persiste même avec une image blanche
- [ ] Vérifier que le serveur a bien été redémarré avec le nouveau code du build 42
- [ ] Vérifier quelle version de l'app est installée sur les appareils de test
- [ ] Le problème peut venir du fait que les modifications serveur ne sont pas encore déployées

## Build 43 - Déploiement serveur backend sur Railway

- [ ] Préparer les fichiers de configuration Railway (railway.json, Procfile)
- [ ] Créer un compte Railway.app
- [ ] Déployer le serveur backend sur Railway
- [ ] Récupérer l'URL de production Railway
- [ ] Configurer EXPO_PUBLIC_API_BASE_URL avec l'URL de production
- [ ] Relancer les builds 43 Android et iOS avec l'URL de production

## Build 47 - Déploiement backend Render et mise à jour URL production

- [x] Mettre à jour constants/oauth.ts avec l'URL Render (https://phytocheck-backend.onrender.com)
- [x] Incrémenter versionCode et buildNumber à 47
- [x] Lancer les builds EAS Android et iOS (Android versionCode 32, iOS buildNumber 36)
- [ ] Configurer les variables d'environnement Render pour l'IA (BUILT_IN_FORGE_API_URL, BUILT_IN_FORGE_API_KEY, etc.)

## Nouveau bug - Erreur "Aborted" lors du scan photo

- [ ] Bug : Le scan photo retourne "Erreur d'analyse - Aborted" après ~30 secondes d'attente
- [ ] Vérifier que le backend Render est bien en ligne et répond
- [ ] Vérifier que les variables d'environnement Render sont configurées (notamment BUILT_IN_FORGE_API_KEY)
- [ ] Vérifier les logs Render pour voir l'erreur exacte
- [ ] Tester l'endpoint /api/trpc/analyzeLabel directement avec curl

## Nouveaux bugs - Achat Premium et avertissement Android 15

- [ ] Bug : Erreur "L'abonnement n'a pas pu être finalisé" lors de l'achat Premium
- [ ] Vérifier la configuration des product IDs dans Google Play Console
- [ ] Vérifier que les abonnements sont bien publiés et actifs
- [ ] Avertissement Google Play : Services de premier plan restreints (Android 15) - expo-audio
- [ ] Retirer expo-audio des dépendances si non utilisé

## Build 48 - Correction format Google Play Billing v5+

- [x] Bug critique : L'achat d'abonnement Premium échoue avec "L'abonnement n'a pas pu être finalisé"
- [x] Cause identifiée : Format incorrect des product IDs (phytocheck_premium:monthly au lieu du format Google Play Billing v5+)
- [x] Solution : Utiliser uniquement l'ID de base (phytocheck_premium) et spécifier le base plan via offerToken lors de l'achat
- [x] Refonte complète de iap-service.ts et iap-context.tsx pour supporter Google Play Billing v5+ avec base plans
- [x] Correction des tests unitaires pour utiliser les nouveaux noms de constantes

## Apple App Review - Build 34 refusé (24 février 2026)

- [x] **Guideline 5.1.1** : Changer le bouton "Autoriser" en "Continuer" ou "Next" dans la demande de permission caméra
- [ ] **Guideline 2.3.3** : Créer de vrais screenshots iPad (actuellement ce sont des screenshots iPhone étirés)
- [ ] **Guideline 2.1** : Soumettre les produits IAP pour review dans App Store Connect avec screenshots
- [x] **Guideline 2.1** : Corriger le bug "érreur après tap sur Souscrire maintenant" (problème IAP iOS) - Corrigé dans Build 48
- [x] **Guideline 2.5.4** : Retirer "audio" de UIBackgroundModes dans Info.plist (pas de feature audio persistante)

## Build 50 - Correction product IDs iOS

- [x] Mettre à jour les product IDs iOS pour correspondre à App Store Connect : `phytocheck.premium.monthly` et `phytocheck.premium.yearly` (avec points, pas underscores)
- [x] Adapter le code IAP pour gérer les product IDs différents entre iOS (avec points) et Android (avec underscores)
- [x] Mettre à jour les tests unitaires pour utiliser les nouveaux noms de constantes

## Build 51 - Correction services de premier plan Android 15+

- [x] Retirer les services audio de premier plan (foreground services) qui causent l'avertissement Google Play
- [x] Retirer expo-audio de app.config.ts et package.json (PhytoCheck n'utilise pas l'audio)
- [x] Corriger les API obsolètes pour l'affichage de bord à bord (edge-to-edge) dans Android 15 - Retiré edgeToEdgeEnabled
- [x] Supprimer les restrictions de redimensionnement et d'orientation pour appareils à grand écran (Android 16) - Orientation changée de "portrait" à "default"
- [x] Régénérer pnpm-lock.yaml après suppression d'expo-audio pour corriger l'erreur de build EAS

## Build 52 - Correction configuration IAP Android/iOS

- [ ] Corriger les product IDs pour correspondre à la structure Google Play Console : un abonnement `phytocheck_premium` avec deux base plans `monthly` et `yearly`
- [ ] Vérifier et corriger la logique de chargement des produits pour Android (Google Play Billing v5+)
- [ ] Vérifier et corriger la logique de chargement des produits pour iOS (StoreKit)

## Build 52 - Refonte graphique modal "Ajouter au stock"

- [x] Créer un checkpoint de sauvegarde avant modifications
- [x] Refaire le modal quantity-modal.tsx avec le style original (fond semi-transparent, design épuré, sélecteur d'unité avec boutons L/Kg)

## Build 53 - Logs de débogage IAP

- [x] Ajouter des logs console.log détaillés dans iap-context.tsx pour diagnostiquer le problème "Produit non trouvé"
- [x] Logger les product IDs demandés, les produits reçus, et les erreurs exactes de Google Play Billing
- [x] Ajouter une alerte avec le message d'erreur complet pour faciliter le débogage

## Build 54 : Écran de débogage IAP avec informations visibles

- [x] Créer l'écran de débogage IAP (app/iap-debug.tsx)
- [x] Afficher le statut général (plateforme, connexion IAP, statut Premium)
- [x] Afficher les product IDs configurés (Android et iOS)
- [x] Afficher les produits chargés depuis Google Play / App Store
- [x] Afficher les prix détectés (mensuel et annuel)
- [x] Afficher les diagnostics et recommandations
- [x] Ajouter un bouton "Débogage IAP" dans l'écran Premium
- [x] Incrémenter versionCode et buildNumber à 54

## Build 55 : Affichage du numéro de build et écran de débogage IAP

- [x] Ajouter le numéro de build dans l'écran À propos (ex: "Version 1.0.0 (Build 55)")
- [x] Vérifier que l'écran de débogage IAP existe (app/iap-debug.tsx)
- [x] Vérifier que le bouton "🔧 Débogage IAP" est présent dans l'écran Premium
- [x] Incrémenter versionCode et buildNumber à 55

## Build 56 : Correction affichage buildNumber sur Android

- [x] Corriger app/(tabs)/about.tsx pour lire android.versionCode au lieu de ios.buildNumber
- [x] Tester que le buildNumber s'affiche correctement sur Android
- [x] Incrémenter versionCode à 56

## Build 58 : Correction IAP type 'subs' + nom développeur

- [x] Ajouter type: 'subs' dans fetchProducts Android (cause racine du problème IAP)
- [x] Incrémenter versionCode et buildNumber à 58
- [x] Remplacer le nom incorrect par "François Courouble" dans PRIVACY_POLICY.md
- [x] Remplacer le nom incorrect par "François Courouble" dans TERMS_OF_SERVICE.md

## Build 58 (suite) : Correction modal "Ajouter au stock"

- [x] Remonter le modal en haut de l'écran pour que les boutons restent visibles avec le clavier
- [x] Réduire les boutons d'unité à "L" et "Kg" seulement (plus compacts)

## Corrections et nouvelles fonctionnalités - 28 février 2026

- [x] Vérifier et corriger la limite recherches/stock pour Premium (doit être infinie côté logique)
- [x] Trier le stock par ordre alphabétique
- [x] Système identifiant appareil : table devices MySQL + endpoints tRPC device.sync et device.incrementSearch
- [x] Intégration expo-application côté app + synchronisation compteur avec backend

## Mise à jour base de données E-PHY - 28/02/2026

- [x] Mise à jour products.json avec les nouveaux CSV E-PHY (15052 → 15058 produits, +6 nouveaux)
- [x] Mise à jour risk-phrases.json (2472 → 2478 AMM avec phrases de risque, +6)
- [x] Mise à jour DB_UPDATE_DATE à "28/02/2026" dans product-service.ts
- [x] Script de conversion CSV→JSON créé (convert_ephy_to_json.py) et intégré dans le projet

## Build 59 - Problèmes identifiés le 01/03/2026

- [ ] Bug : Date et nombre de produits affichent encore 19/02/2026 / 15 052 dans le build 58 (mise à jour nécessite un nouveau build EAS)
- [ ] Bug critique : Résiliation abonnement Google Play ne révoque pas le Premium dans l'application (isPremium reste "oui" dans la BDD Render)
- [ ] Analyser et corriger le mécanisme de vérification/révocation Premium côté serveur Render

## Build 59 - Corrections critiques

- [x] Bug : Date/produits incorrects dans build 58 (build fait le 27/02, données mises à jour le 28/02) → corrigé dans build 59
- [x] Bug critique : isPremium reste actif après résiliation Google Play → AppProvider n'envoie plus isPremium:true au démarrage ; IAPProvider appelle onPremiumChange(false) quand getAvailablePurchases retourne vide
- [x] Incrémenter versionCode à 59 dans app.config.ts
