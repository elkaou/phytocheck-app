/**
 * Service IAP (In-App Purchase) pour PhytoCheck
 * Gère les abonnements Premium via Google Play Billing et Apple IAP
 * Utilise expo-iap pour une API unifiée iOS/Android
 */
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Product IDs - à configurer dans Google Play Console et App Store Connect
// Android (Google Play Billing v5+) : Un seul product ID avec plusieurs base plans
// iOS (StoreKit) : Deux product IDs séparés pour mensuel et annuel

// Android product IDs
export const IAP_PRODUCTS_ANDROID = {
  PREMIUM: "phytocheck_premium", // ID de base de l'abonnement (contient les plans monthly et yearly)
} as const;

// iOS product IDs (doivent correspondre exactement à App Store Connect)
export const IAP_PRODUCTS_IOS = {
  PREMIUM_MONTHLY: "phytocheck.premium.monthly",
  PREMIUM_YEARLY: "phytocheck.premium.yearly",
} as const;

// Base plans IDs pour Android (définis dans Google Play Console)
export const IAP_BASE_PLANS = {
  MONTHLY: "monthly",
  YEARLY: "yearly",
} as const;

// Helper pour obtenir les product IDs selon la plateforme
export function getProductIds() {
  if (Platform.OS === "ios") {
    return {
      monthly: IAP_PRODUCTS_IOS.PREMIUM_MONTHLY,
      yearly: IAP_PRODUCTS_IOS.PREMIUM_YEARLY,
    };
  } else {
    return {
      base: IAP_PRODUCTS_ANDROID.PREMIUM,
    };
  }
}

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
