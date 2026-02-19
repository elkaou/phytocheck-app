import productsData from "@/assets/data/products.json";
import riskPhrasesData from "@/assets/data/risk-phrases.json";

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
  | "homologue_toxique";

export interface ClassifiedProduct extends Product {
  classification: ProductClassification;
  riskPhrases: RiskPhrase[];
  isCMR: boolean;
  isToxique: boolean;
}

// CMR codes: Cancérogène, Mutagène, Reprotoxique
const CMR_CODES = [
  "H340", "H341", // Mutagène
  "H350", "H351", // Cancérogène
  "H360", "H360D", "H360Df", "H360F", "H360FD", "H360Fd", // Reprotoxique
  "H361", "H361d", "H361f", "H361fd", "H362", // Reprotoxique suspecté
];

// Toxique codes: Toxicité aiguë élevée
const TOXIQUE_CODES = [
  "H300", "H301", // Mortel/Toxique en cas d'ingestion
  "H310", "H311", // Mortel/Toxique par contact cutané
  "H330", "H331", // Mortel/Toxique par inhalation
  "H304", // Mortel en cas d'ingestion et pénétration voies respiratoires
  "H370", "H371", // Toxique pour organes cibles (exposition unique)
  "H372", "H373", // Toxique pour organes cibles (exposition répétée)
];

const products: Product[] = productsData as Product[];
const riskPhrases: Record<string, RiskPhrase[]> = riskPhrasesData as Record<string, RiskPhrase[]>;

// Total count
export const TOTAL_PRODUCTS = products.length;
export const DB_UPDATE_DATE = "21/01/2026";

// Classify a product
export function classifyProduct(product: Product): ClassifiedProduct {
  const phrases = riskPhrases[product.amm] || [];
  const codes = phrases.map((p) => p.code);

  const isCMR = codes.some((code) => CMR_CODES.includes(code));
  const isToxique = codes.some((code) => TOXIQUE_CODES.includes(code));

  let classification: ProductClassification;

  if (product.etat === "RETIRE") {
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

// Search products by name or AMM
export function searchProducts(query: string, limit = 50): ClassifiedProduct[] {
  if (!query || query.trim().length < 2) return [];

  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const results: ClassifiedProduct[] = [];

  for (const product of products) {
    if (results.length >= limit) break;

    const normalizedName = product.nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const normalizedAMM = product.amm.toLowerCase();
    const normalizedSecondary = product.nomsSecondaires
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      normalizedName.includes(normalizedQuery) ||
      normalizedAMM.includes(normalizedQuery) ||
      normalizedSecondary.includes(normalizedQuery)
    ) {
      results.push(classifyProduct(product));
    }
  }

  return results;
}

// Get product by AMM
export function getProductByAMM(amm: string): ClassifiedProduct | null {
  const product = products.find((p) => p.amm === amm);
  if (!product) return null;
  return classifyProduct(product);
}

// Get classification label
export function getClassificationLabel(classification: ProductClassification): string {
  switch (classification) {
    case "homologue":
      return "Homologué";
    case "retire":
      return "Retiré";
    case "homologue_cmr":
      return "Homologué — CMR";
    case "homologue_toxique":
      return "Homologué — Toxique";
  }
}

// Get classification color
export function getClassificationColor(classification: ProductClassification): string {
  switch (classification) {
    case "homologue":
      return "#22C55E";
    case "retire":
      return "#EF4444";
    case "homologue_cmr":
      return "#F59E0B";
    case "homologue_toxique":
      return "#DC2626";
  }
}

// Get classification background color (lighter)
export function getClassificationBgColor(classification: ProductClassification): string {
  switch (classification) {
    case "homologue":
      return "#F0FDF4";
    case "retire":
      return "#FEF2F2";
    case "homologue_cmr":
      return "#FFFBEB";
    case "homologue_toxique":
      return "#FEF2F2";
  }
}
