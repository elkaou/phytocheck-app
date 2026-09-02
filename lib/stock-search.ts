import type { StockItem } from "@/lib/store";

/** Normalise un terme de recherche pour traiter identiquement accents et majuscules. */
export function normalizeStockSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

/** Cherche dans le nom principal, le nom secondaire et le numéro AMM d'un produit stocké. */
export function stockItemMatchesSearch(item: StockItem, query: string): boolean {
  const normalizedQuery = normalizeStockSearchTerm(query);
  if (!normalizedQuery) return true;

  return [item.nom, item.secondaryName, item.amm]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeStockSearchTerm(value).includes(normalizedQuery));
}
