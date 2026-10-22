import productsData from "@/assets/data/products.json";
import riskPhrasesData from "@/assets/data/risk-phrases.json";
import type { EmergencyAuthorization } from "./emergency-authorizations";

// Types
export interface Product {
  amm: string;
  nom: string;
  nomsSecondaires: string;
  titulaire: string;
  gammeUsage: string;
  substancesActives: string;
  fonctions: string;
  formulation: string;
  etat: string; // "AUTORISE" | "RETIRE"
  dateRetrait: string;
  dateAutorisation: string;
}

export interface RiskPhrase {
  code: string;
  libelle: string;
}

export type ProductClassification =
  | "homologue"
  | "retire"
  | "homologue_cmr"
  | "homologue_toxique"
  | "autorisation_urgence";

export interface ClassifiedProduct extends Product {
  classification: ProductClassification;
  riskPhrases: RiskPhrase[];
  isCMR: boolean;
  isToxique: boolean;
  matchedName?: string; // Nom secondaire par lequel le produit a été trouvé
}

export interface StockNameRecord {
  amm: string;
  nom: string;
  secondaryName?: string;
}

export function normalizeCommercialName(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©℠]/g, "")
    .replace(/[’']/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function getDisplayedCommercialName(product: ClassifiedProduct): string {
  return product.matchedName || product.nom;
}

export function isProductNameInStock(
  product: ClassifiedProduct,
  stock: readonly StockNameRecord[],
): boolean {
  const displayedName = normalizeCommercialName(
    getDisplayedCommercialName(product),
  );
  return stock.some(
    (item) =>
      item.amm === product.amm &&
      normalizeCommercialName(item.secondaryName || item.nom) === displayedName,
  );
}

export function getCommercialNameType(
  matchedName?: string,
): "principal" | "secondaire" {
  return matchedName?.trim() ? "secondaire" : "principal";
}

/**
 * Crée une fiche stockable quand une AMM est uniquement publiée au titre de
 * l’article 53 et n’existe pas encore dans le catalogue E‑Phy téléchargé.
 * Elle reste explicitement distincte d’une homologation E‑Phy permanente.
 */
export function createEmergencyAuthorizationProduct(
  authorization: EmergencyAuthorization,
): ClassifiedProduct {
  return {
    amm: authorization.amm,
    nom: authorization.productName,
    nomsSecondaires: "",
    titulaire: "Non renseigné dans la décision Article 53",
    gammeUsage: "Autorisation d’urgence Article 53",
    substancesActives: authorization.activeSubstances,
    fonctions: "Autorisation d’urgence",
    formulation: "",
    etat: "AUTORISATION_ARTICLE_53",
    dateRetrait: "",
    dateAutorisation: authorization.issuedAt,
    classification: "autorisation_urgence",
    riskPhrases: [],
    isCMR: false,
    isToxique: false,
  };
}

// CMR codes: Cancérogène, Mutagène, Reprotoxique
const CMR_CODES = [
  "H340",
  "H341", // Mutagène
  "H350",
  "H351", // Cancérogène
  "H360",
  "H360D",
  "H360Df",
  "H360F",
  "H360FD",
  "H360Fd", // Reprotoxique
  "H361",
  "H361d",
  "H361f",
  "H361fd",
  "H362", // Reprotoxique suspecté
];

// Toxique codes: Toxicité aiguë élevée
const TOXIQUE_CODES = [
  "H300",
  "H301", // Mortel/Toxique en cas d'ingestion
  "H310",
  "H311", // Mortel/Toxique par contact cutané
  "H330",
  "H331", // Mortel/Toxique par inhalation
  "H304", // Mortel en cas d'ingestion et pénétration voies respiratoires
  "H370",
  "H371", // Toxique pour organes cibles (exposition unique)
  "H372",
  "H373", // Toxique pour organes cibles (exposition répétée)
];

const products: Product[] = productsData as Product[];
const riskPhrases: Record<string, RiskPhrase[]> = riskPhrasesData as Record<
  string,
  RiskPhrase[]
>;

// Total count
export const TOTAL_PRODUCTS = products.length;
export const DB_UPDATE_DATE = "22/10/2026";

// Détermine si un produit est retiré, en se basant sur le champ etat
// OU sur la dateRetrait si etat est vide (cas du CSV E-Phy où la colonne peut être absente)
function isProductRetired(product: Product): boolean {
  if (product.etat === "RETIRE") return true;
  if (product.etat === "AUTORISE") return false;
  // etat vide : on se base sur la dateRetrait
  if (product.dateRetrait) {
    const parts = product.dateRetrait.split("/");
    if (parts.length === 3) {
      const retrait = new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0]),
      );
      return retrait <= new Date();
    }
  }
  return false;
}

