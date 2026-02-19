/**
 * Service IAP (In-App Purchase) pour PhytoCheck
 * Gère les achats Premium via Google Play Billing et Apple IAP
 * Utilise expo-iap pour une API unifiée iOS/Android
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Product IDs - à configurer dans Google Play Console et App Store Connect
export const IAP_PRODUCTS = {
  PREMIUM: "phytocheck_premium", // Achat unique (non-consumable)
} as const;

const PREMIUM_STORAGE_KEY = "@phytocheck_premium_status";

/**
 * Vérifie si la plateforme supporte les achats in-app
 */
export function isPlatformSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * Sauvegarde le statut premium localement
 */
export async function savePremiumStatus(isPremium: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(
      PREMIUM_STORAGE_KEY,
      JSON.stringify({ isPremium, purchasedAt: new Date().toISOString() })
    );
  } catch (error) {
    console.error("Erreur sauvegarde statut premium:", error);
  }
}

/**
 * Charge le statut premium depuis le stockage local
 */
export async function loadPremiumStatus(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed.isPremium === true;
    }
    return false;
  } catch (error) {
    console.error("Erreur chargement statut premium:", error);
    return false;
  }
}

/**
 * Réinitialise le statut premium (pour debug/test)
 */
export async function resetPremiumStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREMIUM_STORAGE_KEY);
  } catch (error) {
    console.error("Erreur reset statut premium:", error);
  }
}
