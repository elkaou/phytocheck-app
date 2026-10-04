import type { ProductUsage } from "./data-context";
import {
  classifyProductWithData,
  type ClassifiedProduct,
  type Product,
  type RiskPhrase,
} from "./product-service";
import { getCultureSearchSet, normalizeCultureName } from "./culture-aliases";

export type CultureProductType = "Tous" | "Herbicide" | "Fongicide" | "Insecticide" | "Acaricide";

export interface CultureSearchResult {
  products: ClassifiedProduct[];
  /** Cibles disponibles pour chaque AMM, limitées à la culture demandée et ses alias. */
  ciblesByAmm: ReadonlyMap<string, readonly string[]>;
}

export interface CultureSearchIndex {
  /** Cultures E‑Phy disponibles, conservées pour l'autocomplétion. */
  cultures: readonly string[];
  search: (cultureName: string, typeFilter: CultureProductType) => CultureSearchResult;
}

function productMatchesType(product: Product, typeFilter: CultureProductType): boolean {
  if (typeFilter === "Tous") return true;
  const normalizedType = normalizeCultureName(typeFilter);
  return (product.fonctions || "")
    .split("|")
    .some((functionName) => normalizeCultureName(functionName).includes(normalizedType));
}

/**
 * Prépare un index d'accès direct culture → AMM. Il est créé une seule fois
 * par jeu de données, ce qui évite de balayer tous les usages à chaque recherche.
 */
export function createCultureSearchIndex(
  products: readonly Product[],
  riskPhrases: Record<string, RiskPhrase[]>,
  usages: Record<string, ProductUsage[]>,
): CultureSearchIndex {
  const ammsByCulture = new Map<string, Set<string>>();
  const productsByAmm = new Map<string, Product[]>();
  const cultureLabels = new Map<string, string>();

  for (const product of products) {
    const entries = productsByAmm.get(product.amm) ?? [];
    entries.push(product);
    productsByAmm.set(product.amm, entries);
  }

  for (const [amm, productUsages] of Object.entries(usages)) {
    for (const usage of productUsages) {
      if (!usage.culture) continue;
      const cultureKey = normalizeCultureName(usage.culture);
      const amms = ammsByCulture.get(cultureKey) ?? new Set<string>();
      amms.add(amm);
      ammsByCulture.set(cultureKey, amms);
      if (!cultureLabels.has(cultureKey)) cultureLabels.set(cultureKey, usage.culture);
    }
  }

  return {
    cultures: Array.from(cultureLabels.values()).sort((a, b) => a.localeCompare(b, "fr")),
    search(cultureName, typeFilter) {
      const normalizedCultureNames = new Set(
        Array.from(getCultureSearchSet(cultureName), normalizeCultureName),
      );
      const matchingAmms = new Set<string>();

      for (const cultureName of normalizedCultureNames) {
        for (const amm of ammsByCulture.get(cultureName) ?? []) {
          matchingAmms.add(amm);
        }
      }

      const ciblesByAmm = new Map<string, readonly string[]>();
      const found: ClassifiedProduct[] = [];

      for (const amm of matchingAmms) {
        const matchedCibles = new Set<string>();
        for (const usage of usages[amm] ?? []) {
          if (
            normalizedCultureNames.has(normalizeCultureName(usage.culture)) &&
            usage.cible
          ) {
            matchedCibles.add(usage.cible);
          }
        }
        ciblesByAmm.set(amm, Array.from(matchedCibles).sort((a, b) => a.localeCompare(b, "fr")));

        for (const product of productsByAmm.get(amm) ?? []) {
          if (product.etat !== "AUTORISE" || !productMatchesType(product, typeFilter)) continue;
          found.push(classifyProductWithData(product, riskPhrases));
        }
      }

      found.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
      return { products: found, ciblesByAmm };
    },
  };
}
