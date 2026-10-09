import { describe, expect, it } from "vitest";

import { previewInventoryStockAddition } from "../lib/inventory-stock-addition";
import type { StockItem } from "../lib/store";

const stock: StockItem[] = [
  {
    amm: "1234567",
    nom: "EXEMPLE",
    classification: "homologue",
    dateAjout: "2026-10-09T00:00:00.000Z",
    titulaire: "Titulaire",
    fonctions: "Herbicide",
    etat: "AUTORISE",
    quantite: 2.5,
    unite: "L",
  },
];

describe("previewInventoryStockAddition", () => {
  it("signale un nouveau produit qui ne figure pas dans le stock", () => {
    expect(previewInventoryStockAddition(stock, "7654321", 1, "L")).toEqual({ kind: "new" });
  });

  it("calcule le cumul annoncé avant l’ajout d’un produit existant", () => {
    expect(previewInventoryStockAddition(stock, "1234567", 0.75, "L")).toEqual({
      kind: "merge",
      existingQuantity: 2.5,
      incomingQuantity: 0.75,
      newQuantity: 3.25,
      unit: "L",
    });
  });

  it("bloque le cumul de quantités exprimées dans des unités différentes", () => {
    expect(previewInventoryStockAddition(stock, "1234567", 3, "Kg")).toEqual({
      kind: "unit_mismatch",
      existingQuantity: 2.5,
      existingUnit: "L",
      incomingQuantity: 3,
      incomingUnit: "Kg",
    });
  });
});
