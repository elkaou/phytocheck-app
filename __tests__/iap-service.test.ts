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

import { savePremiumStatus, loadPremiumStatus, resetPremiumStatus, isPlatformSupported, IAP_PRODUCTS } from "../lib/iap-service";

describe("IAP Service", () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  });

  it("devrait avoir le bon product ID", () => {
    expect(IAP_PRODUCTS.PREMIUM).toBe("phytocheck_premium");
  });

  it("devrait détecter les plateformes supportées", () => {
    expect(isPlatformSupported()).toBe(true);
  });

  it("devrait sauvegarder et charger le statut premium", async () => {
    // Par défaut, pas premium
    const initial = await loadPremiumStatus();
    expect(initial).toBe(false);

    // Activer premium
    await savePremiumStatus(true);
    const afterActivation = await loadPremiumStatus();
    expect(afterActivation).toBe(true);

    // Désactiver premium
    await savePremiumStatus(false);
    const afterDeactivation = await loadPremiumStatus();
    expect(afterDeactivation).toBe(false);
  });

  it("devrait réinitialiser le statut premium", async () => {
    await savePremiumStatus(true);
    const before = await loadPremiumStatus();
    expect(before).toBe(true);

    await resetPremiumStatus();
    const after = await loadPremiumStatus();
    expect(after).toBe(false);
  });

  it("devrait stocker la date d'achat", async () => {
    await savePremiumStatus(true);
    const data = JSON.parse(mockStore["@phytocheck_premium_status"]);
    expect(data.isPremium).toBe(true);
    expect(data.purchasedAt).toBeDefined();
    expect(new Date(data.purchasedAt).getTime()).toBeGreaterThan(0);
  });
});
