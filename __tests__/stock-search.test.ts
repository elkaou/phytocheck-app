import { describe, expect, it } from "vitest";

import {
  normalizeStockSearchTerm,
  stockItemMatchesSearch,
} from "@/lib/stock-search";
import type { StockItem } from "@/lib/store";

const item: StockItem = {
  amm: "2160805",
  nom: "STARANE HD",
  secondaryName: "Fluroxypyr Pro",
  titulaire: "Dow AgroSciences",
  fonctions: "Herbicide",
  etat: "Autorisé",
  quantite: 12,
  unite: "L",
  classification: "homologue",
  dateAjout: "2026-09-01T10:00:00.000Z",
};

describe("recherche locale du stock", () => {
  it("ignore les accents et la casse", () => {
    expect(normalizeStockSearchTerm("Été PHY")).toBe("ete phy");
  });

  it("trouve un produit par son nom, son nom secondaire ou son AMM", () => {
    expect(stockItemMatchesSearch(item, "starane")).toBe(true);
    expect(stockItemMatchesSearch(item, "fluroxypyr")).toBe(true);
    expect(stockItemMatchesSearch(item, "2160805")).toBe(true);
  });

  it("ne masque aucun produit lorsque la recherche est vide", () => {
    expect(stockItemMatchesSearch(item, "   ")).toBe(true);
    expect(stockItemMatchesSearch(item, "inexistant")).toBe(false);
  });

  it("retrouve un ancien stock par un alias catalogue non mémorisé", () => {
    expect(
      stockItemMatchesSearch(
        { ...item, amm: "9900115", nom: "CENTURION R", secondaryName: "" },
        "FOLY",
        {
          amm: "9900115",
          nom: "CENTURION R",
          nomsSecondaires: "BALISTIK | FOLY R",
        } as any,
      ),
    ).toBe(true);
  });
});
