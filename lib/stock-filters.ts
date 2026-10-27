import type { ProductUsage } from "./data-context";
import type { Product, ProductClassification } from "./product-service";
import { cultureMatchesSearch, getCultureSearchSet } from "./culture-aliases";
import { getUsagesForAmm, getUsagesForProduct } from "./product-usages";

export type StockFunctionFilter =
  | "Herbicide"
  | "Fongicide"
  | "Insecticide"
  | "Acaricide"
  | "Molluscicide"
  | "Régulateur de croissance"
  | "Autre";

export type StockStatusFilter =
  | "Retirés / PPNU"
  | "CMR"
  | "Toxiques"
  | "Retrait sous 3 mois"
  | "Homologués non CMR, non toxiques";

export interface StockFilters {
  functions: StockFunctionFilter[];
  statuses: StockStatusFilter[];
  cultures: string[];
}

export const EMPTY_STOCK_FILTERS: StockFilters = {
  functions: [],
  statuses: [],
  cultures: [],
};

export const STOCK_FUNCTION_OPTIONS: StockFunctionFilter[] = [
  "Herbicide",
  "Fongicide",
  "Insecticide",
  "Acaricide",
  "Molluscicide",
  "Régulateur de croissance",
  "Autre",
];

export const STOCK_STATUS_OPTIONS: StockStatusFilter[] = [
  "Retirés / PPNU",
  "CMR",
  "Toxiques",
  "Retrait sous 3 mois",
  "Homologués non CMR, non toxiques",
];

