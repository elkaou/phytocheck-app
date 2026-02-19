import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

import {
  getStock,
  addToStock,
  removeFromStock,
  isInStock,
  getSearchCount,
  incrementSearchCount,
  getRemainingSearches,
  canSearch,
  getIsPremium,
  setIsPremium,
  getStockStats,
  FREE_SEARCH_LIMIT,
  FREE_STOCK_LIMIT,
} from "../lib/store";
import type { ClassifiedProduct } from "../lib/product-service";

function makeProduct(amm: string, classification = "homologue"): ClassifiedProduct {
  return {
    amm,
    nom: `Produit ${amm}`,
    nomsSecondaires: "",
    titulaire: "Test",
    gammeUsage: "",
    substancesActives: "",
    fonctions: "",
    formulation: "",
    etat: classification === "retire" ? "RETIRE" : "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "2020-01-01",
    classification: classification as any,
    riskPhrases: [],
    isCMR: classification === "homologue_cmr",
    isToxique: classification === "homologue_toxique",
  };
}

beforeEach(() => {
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
});

describe("store", () => {
  describe("FREE_SEARCH_LIMIT", () => {
    it("should be 15", () => {
      expect(FREE_SEARCH_LIMIT).toBe(15);
    });
  });

  describe("FREE_STOCK_LIMIT", () => {
    it("should be 20", () => {
      expect(FREE_STOCK_LIMIT).toBe(20);
    });
  });

  describe("getStock", () => {
    it("should return empty array when no stock", async () => {
      const stock = await getStock();
      expect(stock).toEqual([]);
    });
  });

  describe("addToStock / removeFromStock", () => {
    it("should add a product to stock", async () => {
      const product = makeProduct("1234567");
      const result = await addToStock(product);
      expect(result).toBe(true);

      const stock = await getStock();
      expect(stock.length).toBe(1);
      expect(stock[0].amm).toBe("1234567");
    });

    it("should not add duplicate product", async () => {
      const product = makeProduct("1234567");
      await addToStock(product);
      const result = await addToStock(product);
      expect(result).toBe(false);

      const stock = await getStock();
      expect(stock.length).toBe(1);
    });

    it("should remove a product from stock", async () => {
      const product = makeProduct("1234567");
      await addToStock(product);
      const result = await removeFromStock("1234567");
      expect(result).toBe(true);

      const stock = await getStock();
      expect(stock.length).toBe(0);
    });

    it("should enforce free stock limit", async () => {
      for (let i = 0; i < FREE_STOCK_LIMIT; i++) {
        await addToStock(makeProduct(`AMM${i}`));
      }
      const result = await addToStock(makeProduct("EXTRA"));
      expect(result).toBe(false);

      const stock = await getStock();
      expect(stock.length).toBe(FREE_STOCK_LIMIT);
    });
  });

  describe("isInStock", () => {
    it("should return false for non-existent product", async () => {
      expect(await isInStock("UNKNOWN")).toBe(false);
    });

    it("should return true for existing product", async () => {
      await addToStock(makeProduct("1234567"));
      expect(await isInStock("1234567")).toBe(true);
    });
  });

  describe("search count", () => {
    it("should start at 0", async () => {
      expect(await getSearchCount()).toBe(0);
    });

    it("should increment correctly", async () => {
      await incrementSearchCount();
      expect(await getSearchCount()).toBe(1);
      await incrementSearchCount();
      expect(await getSearchCount()).toBe(2);
    });

    it("should calculate remaining searches", async () => {
      expect(await getRemainingSearches()).toBe(FREE_SEARCH_LIMIT);
      await incrementSearchCount();
      expect(await getRemainingSearches()).toBe(FREE_SEARCH_LIMIT - 1);
    });

    it("should block searches after limit", async () => {
      for (let i = 0; i < FREE_SEARCH_LIMIT; i++) {
        await incrementSearchCount();
      }
      expect(await canSearch()).toBe(false);
      expect(await getRemainingSearches()).toBe(0);
    });
  });

  describe("premium", () => {
    it("should default to false", async () => {
      expect(await getIsPremium()).toBe(false);
    });

    it("should allow setting premium", async () => {
      await setIsPremium(true);
      expect(await getIsPremium()).toBe(true);
    });

    it("should allow unlimited searches when premium", async () => {
      await setIsPremium(true);
      for (let i = 0; i < FREE_SEARCH_LIMIT; i++) {
        await incrementSearchCount();
      }
      expect(await canSearch()).toBe(true);
      expect(await getRemainingSearches()).toBe(Infinity);
    });
  });

  describe("getStockStats", () => {
    it("should return correct stats", async () => {
      await addToStock(makeProduct("A1", "homologue"));
      await addToStock(makeProduct("A2", "homologue"));
      await addToStock(makeProduct("A3", "retire"));
      await addToStock(makeProduct("A4", "homologue_cmr"));
      await addToStock(makeProduct("A5", "homologue_toxique"));

      const stats = await getStockStats();
      expect(stats.total).toBe(5);
      expect(stats.homologues).toBe(2);
      expect(stats.ppnu).toBe(1);
      expect(stats.cmr).toBe(1);
      expect(stats.toxiques).toBe(1);
    });
  });
});