// Classify a product
export function classifyProduct(product: Product): ClassifiedProduct {
  const phrases = riskPhrases[product.amm] || [];
  const codes = phrases.map((p) => p.code);

  const isCMR = codes.some((code) => CMR_CODES.includes(code));
  const isToxique = codes.some((code) => TOXIQUE_CODES.includes(code));

  let classification: ProductClassification;

  if (isProductRetired(product)) {
    classification = "retire";
  } else if (isCMR) {
    classification = "homologue_cmr";
  } else if (isToxique) {
    classification = "homologue_toxique";
  } else {
    classification = "homologue";
  }

  return {
    ...product,
    classification,
    riskPhrases: phrases,
    isCMR,
    isToxique,
  };
}

// Search products by active substance (avec données dynamiques optionnelles)
// Génère une carte par nom secondaire : si un produit a 2 noms secondaires, 2 cartes sont créées
export function searchBySubstance(
  query: string,
  limit = 10000,
  dynamicProducts?: Product[],
  dynamicRiskPhrases?: Record<string, RiskPhrase[]>,
): ClassifiedProduct[] {
  if (!query || query.trim().length < 2) return [];
  const dataProducts = dynamicProducts ?? products;
  const dataRiskPhrases = dynamicRiskPhrases ?? riskPhrases;

  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: ClassifiedProduct[] = [];
  for (const product of dataProducts) {
    const normalizedSubstances = product.substancesActives
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!normalizedSubstances.includes(normalizedQuery)) continue;

    const classified = classifyProductWithData(product, dataRiskPhrases);

    // Toujours ajouter une carte pour le nom principal (sans matchedName)
    results.push(classified);

    if (product.nomsSecondaires && product.nomsSecondaires.trim()) {
      // Une carte supplémentaire par nom secondaire :
      // matchedName = nom secondaire (affiché en noir comme titre de la carte)
      // nom = nom principal (affiché en bleu en dessous)
      const secondaryNames = product.nomsSecondaires
        .split(" | ")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sn of secondaryNames) {
        results.push({
          ...classified,
          matchedName: sn,
        });
      }
    }
  }

  // Trier par ordre alphabétique sur le nom affiché (matchedName si présent, sinon nom)
  results.sort((a, b) => {
    const nameA = a.matchedName || a.nom;
    const nameB = b.matchedName || b.nom;
    return nameA.localeCompare(nameB, "fr", { sensitivity: "base" });
  });

  return results.slice(0, limit);
}

/**
 * Extrait le nom réglementaire de la matière active entre parenthèses.
 * Les données E‑Phy contiennent généralement le nom français puis le nom
 * harmonisé entre parenthèses, suivi de la concentration.
 */
function extractActiveSubstanceName(segment: string): string {
  let depth = 0;
  let end = -1;
  let start = -1;

  // Recherche le dernier groupe parenthésé en gérant les parenthèses imbriquées
  // présentes dans certains noms CAS.
  for (let index = segment.length - 1; index >= 0; index -= 1) {
    const character = segment[index];
    if (character === ")") {
      if (end === -1) end = index;
      depth += 1;
    } else if (character === "(" && depth > 0) {
      depth -= 1;
      if (depth === 0) {
        start = index;
        break;
      }
    }
  }

  if (start >= 0 && end > start) {
    return segment.slice(start + 1, end).trim();
  }

  return segment
    .replace(
      /\s+\d+(?:[.,]\d+)?\s*(?:g\s*\/\s*(?:L|kg)|mg\s*\/\s*(?:L|kg)|%)(?:\s*)$/i,
      "",
    )
    .trim();
}

