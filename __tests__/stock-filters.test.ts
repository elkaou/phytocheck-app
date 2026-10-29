import { describe, expect, it } from "vitest";
import {
  countActiveStockFilters,
  createStockCultureMatcher,
  EMPTY_STOCK_FILTERS,
  getAvailableStockCultures,
  getStockFunctionFilter,
  isStockProductOutsideFarmCultures,
  stockProductMatchesFilters,
  type StockFilters,
} from "@/lib/stock-filters";
import type { ProductUsage } from "@/lib/data-context";
import type { Product } from "@/lib/product-service";
import { normalizeFarmCultures } from "@/lib/farm-cultures";

const product: Product = {
  amm: "1234567",
  nom: "TEST HERBICIDE",
  nomsSecondaires: "",
  titulaire: "Test",
  gammeUsage: "",
  substancesActives: "",
  fonctions: "Herbicide",
  formulation: "",
  etat: "AUTORISE",
  dateRetrait: "",
  dateAutorisation: "",
};

const usages: Record<string, ProductUsage[]> = {
  "1234567": [{ culture: "Céréales à paille", usage: "Désherbage" }],
};

function matches(
  overrides: Partial<StockFilters> = {},
  options: {
    classification?: string;
    withdrawal?: boolean;
  } = {},
) {
  return stockProductMatchesFilters(
    {
      amm: "1234567",
      classification: options.classification ?? "homologue",
      fonctions: "Herbicide",
      product,
    },
    { ...EMPTY_STOCK_FILTERS, ...overrides },
    new Map([[product.amm, product]]),
    usages,
    new Set(options.withdrawal ? [product.amm] : []),
  );
}