function normalize(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function productFunctions(product: Pick<Product, "fonctions">): string[] {
  return product.fonctions
    .split(/[;,|]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

// Ces valeurs décrivent une catégorie d'usage E-Phy, pas une culture de
// l'exploitation. Les cultures éventuellement visées sont précisées dans la
// condition réglementaire et restent gérées par usageMatchesFarmCulture.
const GENERIC_USAGE_CULTURES = new Set(["adjuvant", "adjuvants"]);

function usageMatchesFarmCulture(
  usage: ProductUsage,
  farmCulture: string,
): boolean {
  if (cultureMatchesSearch(usage.culture, farmCulture)) return true;

  // Pour certaines rubriques génériques E-Phy, notamment « Adjuvants »,
  // les cultures autorisées sont indiquées dans la condition réglementaire.
  if (!GENERIC_USAGE_CULTURES.has(normalize(usage.culture))) return false;
  if (!usage.condition?.trim()) return false;

  const normalizedCondition = normalize(usage.condition);
  return [...getCultureSearchSet(farmCulture)].some((candidate) =>
    normalizedCondition.includes(normalize(candidate)),
  );
}

/**
 * Ensemble normalisé des cultures et alias à vérifier pendant un filtrage du
 * stock. Il est construit une seule fois pour toute la liste, au lieu de
 * reconstruire les alias (Blé → Céréales → Grandes cultures) pour chaque
 * usage de chaque produit.
 */
export interface StockCultureMatcher {
  normalizedCultures: ReadonlySet<string>;
}

export function createStockCultureMatcher(
  farmCultures: string[],
): StockCultureMatcher {
  const normalizedCultures = new Set<string>();
  farmCultures.forEach((farmCulture) => {
    getCultureSearchSet(farmCulture).forEach((candidate) => {
      normalizedCultures.add(normalize(candidate));
    });
  });
  return { normalizedCultures };
}

function usageMatchesCultureMatcher(
  usage: ProductUsage,
  matcher: StockCultureMatcher,
): boolean {
  if (matcher.normalizedCultures.has(normalize(usage.culture))) return true;

  if (!GENERIC_USAGE_CULTURES.has(normalize(usage.culture))) return false;
  if (!usage.condition?.trim()) return false;

  const normalizedCondition = normalize(usage.condition);
  return [...matcher.normalizedCultures].some((culture) =>
    normalizedCondition.includes(culture),
  );
}

export function getStockFunctionFilter(
  product: Pick<Product, "fonctions">,
): StockFunctionFilter[] {
  const functions = productFunctions(product).map(normalize);
  const matchingFilters = STOCK_FUNCTION_OPTIONS.filter((option) => {
    if (option === "Autre") return false;
    if (option === "Régulateur de croissance") {
      return functions.some(
        (value) =>
          value.includes("regulateur de croissance") ||
          value.includes("subst. croiss") ||
          value.includes("substance de croissance"),
      );
    }
    return functions.some((value) => value.includes(normalize(option)));
  });

  // Nématicides, rodenticides et toutes les fonctions non listées dans les
  // cinq familles principales sont volontairement regroupés sous « Autre ».
  const hasOtherFunction = functions.some(
    (value) =>
      value.includes("nematicide") ||
      value.includes("rodenticide") ||
      !STOCK_FUNCTION_OPTIONS.some((option) => {
        if (option === "Autre") return false;
        if (option === "Régulateur de croissance") {
          return (
            value.includes("regulateur de croissance") ||
            value.includes("subst. croiss") ||
            value.includes("substance de croissance")
          );
        }
        return value.includes(normalize(option));
      }),
  );

  return hasOtherFunction || matchingFilters.length === 0
    ? [...matchingFilters, "Autre"]
    : matchingFilters;
}

export function getAvailableStockCultures(
  usages: Record<string, ProductUsage[]>,
): string[] {
  const values = new Set<string>();
  Object.values(usages).forEach((productUsages) => {
    productUsages.forEach((usage) => {
      const culture = usage.culture?.trim();
      if (!culture || GENERIC_USAGE_CULTURES.has(normalize(culture))) return;
      values.add(culture);
    });
  });
  return [...values].sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );
}

/**
 * Retourne true lorsqu'un produit possède des usages renseignés, mais aucune
 * de ses cultures ne correspond aux cultures configurées sur l'exploitation.
 * Un produit sans usage exploitable n'est pas signalé : son rattachement
 * cultural est inconnu, et non nécessairement obsolète.
 */
export function isStockProductOutsideFarmCultures(
  productOrAmm: Product | string,
  farmCultures: string[],
  usages: Record<string, ProductUsage[]>,
): boolean {
  if (farmCultures.length === 0) return false;

  const productUsages = (
    typeof productOrAmm === "string"
      ? getUsagesForAmm(productOrAmm, usages)
      : getUsagesForProduct(productOrAmm, usages)
  ).filter((usage) => usage.culture?.trim());
  if (productUsages.length === 0) return false;

  return !farmCultures.some((farmCulture) =>
    productUsages.some((usage) => usageMatchesFarmCulture(usage, farmCulture)),
  );
}

export interface StockFilterProduct {
  amm: string;
  classification: ProductClassification | string;
  fonctions: string;
  isCMR?: boolean;
  isToxique?: boolean;
  product?: Product;
}

export function stockProductMatchesFilters(
  item: StockFilterProduct,
  filters: StockFilters,
  productsByAmm: ReadonlyMap<string, Product>,
  usages: Record<string, ProductUsage[]>,
  withdrawalAmms: ReadonlySet<string>,
  cultureMatcher?: StockCultureMatcher,
): boolean {
  const product = item.product ?? productsByAmm.get(item.amm);
  const isRetired = item.classification === "retire";

  if (filters.statuses.length > 0) {
    const matchesStatus = filters.statuses.some((status) => {
      switch (status) {
        case "Retirés / PPNU":
          return isRetired;
        case "CMR":
          return item.isCMR ?? item.classification === "homologue_cmr";
        case "Toxiques":
          return item.isToxique ?? item.classification === "homologue_toxique";
        case "Retrait sous 3 mois":
          return withdrawalAmms.has(item.amm);
        case "Homologués non CMR, non toxiques":
          return item.classification === "homologue";
      }
    });
    if (!matchesStatus) return false;
  }

  if (filters.functions.length > 0) {
    if (
      !product ||
      !filters.functions.some((filter) =>
        getStockFunctionFilter(product).includes(filter),
      )
    ) {
      return false;
    }
  }

  if (filters.cultures.length > 0) {
    const productUsages = product
      ? getUsagesForProduct(product, usages)
      : getUsagesForAmm(item.amm, usages);
    const matchesCulture = cultureMatcher
      ? productUsages.some((usage) =>
          usageMatchesCultureMatcher(usage, cultureMatcher),
        )
      : filters.cultures.some((culture) =>
          productUsages.some((usage) =>
            usageMatchesFarmCulture(usage, culture),
          ),
        );
    if (!matchesCulture) return false;
  }

  return true;
}

export function countActiveStockFilters(filters: StockFilters): number {
  return (
    filters.functions.length + filters.statuses.length + filters.cultures.length
  );
}
