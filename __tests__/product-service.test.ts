import { describe, it, expect } from "vitest";
import {
  searchProducts,
  getProductByAMM,
  classifyProduct,
  createEmergencyAuthorizationProduct,
  getClassificationLabel,
  getProductBadgeFunctions,
  getClassificationColor,
  getCommercialNameType,
  extractActiveSubstanceNames,
  searchByExactSubstances,
  sortProductsWithStockFirst,
  filterHomologatedProducts,
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
    it("should return the correct date", () => {
      expect(DB_UPDATE_DATE).toBe("08/04/2026");
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
      const hasRoundup = results.some(
        (p) =>
          p.nom.toUpperCase().includes("ROUNDUP") ||
          p.nomsSecondaires.toUpperCase().includes("ROUNDUP"),
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

  describe("searchByExactSubstances", () => {
    const makeProduct = (
      amm: string,
      nom: string,
      substancesActives: string,
      etat = "AUTORISE",
    ) => ({
      amm,
      nom,
      nomsSecondaires: "",
      titulaire: "Titulaire de test",
      gammeUsage: "Professionnel",
      substancesActives,
      fonctions: "Herbicide",
      formulation: "Concentré",
      etat,
      dateRetrait: "",
      dateAutorisation: "01/01/2020",
    });

    it("identifie le nom principal et le nom secondaire pour l’affichage", () => {
      expect(getCommercialNameType()).toBe("principal");
      expect(getCommercialNameType("EMBARDEX")).toBe("secondaire");
      expect(getCommercialNameType("  ")).toBe("principal");
    });

    it("extrait le nom harmonisé même lorsque le libellé contient des parenthèses imbriquées", () => {
      expect(
        extractActiveSubstanceNames(
          "terpinéol (CAS n° 8000-41-7) (Terpineol (CAS n° 8000-41-7)) 665.0 g/L",
        ),
      ).toEqual(["Terpineol (CAS n° 8000-41-7)"]);
    });

    it("retient exactement la même matière active et exclut les formulations avec une matière supplémentaire", () => {
      const products = [
        makeProduct(
          "test-single",
          "GLYPHOSEUL",
          "glyphosate sel (Glyphosate) 360.0 g/L",
        ),
        makeProduct(
          "test-combination",
          "GLYPHO-MIX",
          "glyphosate sel (Glyphosate) 250.0 g/L | dicamba (Dicamba) 50.0 g/L",
        ),
        makeProduct(
          "test-retired",
          "GLYPHO-RETIRE",
          "glyphosate (Glyphosate) 360.0 g/L",
          "RETIRE",
        ),
      ];

      const results = searchByExactSubstances(
        ["Glyphosate"],
        100,
        products,
        {},
      );

      expect(results.map((product) => product.nom)).toEqual(["GLYPHOSEUL"]);
    });

    it("compare un ensemble de plusieurs matières actives sans tenir compte de leur ordre", () => {
      const products = [
        makeProduct(
          "test-combination",
          "GLYPHO-MIX",
          "glyphosate (Glyphosate) 250.0 g/L | dicamba (Dicamba) 50.0 g/L",
        ),
        makeProduct(
          "test-other",
          "GLYPHO",
          "glyphosate (Glyphosate) 360.0 g/L",
        ),
      ];

      const results = searchByExactSubstances(
        ["dicamba", "glyphosate"],
        100,
        products,
        {},
      );

      expect(results.map((product) => product.nom)).toEqual(["GLYPHO-MIX"]);
    });

    it("place le produit déjà en stock en premier", () => {
      const products = [
        makeProduct("test-a", "ALPHA", "glyphosate (Glyphosate) 250.0 g/L"),
        makeProduct("test-b", "BETA", "glyphosate (Glyphosate) 360.0 g/L"),
      ];
      const results = searchByExactSubstances(
        ["glyphosate"],
        100,
        products,
        {},
      );

      expect(
        sortProductsWithStockFirst(results, new Set(["test-b"])).map(
          (product) => product.nom,
        ),
      ).toEqual(["BETA", "ALPHA"]);
    });

    it("crée une carte distincte pour chaque nom commercial d’une même AMM", () => {
      const product = makeProduct(
        "test-amm",
        "DEFI",
        "prosulfocarbe (Prosulfocarb) 800.0 g/L",
      );
      product.nomsSecondaires = "AUROS | EMBARDEX | PIROSEO";

      const results = searchByExactSubstances(
        ["Prosulfocarb"],
        100,
        [product],
        {},
      );

      expect(results.map((item) => item.matchedName || item.nom)).toEqual([
        "DEFI",
        "AUROS",
        "EMBARDEX",
        "PIROSEO",
      ]);
    });

    it("filtre les produits retirés par défaut tout en permettant de les réafficher", () => {
      const products = [
        classifyProduct(
          makeProduct(
            "test-authorized",
            "AUTORISE",
            "glyphosate (Glyphosate) 250.0 g/L",
          ),
        ),
        classifyProduct(
          makeProduct(
            "test-retired",
            "RETIRE",
            "glyphosate (Glyphosate) 360.0 g/L",
            "RETIRE",
          ),
        ),
      ];

      expect(
        filterHomologatedProducts(products, false).map(
          (product) => product.nom,
        ),
      ).toEqual(["AUTORISE"]);
      expect(
        filterHomologatedProducts(products, true).map((product) => product.nom),
      ).toEqual(["AUTORISE", "RETIRE"]);
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
      expect(getClassificationLabel("homologue")).toBe(
        "Homologué non CMR, non toxique",
      );
      expect(getClassificationLabel("retire")).toBe("Retiré");
      expect(getClassificationLabel("homologue_cmr")).toBe("Homologué — CMR");
      expect(getClassificationLabel("homologue_toxique")).toBe(
        "Homologué — Toxique",
      );
      expect(getClassificationLabel("autorisation_urgence")).toBe(
        "Autorisation d’urgence — Article 53",
      );

      expect(getClassificationLabel("homologue", "Herbicide | Engrais")).toBe(
        "Herbicide non CMR, non toxique",
      );
      expect(
        getClassificationLabel("homologue", "Fongicide | Insecticide"),
      ).toBe("Fongicide / Insecticide non CMR, non toxique");
      expect(getClassificationLabel("homologue_cmr", "Herbicide")).toBe(
        "Homologué — CMR",
      );
    });

    it("retient uniquement les grandes fonctions phytosanitaires du badge", () => {
      expect(
        getProductBadgeFunctions(
          "Fongicide | Adjuvant pour bouillie herbicide | Engrais",
        ),
      ).toEqual(["Herbicide", "Fongicide"]);
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
