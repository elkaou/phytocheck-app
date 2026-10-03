import { describe, expect, it } from "vitest";

import { createCultureSearchIndex } from "@/lib/culture-search";
import type { Product, RiskPhrase } from "@/lib/product-service";
import type { ProductUsage } from "@/lib/data-context";

const products: Product[] = [
  {
    amm: "1000001",
    nom: "HERBI ORGE",
    nomsSecondaires: "",
    titulaire: "Test",
    gammeUsage: "Professionnel",
    substancesActives: "Substance A",
    fonctions: "Herbicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2026",
  },
  {
    amm: "1000002",
    nom: "FONGI CEREALES",
    nomsSecondaires: "",
    titulaire: "Test",
    gammeUsage: "Professionnel",
    substancesActives: "Substance B",
    fonctions: "Fongicide",
    formulation: "SC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2026",
  },
  {
    amm: "1000003",
    nom: "ALTACOR TEST",
    nomsSecondaires: "",
    titulaire: "Test",
    gammeUsage: "Professionnel",
    substancesActives: "Substance C",
    fonctions: "Insecticide",
    formulation: "WG",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2026",
  },
  {
    amm: "1000004",
    nom: "ANCIEN PRODUIT",
    nomsSecondaires: "",
    titulaire: "Test",
    gammeUsage: "Professionnel",
    substancesActives: "Substance D",
    fonctions: "Herbicide",
    formulation: "EC",
    etat: "RETIRE",
    dateRetrait: "01/01/2026",
    dateAutorisation: "01/01/2020",
  },
];

const usages: Record<string, ProductUsage[]> = {
  "1000001": [{ culture: "Orge", cible: "Adventices annuelles" }],
  "1000002": [{ culture: "Céréales à paille", cible: "Oïdium" }],
  "1000003": [{ culture: "Haricots et pois non écossés frais", cible: "Pucerons" }],
  "1000004": [{ culture: "Orge", cible: "Adventices annuelles" }],
};

const risks: Record<string, RiskPhrase[]> = {
  "1000001": [{ code: "H351", libelle: "Susceptible de provoquer le cancer" }],
};

describe("indexed culture search", () => {
  const index = createCultureSearchIndex(products, risks, usages);

  it("inclut les alias d'Orge, exclut les retraits et conserve les risques dynamiques", () => {
    const result = index.search("Orge", "Tous");

    expect(result.products.map((product) => product.amm)).toEqual(["1000002", "1000001"]);
    expect(result.products.find((product) => product.amm === "1000001")?.classification).toBe("homologue_cmr");
    expect(result.ciblesByAmm.get("1000002")).toEqual(["Oïdium"]);
  });

  it("applique le filtre de type au premier calcul", () => {
    expect(index.search("Orge", "Herbicide").products.map((product) => product.amm)).toEqual(["1000001"]);
    expect(index.search("Orge", "Fongicide").products.map((product) => product.amm)).toEqual(["1000002"]);
  });

  it("inclut ALTACOR pour Haricots grâce à l'alias de culture", () => {
    const result = index.search("Haricots", "Insecticide");

    expect(result.products.map((product) => product.nom)).toEqual(["ALTACOR TEST"]);
    expect(result.ciblesByAmm.get("1000003")).toEqual(["Pucerons"]);
  });
});
