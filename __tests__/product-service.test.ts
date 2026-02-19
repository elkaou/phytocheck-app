import { describe, it, expect } from "vitest";
import {
  searchProducts,
  getProductByAMM,
  classifyProduct,
  getClassificationLabel,
  getClassificationColor,
  TOTAL_PRODUCTS,
  DB_UPDATE_DATE,
} from "../lib/product-service";

describe("product-service", () => {
  describe("TOTAL_PRODUCTS", () => {
    it("should have loaded products from JSON", () => {
      expect(TOTAL_PRODUCTS).toBeGreaterThan(0);
      expect(TOTAL_PRODUCTS).toBe(15052);
    });
  });

  describe("DB_UPDATE_DATE", () => {
    it("should return the correct date", () => {
      expect(DB_UPDATE_DATE).toBe("21/01/2026");
    });
  });

  describe("searchProducts", () => {
    it("should return empty array for empty query", () => {
      expect(searchProducts("")).toEqual([]);
      expect(searchProducts("  ")).toEqual([]);
    });

    it("should return empty array for very short query", () => {
      expect(searchProducts("a")).toEqual([]);
    });

    it("should find products by name", () => {
      const results = searchProducts("ROUNDUP");
      expect(results.length).toBeGreaterThan(0);
      const hasRoundup = results.some((p) =>
        p.nom.toUpperCase().includes("ROUNDUP") ||
        p.nomsSecondaires.toUpperCase().includes("ROUNDUP")
      );
      expect(hasRoundup).toBe(true);
    });

    it("should find products by AMM number", () => {
      const results = searchProducts("2180347");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].amm).toBe("2180347");
    });

    it("should limit results", () => {
      const results = searchProducts("PRO", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("should return classified products", () => {
      const results = searchProducts("APPLAUD STAR");
      expect(results.length).toBeGreaterThan(0);
      const product = results[0];
      expect(product.classification).toBeDefined();
      expect(product.riskPhrases).toBeDefined();
      expect(Array.isArray(product.riskPhrases)).toBe(true);
    });
  });

  describe("getProductByAMM", () => {
    it("should return null for unknown AMM", () => {
      expect(getProductByAMM("UNKNOWN_AMM")).toBeNull();
    });

    it("should return a classified product for valid AMM", () => {
      const product = getProductByAMM("2180347");
      expect(product).not.toBeNull();
      expect(product!.nom).toBe("APPLAUD STAR");
      expect(product!.etat).toBe("AUTORISE");
    });
  });

  describe("classifyProduct", () => {
    it("should classify RETIRE products as retire", () => {
      const product = getProductByAMM("8800006"); // DIMATE BF 400 - RETIRE
      expect(product).not.toBeNull();
      expect(product!.classification).toBe("retire");
    });

    it("should classify authorized products without CMR/toxique as homologue", () => {
      const product = getProductByAMM("2180347"); // APPLAUD STAR - AUTORISE
      expect(product).not.toBeNull();
      expect(product!.classification).toBe("homologue");
    });

    it("should detect CMR phrases", () => {
      // SYGAN S has H351 (Susceptible de provoquer le cancer) - but it's RETIRE
      const product = getProductByAMM("8700542");
      expect(product).not.toBeNull();
      expect(product!.isCMR).toBe(true);
    });

    it("should detect toxique phrases", () => {
      // DIMATE BF 400 has H302, H304, H332 (toxique codes)
      const product = getProductByAMM("8800006");
      expect(product).not.toBeNull();
      expect(product!.isToxique).toBe(true);
    });
  });

  describe("getClassificationLabel", () => {
    it("should return correct labels", () => {
      expect(getClassificationLabel("homologue")).toBe("Homologué");
      expect(getClassificationLabel("retire")).toBe("Retiré");
      expect(getClassificationLabel("homologue_cmr")).toBe("Homologué — CMR");
      expect(getClassificationLabel("homologue_toxique")).toBe("Homologué — Toxique");
    });
  });

  describe("getClassificationColor", () => {
    it("should return correct colors", () => {
      expect(getClassificationColor("homologue")).toBe("#22C55E");
      expect(getClassificationColor("retire")).toBe("#EF4444");
      expect(getClassificationColor("homologue_cmr")).toBe("#F59E0B");
      expect(getClassificationColor("homologue_toxique")).toBe("#DC2626");
    });
  });
});
