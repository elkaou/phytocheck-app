import type { ProductUsage } from "./data-context";
import {
  classifyProductWithData,
  type ClassifiedProduct,
  type Product,
  type RiskPhrase,
} from "./product-service";
import { normalizeCultureName } from "./culture-aliases";
import { createEphyCultureMatcher } from "./culture-usage-scope";
import { getUsageAmm, isActiveProductUsage } from "./product-usages";
import { getBeeWarningForAmm, type BeeWarningLevel } from "./bee-restrictions";

export type CultureProductType =
  "Tous" | "Herbicide" | "Fongicide" | "Insecticide" | "Acaricide";

export interface CultureSearchResult {
  products: ClassifiedProduct[];
  /** Cibles disponibles pour chaque AMM, limitées à la culture demandée et ses alias. */
  ciblesByAmm: ReadonlyMap<string, readonly string[]>;
  /** AMM dont au moins un usage correspondant impose l'absence d'abeilles. */
  beeRestrictedAmms: ReadonlySet<string>;
  /** Niveau d'avertissement abeilles applicable à la culture recherchée. */
  beeWarningsByAmm: ReadonlyMap<string, BeeWarningLevel>;
}

/** Restriction réglementaire affichée sous forme d'avertissement abeilles. */
export const BEE_RESTRICTION_PATTERN =
  /en\s+dehors\s+de\s+la\s+présence\s+(?:des?\s+)?abeilles?/i;
const BEE_FLOWERING_RESTRICTION_PATTERN =
  /SPe\s*8[\s\S]*abeilles?[\s\S]*(?:ne\s+pas\s+appliquer|ne\s+pas\s+utiliser)[\s\S]*(?:durant|pendant)\s+la\s+floraison/i;
const BEE_PRESENCE_RESTRICTION_PATTERN =
  /SPe\s*8[\s\S]*abeilles?[\s\S]*ne\s+pas\s+(?:appliquer|utiliser)[\s\S]*en\s+présence/i;

export interface CultureSearchIndex {
  /** Cultures E‑Phy disponibles, conservées pour l'autocomplétion. */
  cultures: readonly string[];
  search: (
    cultureName: string,
    typeFilter: CultureProductType,
  ) => CultureSearchResult;
}

