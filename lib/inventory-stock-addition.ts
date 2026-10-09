import type { StockItem } from "./store";

export type InventoryStockAdditionPreview =
  | { kind: "new" }
  | {
      kind: "merge";
      existingQuantity: number;
      incomingQuantity: number;
      newQuantity: number;
      unit: "L" | "Kg";
    }
  | {
      kind: "unit_mismatch";
      existingQuantity: number;
      existingUnit: "L" | "Kg";
      incomingQuantity: number;
      incomingUnit: "L" | "Kg";
    };

/**
 * Prépare une addition de stock sans écrire de donnée.
 * L’AMM est la clé réglementaire utilisée pour identifier un produit déjà présent.
 */
export function previewInventoryStockAddition(
  stock: StockItem[],
  amm: string,
  incomingQuantity: number,
  incomingUnit: "L" | "Kg",
): InventoryStockAdditionPreview {
  const existing = stock.find((item) => item.amm === amm);
  if (!existing) return { kind: "new" };

  const existingQuantity = Number.isFinite(existing.quantite) ? existing.quantite : 0;
  if (existing.unite !== incomingUnit) {
    return {
      kind: "unit_mismatch",
      existingQuantity,
      existingUnit: existing.unite,
      incomingQuantity,
      incomingUnit,
    };
  }

  return {
    kind: "merge",
    existingQuantity,
    incomingQuantity,
    newQuantity: existingQuantity + incomingQuantity,
    unit: incomingUnit,
  };
}
