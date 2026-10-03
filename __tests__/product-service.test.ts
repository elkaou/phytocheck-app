import { describe, it, expect } from "vitest";
import manifest from "../assets/data/manifest.json";
import {
  searchProducts,
  getProductByAMM,
  classifyProduct,
  createEmergencyAuthorizationProduct,
  getClassificationLabel,
  getClassificationColor,
  TOTAL_PRODUCTS,
  DB_UPDATE_DATE,
} from "../lib/product-service";

describe("product-service", () => {
  describe("TOTAL_PRODUCTS", () => {
    it("charge le catalogue E‑Phy embarqué", () => {
      expect(TOTAL_PRODUCTS).toBeGreaterThan(0);
    });
  });

  describe("DB_UPDATE_DATE", () => {
    it("correspond à la date du manifest E‑Phy embarqué", () => {
      expect(DB_UPDATE_DATE).toBe(manifest.updated_at);
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
      expect(getClassificationLabel("homologue")).toBe("Homologué non CMR, non toxique");
      expect(getClassificationLabel("retire")).toBe("Retiré");
      expect(getClassificationLabel("homologue_cmr")).toBe("Homologué — CMR");
      expect(getClassificationLabel("homologue_toxique")).toBe("Homologué — Toxique");
      expect(getClassificationLabel("autorisation_urgence")).toBe("Autorisation d’urgence — Article 53");
    });
  });

  describe("getClassificationColor", () => {
    it("should return correct colors", () => {
      expect(getClassificationColor("homologue")).toBe("#22C55E");
      expect(getClassificationColor("retire")).toBe("#EF4444");
      expect(getClassificationColor("homologue_cmr")).toBe("#F59E0B");
      expect(getClassificationColor("homologue_toxique")).toBe("#C2410C"); // Orange foncé
      expect(getClassificationColor("autorisation_urgence")).toBe("#1D4ED8");
    });
  });

  describe("createEmergencyAuthorizationProduct", () => {
    it("crée une fiche stockable sans simuler une homologation E‑Phy", () => {
      const product = createEmergencyAuthorizationProduct({
        id: "article53-avadex",
        amm: "2260551",
        productName: "AVADEX FACTOR",
        cultures: "orge",
        purpose: "Désherbage",
        activeSubstances: "Tri-allate",
        issuedAt: "2026-09-23",
        expiresAt: "2027-01-21",
        decisionPdfUrl: "https://agriculture.gouv.fr/telecharger/156224",
        sourcePageUrl: "https://agriculture.gouv.fr/exemple",
        sourceRetrievedAt: "2026-10-02T10:00:00Z",
      });

      expect(product).toMatchObject({
        amm: "2260551",
        nom: "AVADEX FACTOR",
        classification: "autorisation_urgence",
        etat: "AUTORISATION_ARTICLE_53",
        gammeUsage: "Autorisation d’urgence Article 53",
      });
    });
  });
});
