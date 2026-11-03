import type { StockItem } from "@/lib/store";
import type { Product } from "@/lib/product-service";

/** Normalise un terme de recherche pour traiter identiquement accents et majuscules. */
export function normalizeStockSearchTerm(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

/** Cherche dans le nom principal, le nom secondaire et le numéro AMM d'un produit stocké. */
export function stockItemMatchesSearch(
  item: StockItem,
  query: string,
  product?: Product,
): boolean {
  const normalizedQuery = normalizeStockSearchTerm(query);
  if (!normalizedQuery) return true;

  const catalogueNames = product
    ? [product.nom, ...(product.nomsSecondaires || "").split("|")]
    : [];
  return [item.nom, item.secondaryName, item.amm, ...catalogueNames]
    .filter((value): value is string => Boolean(value))
    .some((value) => normalizeStockSearchTerm(value).includes(normalizedQuery));
}
