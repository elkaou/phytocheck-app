# Politique de confidentialité de PhytoCheck

**Dernière mise à jour : 14 novembre 2026**

## Introduction

PhytoCheck est une application mobile développée par François Courouble. Elle permet de vérifier l'homologation de produits phytosanitaires en France, de gérer un stock local et, lorsque l'utilisateur le demande, d'analyser des photos d'étiquettes.

Cette politique explique quelles données sont traitées, pourquoi elles le sont, où elles sont conservées et comment exercer vos droits.

## Compte utilisateur

PhytoCheck ne propose pas de parcours de création de compte utilisateur dans l'application mobile. L'utilisation courante de l'application ne nécessite donc pas de renseigner un nom, une adresse e-mail ou un mot de passe.

Les abonnements Premium sont gérés par Google Play Billing ou par Apple selon la plateforme. PhytoCheck ne collecte ni ne stocke les données bancaires utilisées par ces plateformes.

## Données traitées

### Données stockées uniquement sur l'appareil

Les éléments suivants restent sur l'appareil, sauf si l'utilisateur choisit une fonction qui les transmet explicitement :

- la liste des produits ajoutés au stock personnel ;
- les cultures déclarées pour l'exploitation ;
- les réglages et préférences de l'application ;
- le cache local des données réglementaires ;
- une partie du compteur local de recherches et le statut Premium local.

Ces données locales sont généralement supprimées lors de la désinstallation de l'application, selon le fonctionnement du système d'exploitation et de ses sauvegardes.

### Identifiant technique de l'appareil ou de l'installation

Pour gérer le quota de recherches gratuites et empêcher qu'une simple suppression des données locales réinitialise ce quota, PhytoCheck utilise un identifiant technique :

- sur Android, l'Android ID fourni par le système ;
- sur iOS, l'identifiant vendeur (IDFV), conservé dans le stockage sécurisé de l'application.

Cet identifiant n'est pas utilisé pour la publicité, le profilage, la géolocalisation ou la vente de données. Il est transmis de manière chiffrée à l'API PhytoCheck hébergée sur Render, puis associé à des informations techniques nécessaires au service : compteur de recherches, statut Premium, date de première utilisation et dernière synchronisation.

### Photos d'étiquettes

Lorsque l'utilisateur lance une analyse par photo, la photo est transmise temporairement au serveur d'analyse sécurisé afin d'extraire le nom du produit et son numéro AMM. Elle n'est pas conservée comme photo dans le stock de l'utilisateur et est supprimée après le traitement de la demande, sous réserve des journaux techniques indispensables au fonctionnement et à la sécurité du service.

La caméra et la galerie sont facultatives : la recherche manuelle reste disponible sans ces permissions.

### Données réglementaires

Les données E-Phy, les phrases de risque, les usages et les autorisations d'urgence sont des données réglementaires publiques intégrées ou mises à jour dans l'application. Elles ne constituent pas des données personnelles de l'utilisateur.

## Finalités

PhytoCheck traite ces données pour :

1. fournir les recherches d'homologation et les avertissements réglementaires ;
2. gérer localement le stock et les cultures de l'exploitation ;
3. synchroniser le compteur de recherches gratuites et l'état Premium ;
4. analyser les photos d'étiquettes lorsque l'utilisateur le demande ;
5. assurer la sécurité, la maintenance et le bon fonctionnement technique du service ;
6. gérer les abonnements via Google Play Billing ou Apple.

## Transmission et prestataires

Les données techniques nécessaires au compteur et les demandes d'analyse photo sont transmises à l'infrastructure serveur de PhytoCheck hébergée par Render. Render agit comme prestataire technique pour l'hébergement et le traitement des requêtes au nom de PhytoCheck ; ces données ne sont pas vendues ni utilisées par PhytoCheck à des fins publicitaires.

Les paiements et la gestion des abonnements sont traités par Google Play ou Apple selon la plateforme. PhytoCheck ne reçoit pas les numéros de carte bancaire.

PhytoCheck ne vend pas les données et ne les partage pas avec des tiers à des fins de publicité ou de profilage.

## Sécurité

Les communications entre l'application et les serveurs PhytoCheck utilisent HTTPS/TLS. L'identifiant technique est conservé dans un stockage sécurisé sur iOS lorsqu'il y est enregistré localement. L'accès aux données serveur est limité aux besoins d'administration et de fonctionnement du service.

Aucune mesure de sécurité ne peut garantir un risque nul. En cas d'incident susceptible d'affecter les données, PhytoCheck prendra les mesures prévues par la réglementation applicable.

## Durée de conservation

Les données locales restent sur l'appareil jusqu'à leur suppression par l'utilisateur, la désinstallation de l'application ou le remplacement du stockage local.

Les données techniques du compteur sont conservées dans la base serveur tant qu'elles sont nécessaires au fonctionnement du quota, à la gestion de l'abonnement et à la sécurité du service. Elles peuvent ensuite être supprimées ou anonymisées selon les besoins de conservation applicables.

## Sources réglementaires

PhytoCheck utilise notamment :

- la base publique E-Phy de l'Anses : https://ephy.anses.fr/ ;
- les informations officielles du ministère de l'Agriculture relatives aux autorisations d'urgence de 120 jours : https://agriculture.gouv.fr/produits-phytopharmaceutiques-autorisations-de-mise-sur-le-marche-dune-duree-maximale-de-120-jours.

## Vos droits et suppression des données

Conformément au RGPD et aux textes applicables, vous pouvez demander l'accès, la rectification, la limitation ou la suppression des données personnelles ou techniques vous concernant, ainsi que vous opposer à certains traitements lorsque les conditions légales sont réunies.

Pour demander la suppression des données serveur liées à l'identifiant technique, écrivez à **francois@siteswebs.fr** en indiquant l'adresse e-mail de contact utilisée pour la demande, la plateforme et, si possible, le modèle de l'appareil ainsi que la date approximative d'utilisation. Ces informations servent uniquement à retrouver l'enregistrement concerné. La suppression peut empêcher la synchronisation du quota et nécessiter une nouvelle initialisation du compteur.

Les données locales peuvent être supprimées depuis les fonctions de l'application ou en désinstallant l'application. Les exports de stock sont générés uniquement à la demande de l'utilisateur.

## Contact

Pour toute question concernant cette politique ou l'exercice de vos droits :

**François Courouble**
E-mail : francois@siteswebs.fr
Site web : https://phytocheck.com

## Modifications

Cette politique peut être mise à jour pour refléter une évolution de l'application, des services techniques ou de la réglementation. La date de dernière mise à jour figure en haut de cette page.