/** Normalise un nom de matière active pour comparer des ensembles sans tenir compte des accents. */
export function normalizeActiveSubstanceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Retourne les matières actives distinctes d'une formulation, sans les doses.
 * L'ordre d'affichage des données E‑Phy est conservé.
 */
export function extractActiveSubstanceNames(
  substancesActives: string,
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];

  for (const segment of substancesActives.split(" | ")) {
    const name = extractActiveSubstanceName(segment);
    const normalized = normalizeActiveSubstanceName(name);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    names.push(name);
  }

  return names;
}

/**
 * Recherche les produits homologués dont l'ensemble des matières actives est
 * exactement identique à celui demandé. Les concentrations ne sont pas
 * comparées : la recherche porte sur les matières actives elles-mêmes.
 */
export function searchByExactSubstances(
  substances: string[],
  limit = 10000,
  dynamicProducts?: Product[],
  dynamicRiskPhrases?: Record<string, RiskPhrase[]>,
): ClassifiedProduct[] {
  const requested = new Set(
    substances.map(normalizeActiveSubstanceName).filter(Boolean),
  );
  if (requested.size === 0) return [];

  const dataProducts = dynamicProducts ?? products;
  const dataRiskPhrases = dynamicRiskPhrases ?? riskPhrases;
  const results: ClassifiedProduct[] = [];

  for (const product of dataProducts) {
    const actual = new Set(
      extractActiveSubstanceNames(product.substancesActives).map(
        normalizeActiveSubstanceName,
      ),
    );
    if (actual.size !== requested.size) continue;
    if (![...requested].every((substance) => actual.has(substance))) continue;

    const classified = classifyProductWithData(product, dataRiskPhrases);
    // La page dédiée porte sur les produits homologués ; les produits retirés
    // restent accessibles depuis leur fiche, mais ne sont pas proposés ici.
    if (classified.classification === "retire") continue;

    // Une même AMM peut correspondre à plusieurs noms commerciaux. Chaque
    // nom doit rester une carte indépendante afin que le stock soit comparé
    // au nom réellement enregistré, et non à l'AMM seule.
    results.push(classified);
    for (const secondaryName of (product.nomsSecondaires || "")
      .split("|")
      .map((name) => name.trim())
      .filter(Boolean)) {
      results.push({ ...classified, matchedName: secondaryName });
    }
    if (results.length >= limit) break;
  }

  return results.sort((a, b) =>
    a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }),
  );
}

/** Place en tête les produits dont l'AMM est déjà présente dans le stock. */
export function sortProductsWithStockFirst(
  results: ClassifiedProduct[],
  stockedAmms: ReadonlySet<string>,
): ClassifiedProduct[] {
  return [...results].sort((a, b) => {
    const inStockDifference =
      Number(stockedAmms.has(b.amm)) - Number(stockedAmms.has(a.amm));
    if (inStockDifference !== 0) return inStockDifference;
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  });
}

/** Place en tête uniquement les noms commerciaux réellement enregistrés. */
export function sortProductsWithStockItemsFirst(
  results: ClassifiedProduct[],
  stock: readonly StockNameRecord[],
): ClassifiedProduct[] {
  return [...results].sort((a, b) => {
    const inStockDifference =
      Number(isProductNameInStock(b, stock)) -
      Number(isProductNameInStock(a, stock));
    if (inStockDifference !== 0) return inStockDifference;
    return getDisplayedCommercialName(a).localeCompare(
      getDisplayedCommercialName(b),
      "fr",
      { sensitivity: "base" },
    );
  });
}

