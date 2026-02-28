# Politique de Confidentialité de PhytoCheck

**Dernière mise à jour : 20 février 2026**

## Introduction

PhytoCheck est une application mobile développée par François Courouble qui permet aux utilisateurs de vérifier l'homologation des produits phytosanitaires en France. Cette politique de confidentialité explique comment l'application collecte, utilise et protège vos données.

## Données collectées

### Données personnelles

PhytoCheck **ne collecte aucune donnée personnelle identifiable**. L'application ne demande pas et ne stocke pas :
- Nom, prénom ou coordonnées
- Adresse email (sauf pour la gestion des abonnements via Google Play)
- Numéro de téléphone
- Localisation géographique
- Adresse IP

### Données d'utilisation

L'application stocke localement sur votre appareil :
- **Liste de produits en stock** : Les produits que vous ajoutez à votre stock personnel sont stockés uniquement sur votre appareil via AsyncStorage (stockage local)
- **Historique de recherches** : Le compteur de recherches gratuites est stocké localement pour gérer la limite de 20 recherches
- **Statut Premium** : L'état de votre abonnement Premium est vérifié via Google Play Billing

Ces données **ne sont jamais transmises à des serveurs externes** et restent sur votre appareil. Elles sont supprimées si vous désinstallez l'application.

## Permissions demandées

### Appareil photo (android.permission.CAMERA)

L'application demande l'accès à votre appareil photo **uniquement pour scanner les étiquettes de produits phytosanitaires**. Cette fonctionnalité vous permet de :
- Prendre une photo de l'étiquette d'un produit
- Extraire automatiquement le nom du produit et son numéro AMM (Autorisation de Mise sur le Marché)
- Rechercher le produit dans la base de données E-Phy

**Important** :
- Les photos ne sont **jamais sauvegardées** sur votre appareil
- Les photos ne sont **jamais envoyées à des serveurs tiers**
- Les photos sont traitées temporairement en mémoire pour l'analyse OCR (reconnaissance de texte), puis immédiatement supprimées
- Vous pouvez refuser cette permission et utiliser la recherche manuelle à la place

### Stockage (android.permission.READ_EXTERNAL_STORAGE)

Cette permission permet de sélectionner une photo depuis votre galerie pour scanner une étiquette. Elle est optionnelle et n'est utilisée que si vous choisissez cette option.

## Utilisation des données

Les données sont utilisées exclusivement pour :
1. **Vérifier l'homologation des produits** : Recherche dans la base de données E-Phy (publique, fournie par le Ministère de l'Agriculture français)
2. **Gérer votre stock personnel** : Stockage local des produits que vous ajoutez
3. **Gérer les abonnements Premium** : Vérification du statut d'abonnement via Google Play Billing

## Partage des données

PhytoCheck **ne partage aucune donnée avec des tiers**. Les seules interactions externes sont :
- **Google Play Billing** : Pour la gestion des abonnements Premium (conformément à la politique de confidentialité de Google)
- **Serveur d'analyse OCR** : Les photos scannées sont envoyées temporairement à un serveur sécurisé pour l'extraction de texte, puis immédiatement supprimées après traitement

## Sécurité des données

- Toutes les données sont stockées localement sur votre appareil de manière sécurisée
- Les communications avec les serveurs externes (OCR) utilisent le protocole HTTPS
- Aucune donnée n'est stockée sur des serveurs externes

## Base de données E-Phy

L'application utilise la base de données publique **E-Phy** fournie par le Ministère de l'Agriculture et de la Souveraineté alimentaire français. Cette base contient :
- Les produits phytosanitaires autorisés en France
- Les produits retirés du marché (PPNU - Produits Phytosanitaires Non Utilisables)
- Les phrases de risque associées (CMR, toxicité)

**Source** : https://ephy.anses.fr/

La base de données est mise à jour régulièrement et intégrée dans l'application. Aucune connexion internet n'est requise pour consulter les produits (sauf pour la fonctionnalité de scan photo).

## Abonnements et paiements

Les abonnements Premium sont gérés par **Google Play Billing**. PhytoCheck ne stocke pas vos informations de paiement. Pour plus d'informations sur la gestion de vos données de paiement, consultez la [Politique de confidentialité de Google Play](https://policies.google.com/privacy).

## Droits des utilisateurs

Conformément au RGPD (Règlement Général sur la Protection des Données), vous avez le droit de :
- **Accéder** à vos données : Toutes vos données sont stockées localement sur votre appareil et accessibles via l'application
- **Supprimer** vos données : Désinstallez l'application pour supprimer toutes les données locales
- **Exporter** vos données : Vous pouvez exporter votre liste de stock (fonctionnalité à venir)

## Modifications de cette politique

Cette politique de confidentialité peut être mise à jour occasionnellement. Toute modification sera publiée sur cette page avec une nouvelle date de mise à jour. Il est recommandé de consulter régulièrement cette page.

## Contact

Pour toute question concernant cette politique de confidentialité, vous pouvez contacter le développeur :

**François Courouble**  
Email : francois@siteswebs.fr  
Site web : https://siteswebs.fr/application-phytocheck

## Conformité

Cette application est conforme au :
- **RGPD** (Règlement Général sur la Protection des Données - UE)
- **Politique de confidentialité de Google Play**
- **Loi Informatique et Libertés** (France)

---

*Cette politique de confidentialité a été générée pour PhytoCheck v1.0.0*
