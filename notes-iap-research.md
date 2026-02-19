# Recherche IAP pour PhytoCheck

## Bibliothèques recommandées par Expo
1. **react-native-purchases** (RevenueCat) - wrapper autour de Google Play Billing et StoreKit, avec services RevenueCat
2. **expo-iap** - Module Expo natif, successeur de react-native-iap pour l'écosystème Expo

## expo-iap
- Installation: `npx expo install expo-iap`
- Compatible Expo SDK 54 (Expo Module avec config plugin)
- API unifiée iOS/Android
- TypeScript natif
- Conforme à la spec OpenIAP
- Version actuelle: 3.4.9
- Nécessite un development build (pas compatible Expo Go)

## Approche choisie: expo-iap
- Plus adapté à notre stack Expo
- Pas besoin de service tiers (contrairement à RevenueCat)
- Config plugin intégré
- Flux: initConnection → fetchProducts → requestPurchase → finishTransaction

## Product IDs à configurer
- `phytocheck_premium` - Achat unique (non-consumable) pour débloquer Premium
- Alternative: `phytocheck_premium_monthly` - Abonnement mensuel
