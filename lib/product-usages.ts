import type { ProductUsage } from "./data-context";
import type { Product } from "./product-service";
import bundledProducts from "@/assets/data/products.json";

// GitHub Pages peut temporairement publier un products.json issu d’un ancien
// convertisseur, sans referenceAmm pour les permis de commerce parallèle. Les
// références connues du catalogue embarqué restent alors une source de secours
// précise : elles ne sont jamais déduites du nom commercial.
const BUNDLED_REFERENCE_AMMS = new Map(
  (bundledProducts as Product[]).flatMap((product) => {
    const referenceAmm = product.referenceAmm?.trim();
    return referenceAmm ? ([[product.amm, referenceAmm]] as const) : [];
  }),
);

/**
 * Retourne l'AMM qui porte les usages réglementaires d'un produit.
 *
 * Les produits issus d'un permis de commerce parallèle possèdent leur propre
 * numéro de permis, mais leurs usages sont publiés sous l'AMM française de
 * référence. Les produits E-Phy classiques utilisent leur propre AMM.
 */
export function getUsageAmm(
  product: Pick<Product, "amm" | "referenceAmm">,
): string {
  return (
    product.referenceAmm?.trim() ??
    BUNDLED_REFERENCE_AMMS.get(product.amm) ??
    product.amm
  );
}

/** Résout aussi les usages lorsqu’une carte Stock ne contient que son AMM. */
export function getUsagesForAmm(
  amm: string,
  usages: Record<string, ProductUsage[]>,
): ProductUsage[] {
  return usages[BUNDLED_REFERENCE_AMMS.get(amm) ?? amm] ?? [];
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
  return (
    !usage.etat || usage.etat.trim().toLocaleLowerCase("fr-FR") !== "retrait"
  );
}
