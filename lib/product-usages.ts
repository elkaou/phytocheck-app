import type { ProductUsage } from "./data-context";
import type { Product } from "./product-service";

/**
 * Retourne l'AMM qui porte les usages réglementaires d'un produit.
 *
 * Les produits issus d'un permis de commerce parallèle possèdent leur propre
 * numéro de permis, mais leurs usages sont publiés sous l'AMM française de
 * référence. Les produits E-Phy classiques utilisent leur propre AMM.
 */
export function getUsageAmm(product: Pick<Product, "amm" | "referenceAmm">): string {
  return product.referenceAmm?.trim() || product.amm;
}

/** Retourne les usages rattachés au produit, avant filtrage des retraits. */
export function getUsagesForProduct(
  product: Pick<Product, "amm" | "referenceAmm">,
  usages: Record<string, ProductUsage[]>,
): ProductUsage[] {
  return usages[getUsageAmm(product)] ?? [];
}

/** Un usage retiré ne doit pas être présenté comme un usage autorisé. */
export function isActiveProductUsage(usage: ProductUsage): boolean {
  return !usage.etat || usage.etat.trim().toLocaleLowerCase("fr-FR") !== "retrait";
}
