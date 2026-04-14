import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the JSON imports
vi.mock("@/assets/data/products.json", () => ({
  default: [
    {
      amm: "2201011",
      nom: "BELKAR PIMP",
      nomsSecondaires: "BELKAR | MOZZAR",
      titulaire: "ASTEC EUROPE",
      gammeUsage: "Professionnel",
      substancesActives: "Arylex + Halauxifen-méthyl",
      fonctions: "Herbicide",
      formulation: "EC",
      etat: "AUTORISE",
      dateRetrait: "",
      dateAutorisation: "01/01/2020",
    },
    {
      amm: "2190062",
      nom: "MOZZAR",
      nomsSecondaires: "BELKAR | MIZIK | SOND",
      titulaire: "Corteva Agriscience France S.A.S.",
      gammeUsage: "Professionnel",
      substancesActives: "Arylex + Halauxifen-méthyl",
      fonctions: "Herbicide",
      formulation: "EC",
      etat: "AUTORISE",
      dateRetrait: "",
      dateAutorisation: "01/01/2019",
    },
    {
      amm: "2190974",
      nom: "VALDY",
      nomsSecondaires: "BELKAR | MOZZAR",
      titulaire: "GRITCHE",
      gammeUsage: "Professionnel",
      substancesActives: "Arylex + Halauxifen-méthyl",
      fonctions: "Herbicide",
      formulation: "EC",
      etat: "AUTORISE",
      dateRetrait: "",
      dateAutorisation: "01/01/2019",
    },
    {
      amm: "9999999",
      nom: "ROUNDUP",
      nomsSecondaires: "",
      titulaire: "BAYER",
      gammeUsage: "Professionnel",
      substancesActives: "Glyphosate",
      fonctions: "Herbicide",
      formulation: "SL",
      etat: "AUTORISE",
      dateRetrait: "",
      dateAutorisation: "01/01/2015",
    },
  ],
}));

vi.mock("@/assets/data/risk-phrases.json", () => ({
  default: {},
}));

import { searchProducts } from "@/lib/product-service";

describe("Search priority", () => {
  it("should return products with primary name match before secondary name matches", () => {
    const results = searchProducts("belkar", 50);

    expect(results.length).toBe(3);
    // BELKAR PIMP should be first (primary name match)
    expect(results[0].nom).toBe("BELKAR PIMP");
    // MOZZAR and VALDY should come after (secondary name matches)
    expect(results[1].matchedName).toBe("BELKAR");
    expect(results[2].matchedName).toBe("BELKAR");
  });

  it("should not return unrelated products", () => {
    const results = searchProducts("belkar", 50);
    const roundup = results.find((r) => r.nom === "ROUNDUP");
    expect(roundup).toBeUndefined();
  });

  it("should still find products by AMM with high priority", () => {
    const results = searchProducts("2190062", 50);
    expect(results.length).toBe(1);
    expect(results[0].nom).toBe("MOZZAR");
  });

  it("should respect limit parameter", () => {
    const results = searchProducts("belkar", 2);
    expect(results.length).toBe(2);
    // First result should still be primary match
    expect(results[0].nom).toBe("BELKAR PIMP");
  });

  it("secondary matches should have matchedName set", () => {
    const results = searchProducts("belkar", 50);
    // Primary match should NOT have matchedName
    expect(results[0].matchedName).toBeUndefined();
    // Secondary matches SHOULD have matchedName
    expect(results[1].matchedName).toBeDefined();
    expect(results[2].matchedName).toBeDefined();
  });
});