function expandCommercialNames(
  product: ClassifiedProduct,
): ClassifiedProduct[] {
  const secondaryNames = (product.nomsSecondaires || "")
    .split("|")
    .map((name) => name.trim())
    .filter(Boolean);

  return [
    product,
    ...secondaryNames.map((matchedName) => ({ ...product, matchedName })),
  ];
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
  const productAmmsByUsageAmm = new Map<string, Set<string>>();
  const cultureLabels = new Map<string, string>();
  const activeUsagesByAmm = new Map<
    string,
    Array<{ cultureKey: string; cible?: string; usage: ProductUsage }>
  >();
  const cultureKeys = new Map<string, string>();
  const usageStates = new Map<string, boolean>();
  const normalizedFunctionsByProduct = new WeakMap<
    Product,
    readonly string[]
  >();
  const classifiedProducts = new WeakMap<Product, ClassifiedProduct>();

  for (const product of products) {
    const entries = productsByAmm.get(product.amm) ?? [];
    entries.push(product);
    productsByAmm.set(product.amm, entries);
    const usageAmm = getUsageAmm(product);
    const productAmms =
      productAmmsByUsageAmm.get(usageAmm) ?? new Set<string>();
    productAmms.add(product.amm);
    productAmmsByUsageAmm.set(usageAmm, productAmms);
  }

  for (const [amm, productUsages] of Object.entries(usages)) {
    for (const usage of productUsages) {
      const state = usage.etat?.trim() ?? "";
      let isActive = usageStates.get(state);
      if (isActive === undefined) {
        isActive = isActiveProductUsage(usage);
        usageStates.set(state, isActive);
      }
      if (!usage.culture || !isActive) continue;

      let cultureKey = cultureKeys.get(usage.culture);
      if (!cultureKey) {
        cultureKey = normalizeCultureName(usage.culture);
        cultureKeys.set(usage.culture, cultureKey);
      }
      const amms = ammsByCulture.get(cultureKey) ?? new Set<string>();
      for (const productAmm of productAmmsByUsageAmm.get(amm) ?? [amm]) {
        amms.add(productAmm);
      }
      ammsByCulture.set(cultureKey, amms);
      if (!cultureLabels.has(cultureKey))
        cultureLabels.set(cultureKey, usage.culture);

      const preparedUsages = activeUsagesByAmm.get(amm) ?? [];
      preparedUsages.push({
        cultureKey,
        cible: usage.cible?.trim() || undefined,
        usage,
      });
      activeUsagesByAmm.set(amm, preparedUsages);
    }
  }

  return {
    cultures: Array.from(cultureLabels.values()).sort((a, b) =>
      a.localeCompare(b, "fr"),
    ),
    search(cultureName, typeFilter) {
      const cultureMatcher = createEphyCultureMatcher(cultureName);
      const normalizedCultureNames = cultureMatcher.normalizedCultures;
      const normalizedType =
        typeFilter === "Tous" ? null : normalizeCultureName(typeFilter);
      const matchingAmms = new Set<string>();

      for (const cultureName of normalizedCultureNames) {
        for (const amm of ammsByCulture.get(cultureName) ?? []) {
          matchingAmms.add(amm);
        }
      }

      const ciblesByAmm = new Map<string, readonly string[]>();
      const beeRestrictedAmms = new Set<string>();
      const beeWarningsByAmm = new Map<string, BeeWarningLevel>();
      const found: ClassifiedProduct[] = [];

      for (const amm of matchingAmms) {
        const matchingProducts = (productsByAmm.get(amm) ?? []).filter(
          (product) => {
            if (product.etat !== "AUTORISE") return false;
            if (!normalizedType) return true;
            let normalizedFunctions = normalizedFunctionsByProduct.get(product);
            if (!normalizedFunctions) {
              normalizedFunctions = (product.fonctions || "")
                .split("|")
                .map(normalizeCultureName);
              normalizedFunctionsByProduct.set(product, normalizedFunctions);
            }
            return normalizedFunctions.some((functionName) =>
              functionName.includes(normalizedType),
            );
          },
        );
        // Les cibles ne servent qu'aux produits réellement retournés. Ne pas
        // parcourir les usages des AMM exclues par le filtre d'opération.
        if (matchingProducts.length === 0) continue;

        const matchedCibles = new Set<string>();
        const usageAmm = getUsageAmm(matchingProducts[0]);
        let hasMatchingUsage = false;
        let hasBeeRestriction = false;
        let usageBeeWarning: BeeWarningLevel | undefined;
        for (const usage of activeUsagesByAmm.get(usageAmm) ?? []) {
          if (!normalizedCultureNames.has(usage.cultureKey)) continue;
          if (!cultureMatcher.allowsCondition(usage.usage)) continue;
          hasMatchingUsage = true;
          if (usage.cible) matchedCibles.add(usage.cible);
          const condition = usage.usage.condition ?? "";
          if (
            BEE_FLOWERING_RESTRICTION_PATTERN.test(condition) ||
            BEE_PRESENCE_RESTRICTION_PATTERN.test(condition) ||
            BEE_RESTRICTION_PATTERN.test(condition)
          ) {
            hasBeeRestriction = true;
            usageBeeWarning = BEE_FLOWERING_RESTRICTION_PATTERN.test(condition)
              ? "restricted-during-flowering"
              : BEE_PRESENCE_RESTRICTION_PATTERN.test(condition)
                ? "restricted-in-presence-of-bees"
                : "conditional";
          }
        }
        // Une AMM candidate peut n'avoir que des lignes restreintes à d'autres
        // cultures. Ni le produit ni ses cibles ne doivent alors être retournés.
        if (!hasMatchingUsage) continue;
        const dataBeeWarning = getBeeWarningForAmm(usageAmm);
        const beeWarning =
          dataBeeWarning === "restricted-during-flowering" ||
          usageBeeWarning === "restricted-during-flowering"
            ? "restricted-during-flowering"
            : dataBeeWarning === "restricted-in-presence-of-bees" ||
                usageBeeWarning === "restricted-in-presence-of-bees"
              ? "restricted-in-presence-of-bees"
              : dataBeeWarning || usageBeeWarning;
        if (hasBeeRestriction || beeWarning) beeRestrictedAmms.add(amm);
        if (beeWarning) beeWarningsByAmm.set(amm, beeWarning);
        ciblesByAmm.set(
          amm,
          Array.from(matchedCibles).sort((a, b) => a.localeCompare(b, "fr")),
        );

        for (const product of matchingProducts) {
          let classified = classifiedProducts.get(product);
          if (!classified) {
            classified = classifyProductWithData(product, riskPhrases);
            classifiedProducts.set(product, classified);
          }
          found.push(...expandCommercialNames(classified));
        }
      }

      found.sort((a, b) => {
        const nameA = a.matchedName || a.nom;
        const nameB = b.matchedName || b.nom;
        return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
      });
      return {
        products: found,
        ciblesByAmm,
        beeRestrictedAmms,
        beeWarningsByAmm,
      };
    },
  };
}