/** Filtre les produits retirés quand l’affichage homologué est actif. */
export function filterHomologatedProducts(
  results: ClassifiedProduct[],
  includeRetired: boolean,
): ClassifiedProduct[] {
  return includeRetired
    ? results
    : results.filter((product) => product.classification !== "retire");
}

// Search products by name or AMM (avec données dynamiques optionnelles)
export function searchProducts(
  query: string,
  limit = 50,
  dynamicProducts?: Product[],
  dynamicRiskPhrases?: Record<string, RiskPhrase[]>,
): ClassifiedProduct[] {
  const dataProducts = dynamicProducts ?? products;
  const dataRiskPhrases = dynamicRiskPhrases ?? riskPhrases;
  return _searchProducts(query, limit, dataProducts, dataRiskPhrases);
}

function _searchProducts(
  query: string,
  limit: number,
  dataProducts: Product[],
  dataRiskPhrases: Record<string, RiskPhrase[]>,
): ClassifiedProduct[] {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©℠]/g, "");

  // Deux listes : priorité haute (nom principal / AMM) et basse (nom secondaire)
  const primaryResults: ClassifiedProduct[] = [];
  const secondaryResults: ClassifiedProduct[] = [];

  for (const product of dataProducts) {
    // Arrêter si on a déjà assez de résultats au total
    if (primaryResults.length + secondaryResults.length >= limit) break;

    const normalizedName = product.nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[®™©℠]/g, "");
    const normalizedAMM = product.amm.toLowerCase();
    const normalizedSecondary = product.nomsSecondaires
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[®™©℠]/g, "");

    if (
      normalizedName.includes(normalizedQuery) ||
      normalizedAMM.includes(normalizedQuery)
    ) {
      // Match par nom principal ou AMM → priorité haute
      primaryResults.push(classifyProductWithData(product, dataRiskPhrases));
    } else if (normalizedSecondary.includes(normalizedQuery)) {
      // Match par nom secondaire → une carte par nom secondaire qui matche
      if (product.nomsSecondaires) {
        const secondaryNames = product.nomsSecondaires.split(" | ");
        for (const sn of secondaryNames) {
          if (primaryResults.length + secondaryResults.length >= limit) break;
          const normalizedSN = sn
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[®™©℠]/g, "");
          if (normalizedSN.includes(normalizedQuery)) {
            const classified = classifyProductWithData(
              product,
              dataRiskPhrases,
            );
            classified.matchedName = sn.trim();
            secondaryResults.push(classified);
          }
        }
      }
    }
  }

  // Fusionner : d'abord les résultats par nom principal, puis par nom secondaire
  const merged = [...primaryResults, ...secondaryResults];
  return merged.slice(0, limit);
}

// Classify avec données dynamiques
export function classifyProductWithData(
  product: Product,
  dataRiskPhrases: Record<string, RiskPhrase[]>,
): ClassifiedProduct {
  const phrases = dataRiskPhrases[product.amm] || [];
  const codes = phrases.map((p) => p.code);
  const isCMR = codes.some((code) => CMR_CODES.includes(code));
  const isToxique = codes.some((code) => TOXIQUE_CODES.includes(code));
  let classification: ProductClassification;
  if (isProductRetired(product)) {
    classification = "retire";
  } else if (isCMR) {
    classification = "homologue_cmr";
  } else if (isToxique) {
    classification = "homologue_toxique";
  } else {
    classification = "homologue";
  }
  return { ...product, classification, riskPhrases: phrases, isCMR, isToxique };
}

