import { describe, expect, it } from "vitest";

import { createCultureSearchIndex } from "@/lib/culture-search";
import type { Product, RiskPhrase } from "@/lib/product-service";
import type { ProductUsage } from "@/lib/data-context";
import bundledProducts from "@/assets/data/products.json";
import bundledUsages from "@/assets/data/usages.json";
import beeRestrictions from "@/assets/data/bee-restrictions.json";
import {
  getBeeWarningLevel,
  type BeeRestrictionRecord,
} from "@/lib/bee-restrictions";

const products: Product[] = [
  {
    amm: "1000001",
    nom: "HERBI ORGE",
    nomsSecondaires: "ALIAS HERBI",
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
  {
    amm: "2150762",
    referenceAmm: "9400052",
    nom: "SELACTIO",
    nomsSecondaires: "CENTURION 240 EC",
    titulaire: "Test PCP",
    gammeUsage: "Professionnel",
    substancesActives: "Cléthodime 240 g/L",
    fonctions: "Herbicide",
    formulation: "EC",
    etat: "AUTORISE",
    dateRetrait: "",
    dateAutorisation: "01/01/2026",
  },
];

const usages: Record<string, ProductUsage[]> = {
  "1000001": [{ culture: "Orge", cible: "Adventices annuelles" }],
  "1000002": [{ culture: "Céréales à paille", cible: "Oïdium" }],
  "1000003": [
    { culture: "Haricots et pois non écossés frais", cible: "Pucerons" },
  ],
  "1000004": [{ culture: "Orge", cible: "Adventices annuelles" }],
  "9400052": [
    { culture: "Haricots et pois non écossés frais", cible: "Graminées" },
  ],
};

const risks: Record<string, RiskPhrase[]> = {
  "1000001": [{ code: "H351", libelle: "Susceptible de provoquer le cancer" }],
};

describe("indexed culture search", () => {
  const index = createCultureSearchIndex(products, risks, usages);

  it("inclut les alias d'Orge, exclut les retraits et conserve les risques dynamiques", () => {
    const result = index.search("Orge", "Tous");

    expect(result.products.map((product) => product.amm)).toEqual([
      "1000001",
      "1000002",
      "1000001",
    ]);
    expect(
      result.products.find((product) => product.amm === "1000001")
        ?.classification,
    ).toBe("homologue_cmr");
    expect(result.ciblesByAmm.get("1000002")).toEqual(["Oïdium"]);
  });

  it("applique le filtre de type au premier calcul", () => {
    const herbicideSearch = index.search("Orge", "Herbicide");
    const herbicideResults = herbicideSearch.products;
    expect(herbicideResults.map((product) => product.amm)).toEqual([
      "1000001",
      "1000001",
    ]);
    expect(herbicideResults.map((product) => product.matchedName)).toEqual([
      "ALIAS HERBI",
      undefined,
    ]);
    expect(
      index.search("Orge", "Fongicide").products.map((product) => product.amm),
    ).toEqual(["1000002"]);
    // Les cibles sont préparées uniquement pour les AMM effectivement
    // retournées, ce qui évite des calculs inutiles sur les autres opérations.
    expect(herbicideSearch.ciblesByAmm.has("1000002")).toBe(false);
    expect(herbicideSearch.ciblesByAmm.get("1000001")).toEqual([
      "Adventices annuelles",
    ]);
  });

  it("inclut ALTACOR pour Haricots grâce à l'alias de culture", () => {
    const result = index.search("Haricots", "Insecticide");

    expect(result.products.map((product) => product.nom)).toEqual([
      "ALTACOR TEST",
    ]);
    expect(result.ciblesByAmm.get("1000003")).toEqual(["Pucerons"]);
    expect(result.beeRestrictedAmms.has("1000003")).toBe(false);
  });

  it("signale une restriction abeilles uniquement sur l'usage culturel correspondant", () => {
    const beeProduct: Product = {
      ...products[2],
      amm: "bee-amm",
      nom: "BEE TEST",
    };
    const beeIndex = createCultureSearchIndex(
      [beeProduct],
      {},
      {
        "bee-amm": [
          {
            culture: "Fraisier",
            cible: "Pucerons",
            condition:
              "Emploi autorisé pendant la floraison en dehors de la présence des abeilles.",
          },
        ],
      },
    );

    expect(
      beeIndex.search("Fraisier", "Insecticide").beeRestrictedAmms,
    ).toEqual(new Set(["bee-amm"]));
  });

  it("identifie CURAME 25 WG comme SPe 8 pendant la floraison", () => {
    const record = beeRestrictions["2180894"] as BeeRestrictionRecord;
    expect(record.restrictionCodes).toContain("SPe 8");
    expect(record.restrictionTexts.join(" ")).toMatch(
      /ne pas appliquer durant la floraison/i,
    );
    expect(getBeeWarningLevel(record)).toBe("restricted-during-flowering");
  });

  it("ne transforme pas une simple mention de floraison en avertissement abeilles", () => {
    const floweringOnlyIndex = createCultureSearchIndex(
      [{ ...products[2], amm: "flowering-only", nom: "FLOWERING ONLY" }],
      {},
      {
        "flowering-only": [
          {
            culture: "Fraisier",
            cible: "Test",
            condition: "Ne pas appliquer durant la floraison.",
          },
        ],
      },
    );
    const result = floweringOnlyIndex.search("Fraisier", "Insecticide");
    expect(result.beeRestrictedAmms.has("flowering-only")).toBe(false);
    expect(result.beeWarningsByAmm.has("flowering-only")).toBe(false);
  });

  it("calcule le niveau SPe 8 depuis la condition d'usage quand l'AMM est nouvelle", () => {
    const newBeeIndex = createCultureSearchIndex(
      [{ ...products[2], amm: "new-bee-amm", nom: "NEW BEE" }],
      {},
      {
        "new-bee-amm": [
          {
            culture: "Fraisier",
            cible: "Pucerons",
            condition:
              "SPe 8 : Pour protéger les abeilles, ne pas appliquer durant la floraison.",
          },
        ],
      },
    );
    expect(
      newBeeIndex
        .search("Fraisier", "Insecticide")
        .beeWarningsByAmm.get("new-bee-amm"),
    ).toBe("restricted-during-flowering");
  });

  it("retrouve les usages de l'AMM de référence pour un permis PCP", () => {
    const result = index.search("Haricots", "Herbicide");

    expect(result.products.map((product) => product.nom)).toContain("SELACTIO");
    expect(result.ciblesByAmm.get("2150762")).toEqual(["Graminées"]);
  });

  it("préserve les usages d'un PCP si un cache distant omet sa référence", () => {
    const remoteProductsWithoutReference = products.map((product) =>
      product.amm === "2150762"
        ? { ...product, referenceAmm: undefined }
        : product,
    );
    const remoteIndex = createCultureSearchIndex(
      remoteProductsWithoutReference,
      risks,
      usages,
    );

    expect(
      remoteIndex
        .search("Haricots", "Herbicide")
        .products.map((product) => product.nom),
    ).toContain("SELACTIO");
  });
});

describe("recherche Fraisier conforme à la portée des usages", () => {
  const cropRows: Record<string, ProductUsage[]> = {
    direct: [{ culture: "Fraisier", cible: "Cible fraisier" }],
    vegetables: [{ culture: "Cultures légumières", cible: "Cible légumière" }],
    fruit: [{ culture: "Cultures fruitières", cible: "Cible fruitière" }],
    berries: [{ culture: "Petits fruits", cible: "Cible petits fruits" }],
    general: [{ culture: "Traitements généraux", cible: "Cult. Installées" }],
    restricted: [
      {
        culture: "Cultures légumières",
        cible: "Cible exclue",
        condition: "Toutes cultures sauf fraisier.",
      },
    ],
    retired: [
      {
        culture: "Cultures légumières",
        cible: "Ancienne cible",
        etat: "Retrait",
      },
    ],
    mixed: [
      { culture: "Cultures fruitières", cible: "Fruit exclu" },
      {
        culture: "Traitements généraux",
        cible: "Vigne exclue",
        condition: "Uniquement sur vigne.",
      },
      { culture: "Cultures légumières", cible: "Cible conservée" },
    ],
  };
  const cropProducts: Product[] = Object.keys(cropRows).map((amm) => ({
    ...products[0],
    amm,
    nom: amm,
    nomsSecondaires: "",
  }));
  const index = createCultureSearchIndex(cropProducts, {}, cropRows);

  it("ne conserve que les portées pertinentes et leurs propres cibles", () => {
    const result = index.search("Fraisier", "Herbicide");
    expect(result.products.map((p) => p.amm).sort()).toEqual([
      "direct",
      "mixed",
      "vegetables",
    ]);
    expect(result.ciblesByAmm.get("mixed")).toEqual(["Cible conservée"]);
    expect(result.ciblesByAmm.has("restricted")).toBe(false);
    expect(result.ciblesByAmm.has("retired")).toBe(false);
  });

  it("ne change pas la fonction : les herbicides ne deviennent pas fongicides", () => {
    expect(index.search("Fraisier", "Fongicide").products).toEqual([]);
  });

  it("retrouve NATUR’NET par son usage légumier mais exclut EUDICATCH SEVIGNEA dont l’usage général n'est pas une homologation Fraisier", () => {
    const selected = (bundledProducts as Product[])
      .filter((p) => ["2140121", "2180075"].includes(p.amm))
      .map((p) => ({ ...p, referenceAmm: undefined }));
    const realIndex = createCultureSearchIndex(
      selected,
      {},
      bundledUsages as Record<string, ProductUsage[]>,
    );
    const result = realIndex.search("Fraisier", "Herbicide");
    expect(result.products.map((p) => p.matchedName || p.nom)).toContain(
      "NATUR'NET",
    );
    expect(result.products.map((p) => p.nom)).not.toContain(
      "EUDICATCH SEVIGNEA",
    );
    expect(realIndex.search("Fraisier", "Fongicide").products).toEqual([]);
  });

  it("conserve CIDELY TOP et LITTOVIR mais pas les restrictions CL/TG de TRICO et CENTIUM", () => {
    const expectedAmms = ["2140201", "2160706"];
    const excludedAmms = ["2120057", "2000299"];
    const selected = (bundledProducts as Product[]).filter((p) =>
      [...expectedAmms, ...excludedAmms].includes(p.amm),
    );
    const realIndex = createCultureSearchIndex(
      selected,
      {},
      bundledUsages as Record<string, ProductUsage[]>,
    );
    const result = realIndex.search("Fraisier", "Tous");
    expect([...new Set(result.products.map((p) => p.amm))].sort()).toEqual(
      expectedAmms,
    );
    for (const amm of excludedAmms) {
      expect(result.ciblesByAmm.has(amm)).toBe(false);
    }
  });
});
