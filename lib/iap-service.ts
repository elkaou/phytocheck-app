/**
 * Service IAP (In-App Purchase) pour PhytoCheck
 * Gère les abonnements Premium via Google Play Billing et Apple IAP
 * Utilise expo-iap pour une API unifiée iOS/Android
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Product IDs - à configurer dans Google Play Console et App Store Connect
export const IAP_PRODUCTS = {
  PREMIUM_MONTHLY: "phytocheck_premium:monthly", // Abonnement mensuel
  PREMIUM_YEARLY: "phytocheck_premium:yearly",   // Abonnement annuel
} as const;

// Base product ID (sans le base plan)
export const IAP_BASE_PRODUCT = "phytocheck_premium";

const PREMIUM_STORAGE_KEY = "@phytocheck_premium_status";

export type SubscriptionType = "monthly" | "yearly" | null;

export interface PremiumStatus {
  isPremium: boolean;
  subscriptionType: SubscriptionType;
  purchasedAt: string;
  expiresAt?: string; // Pour les abonnements
}

/**
 * Vérifie si la plateforme supporte les achats in-app
 */
export function isPlatformSupported(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * Sauvegarde le statut premium localement
 */
export async function savePremiumStatus(
  isPremium: boolean,
  subscriptionType: SubscriptionType = null,
  expiresAt?: string
): Promise<void> {
  try {
    const status: PremiumStatus = {
      isPremium,
      subscriptionType,
      purchasedAt: new Date().toISOString(),
      expiresAt,
    };
    await AsyncStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.error("Erreur sauvegarde statut premium:", error);
  }
}

/**
 * Charge le statut premium depuis le stockage local
 */
export async function loadPremiumStatus(): Promise<PremiumStatus> {
  try {
    const data = await AsyncStorage.getItem(PREMIUM_STORAGE_KEY);
    if (data) {
      const parsed: PremiumStatus = JSON.parse(data);
      // Vérifier si l'abonnement n'a pas expiré
      if (parsed.expiresAt) {
        const now = new Date();
        const expires = new Date(parsed.expiresAt);
        if (now > expires) {
          // Abonnement expiré
          return {
            isPremium: false,
            subscriptionType: null,
            purchasedAt: parsed.purchasedAt,
          };
        }
      }
      return parsed;
    }
    return {
      isPremium: false,
      subscriptionType: null,
      purchasedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Erreur chargement statut premium:", error);
    return {
      isPremium: false,
      subscriptionType: null,
      purchasedAt: new Date().toISOString(),
    };
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