// Get product by AMM (optionally filter by name if multiple products share the same AMM)
export function getProductByAMM(
  amm: string,
  preferredName?: string,
  dynamicProducts?: Product[],
  dynamicRiskPhrases?: Record<string, RiskPhrase[]>,
): ClassifiedProduct | null {
  const dataProducts = dynamicProducts ?? products;
  const dataRiskPhrases = dynamicRiskPhrases ?? riskPhrases;
  const matchingProducts = dataProducts.filter((p) => p.amm === amm);
  if (matchingProducts.length === 0) return null;

  // If preferred name is provided, try to find exact match
  if (preferredName && matchingProducts.length > 1) {
    const exactMatch = matchingProducts.find(
      (p) =>
        p.nom.toLowerCase() === preferredName.toLowerCase() ||
        p.nomsSecondaires.toLowerCase().includes(preferredName.toLowerCase()),
    );
    if (exactMatch) return classifyProductWithData(exactMatch, dataRiskPhrases);
  }

  // Return first match
  return classifyProductWithData(matchingProducts[0], dataRiskPhrases);
}

const BADGE_FUNCTIONS: Array<{ match: string; label: string }> = [
  { match: "herbicide", label: "Herbicide" },
  { match: "fongicide", label: "Fongicide" },
  { match: "insecticide", label: "Insecticide" },
  { match: "acaricide", label: "Acaricide" },
  { match: "molluscicide", label: "Molluscicide" },
  { match: "nématicide", label: "Nématicide" },
  { match: "rodenticide", label: "Rodenticide" },
  { match: "taupicide", label: "Taupicide" },
  { match: "corvicide", label: "Corvicide" },
  { match: "bactéricide", label: "Bactéricide" },
  { match: "virucide", label: "Virucide" },
  { match: "régulateur de croissance", label: "Régulateur de croissance" },
  { match: "répulsif", label: "Répulsif" },
  { match: "désinfectant", label: "Désinfectant" },
  { match: "dévitalisation", label: "Dévitalisant" },
  { match: "destruct. mousses", label: "Destructeur de mousses" },
  { match: "éclaircissage", label: "Éclaircissant" },
  { match: "traitement des maladies à virus", label: "Virucide" },
];

/**
 * Retourne les fonctions phytosanitaires utiles à un badge court.
 * Les fonctions E‑Phy peuvent être combinées avec « | » et contenir aussi
 * des catégories non phytosanitaires (engrais, adjuvant, amendement, etc.).
 */
export function getProductBadgeFunctions(fonctions?: string): string[] {
  if (!fonctions) return [];

  const normalized = fonctions
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const labels: string[] = [];
  for (const entry of BADGE_FUNCTIONS) {
    const match = entry.match.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(match) && !labels.includes(entry.label)) {
      labels.push(entry.label);
    }
  }
  return labels;
}

// Get classification label
export function getClassificationLabel(
  classification: ProductClassification,
  fonctions?: string,
): string {
  switch (classification) {
    case "homologue":
      const functionLabels = getProductBadgeFunctions(fonctions);
      return functionLabels.length > 0
        ? `${functionLabels.join(" / ")} non CMR, non toxique`
        : "Homologué non CMR, non toxique";
    case "retire":
      return "Retiré";
    case "homologue_cmr":
      return "Homologué — CMR";
    case "homologue_toxique":
      return "Homologué — Toxique";
    case "autorisation_urgence":
      return "Autorisation d’urgence — Article 53";
  }
}

// Get classification color
export function getClassificationColor(
  classification: ProductClassification,
): string {
  switch (classification) {
    case "homologue":
      return "#22C55E";
    case "retire":
      return "#EF4444";
    case "homologue_cmr":
      return "#F59E0B";
    case "homologue_toxique":
      return "#C2410C"; // Orange foncé
    case "autorisation_urgence":
      return "#1D4ED8";
  }
}

// Get classification background color (lighter)
export function getClassificationBgColor(
  classification: ProductClassification,
): string {
  switch (classification) {
    case "homologue":
      return "#F0FDF4";
    case "retire":
      return "#FEF2F2";
    case "homologue_cmr":
      return "#FFFBEB";
    case "homologue_toxique":
      return "#FFF7ED"; // Orange clair
    case "autorisation_urgence":
      return "#EFF6FF";
  }
}