describe("stock-filters", () => {
  it("combine la fonction, le statut sanitaire et la culture", () => {
    expect(
      matches({
        functions: ["Herbicide"],
        statuses: ["Homologués non CMR, non toxiques"],
        cultures: ["Blé"],
      }),
    ).toBe(true);
    expect(matches({ functions: ["Fongicide"] })).toBe(false);
  });

  it("réutilise un index d’alias pour le filtre culturel", () => {
    const matcher = createStockCultureMatcher(["Blé"]);
    expect(
      stockProductMatchesFilters(
        {
          amm: "1234567",
          classification: "homologue",
          fonctions: "Herbicide",
          product,
        },
        { ...EMPTY_STOCK_FILTERS, cultures: ["Blé"] },
        new Map([[product.amm, product]]),
        usages,
        new Set(),
        matcher,
      ),
    ).toBe(true);
  });

  it("filtre les statuts réglementaires sélectionnés", () => {
    expect(
      matches({ statuses: ["Retirés / PPNU"] }, { classification: "retire" }),
    ).toBe(true);
    expect(matches({ statuses: ["CMR"] })).toBe(false);
    expect(
      matches({ statuses: ["CMR"] }, { classification: "homologue_cmr" }),
    ).toBe(true);
    expect(
      matches(
        { statuses: ["Toxiques"] },
        { classification: "homologue_toxique" },
      ),
    ).toBe(true);
    expect(matches({ statuses: ["Homologués non CMR, non toxiques"] })).toBe(
      true,
    );
  });

  it("filtre les produits dont le retrait est prévu sous trois mois", () => {
    expect(
      matches({ statuses: ["Retrait sous 3 mois"] }, { withdrawal: true }),
    ).toBe(true);
    expect(
      matches({ statuses: ["Retrait sous 3 mois"] }, { withdrawal: false }),
    ).toBe(false);
  });

  it("retrouve BORAVI WG avec ses usages retirés sur crucifères oléagineuses", () => {
    const boravi: Product = {
      ...product,
      amm: "2140040",
      nom: "BORAVI WG",
      fonctions: "Insecticide",
      etat: "RETIRE",
    };
    const boraviUsages: Record<string, ProductUsage[]> = {
      "2140040": [
        {
          culture: "Crucifères oléagineuses",
          cible: "Coléoptères phytophages",
          etat: "Retrait",
        },
      ],
    };

    expect(
      stockProductMatchesFilters(
        {
          amm: boravi.amm,
          classification: "retire",
          fonctions: boravi.fonctions,
          product: boravi,
        },
        {
          ...EMPTY_STOCK_FILTERS,
          functions: ["Insecticide"],
          statuses: ["Retirés / PPNU"],
          cultures: ["Crucifères oléagineuses"],
        },
        new Map([[boravi.amm, boravi]]),
        boraviUsages,
        new Set(),
      ),
    ).toBe(true);
  });

  it("compte les critères actifs", () => {
    expect(countActiveStockFilters(EMPTY_STOCK_FILTERS)).toBe(0);
    expect(
      countActiveStockFilters({
        ...EMPTY_STOCK_FILTERS,
        functions: ["Herbicide", "Fongicide"],
        statuses: ["CMR"],
        cultures: ["Blé"],
      }),
    ).toBe(4);
  });

  it("regroupe les nématicides et rodenticides dans Autre", () => {
    expect(
      getStockFunctionFilter({ ...product, fonctions: "Nématicide" }),
    ).toEqual(["Autre"]);
    expect(
      getStockFunctionFilter({ ...product, fonctions: "Rodenticide" }),
    ).toEqual(["Autre"]);
    expect(
      getStockFunctionFilter({
        ...product,
        fonctions: "Herbicide | Nématicide",
      }),
    ).toEqual(["Herbicide", "Autre"]);
  });

  it("déduit les cultures disponibles sans doublons", () => {
    expect(
      getAvailableStockCultures({
        a: [{ culture: "Blé" }, { culture: "Colza" }],
        b: [{ culture: "Blé" }],
      }),
    ).toEqual(["Blé", "Colza"]);
  });

  it("conserve les cultures retenues même si elles dépassent la liste initiale", () => {
    const allCultures = ["Blé", "Colza", "Pommes de terre", "Vigne"];
    const selected = ["Pommes de terre"];
    const available = getAvailableStockCultures({
      a: allCultures.map((culture) => ({ culture })),
    });
    expect(available).toContain(selected[0]);
  });

  it("n'affiche pas la catégorie Adjuvants comme une culture", () => {
    expect(
      getAvailableStockCultures({
        fullMax: [
          {
            culture: "Adjuvants",
            condition:
              "Uniquement sur grandes cultures, cultures légumières et vigne.",
          },
        ],
        herbicide: [{ culture: "Grandes cultures" }],
      }),
    ).toEqual(["Grandes cultures"]);
  });

  it("normalise et déduplique les cultures de l’exploitation", () => {
    expect(
      normalizeFarmCultures([" Blé ", "blé", "Pommes de terre", "", 12]),
    ).toEqual(["Blé", "Pommes de terre"]);
  });

  it("signale un produit dont les usages ne correspondent à aucune culture de l’exploitation", () => {
    expect(
      isStockProductOutsideFarmCultures("1234567", ["Vigne"], usages),
    ).toBe(true);
    expect(isStockProductOutsideFarmCultures("1234567", ["Blé"], usages)).toBe(
      false,
    );
  });

  it("ne signale pas un produit quand aucune culture n’est configurée ou si ses usages sont inconnus", () => {
    expect(isStockProductOutsideFarmCultures("1234567", [], usages)).toBe(
      false,
    );
    expect(
      isStockProductOutsideFarmCultures("9999999", ["Vigne"], usages),
    ).toBe(false);
  });

  it("analyse la condition des adjuvants pour reconnaître les grandes cultures", () => {
    const fullMaxUsages: Record<string, ProductUsage[]> = {
      "2140227": [
        {
          culture: "Adjuvants",
          application: "Bouil. Herbicide",
          condition:
            "Uniquement sur grandes cultures, cultures légumières, cultures ornementales, petits fruits et vigne.",
        },
        {
          culture: "Adjuvants",
          application: "Bouil. Herbicide",
          condition: "Uniquement sur vergers.",
        },
      ],
    };

    expect(
      isStockProductOutsideFarmCultures(
        "2140227",
        ["Grandes cultures"],
        fullMaxUsages,
      ),
    ).toBe(false);
    expect(
      isStockProductOutsideFarmCultures("2140227", ["Blé"], fullMaxUsages),
    ).toBe(false);
    expect(
      isStockProductOutsideFarmCultures("2140227", ["Prairies"], fullMaxUsages),
    ).toBe(true);
  });
});
