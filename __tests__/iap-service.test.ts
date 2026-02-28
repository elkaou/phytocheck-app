import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStore: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStore[key] || null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStore[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStore[key];
      return Promise.resolve();
    }),
  },
}));

// Mock Platform
vi.mock("react-native", () => ({
  Platform: { OS: "android" },
}));

import {
  savePremiumStatus,
  loadPremiumStatus,
  resetPremiumStatus,
  isPlatformSupported,
  IAP_PRODUCTS_ANDROID,
  IAP_PRODUCTS_IOS,
  IAP_BASE_PLANS,
} from "../lib/iap-service";

describe("IAP Service", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  });

  it("devrait avoir les bons product IDs pour les abonnements", () => {
    expect(IAP_PRODUCTS_ANDROID.PREMIUM).toBe("phytocheck_premium");
    expect(IAP_PRODUCTS_IOS.PREMIUM_MONTHLY).toBe("phytocheck.premium.monthly");
    expect(IAP_PRODUCTS_IOS.PREMIUM_YEARLY).toBe("phytocheck.premium.yearly");
    expect(IAP_BASE_PLANS.MONTHLY).toBe("monthly");
    expect(IAP_BASE_PLANS.YEARLY).toBe("yearly");
  });

  it("devrait détecter les plateformes supportées", () => {
    expect(isPlatformSupported()).toBe(true);
  });

  it("devrait sauvegarder et charger le statut premium avec abonnement mensuel", async () => {
    // Par défaut, pas premium
    const initial = await loadPremiumStatus();
    expect(initial.isPremium).toBe(false);
    expect(initial.subscriptionType).toBe(null);

    // Activer premium mensuel avec transactionDate
    const transactionDate = new Date().toISOString();
    await savePremiumStatus(true, "monthly", transactionDate);
    const afterActivation = await loadPremiumStatus();
    expect(afterActivation.isPremium).toBe(true);
    expect(afterActivation.subscriptionType).toBe("monthly");

    // Désactiver premium
    await savePremiumStatus(false, null);
    const afterDeactivation = await loadPremiumStatus();
    expect(afterDeactivation.isPremium).toBe(false);
    expect(afterDeactivation.subscriptionType).toBe(null);
  });

  it("devrait sauvegarder et charger le statut premium avec abonnement annuel", async () => {
    const transactionDate = new Date().toISOString();
    await savePremiumStatus(true, "yearly", transactionDate);
    const status = await loadPremiumStatus();
    expect(status.isPremium).toBe(true);
    expect(status.subscriptionType).toBe("yearly");
    expect(status.transactionDate).toBeDefined();
  });

  it("devrait réinitialiser le statut premium", async () => {
    await savePremiumStatus(true, "monthly", new Date().toISOString());
    const before = await loadPremiumStatus();
    expect(before.isPremium).toBe(true);

    await resetPremiumStatus();
    const after = await loadPremiumStatus();
    expect(after.isPremium).toBe(false);
    expect(after.subscriptionType).toBe(null);
  });

  it("devrait stocker la date de transaction et le type d'abonnement", async () => {
    const transactionDate = new Date().toISOString();
    await savePremiumStatus(true, "monthly", transactionDate);
    const data = JSON.parse(mockStore["@phytocheck_premium_status"]);
    expect(data.isPremium).toBe(true);
    expect(data.subscriptionType).toBe("monthly");
    expect(data.transactionDate).toBeDefined();
    expect(new Date(data.transactionDate).getTime()).toBeGreaterThan(0);
  });
});
