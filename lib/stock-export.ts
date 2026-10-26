import type { StockItem } from "@/lib/store";

/**
 * Trie les produits selon le nom réellement affiché dans le stock.
 * Ce module reste volontairement léger : l’export Excel est chargé seulement
 * lorsque l’utilisateur le demande dans stock-excel-export.ts.
 */
export function sortStockItemsAlphabetically(stock: StockItem[]): StockItem[] {
  return [...stock].sort((a, b) => {
    const nameA = (a.secondaryName || a.nom).trim();
    const nameB = (b.secondaryName || b.nom).trim();
    return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
  });
}
