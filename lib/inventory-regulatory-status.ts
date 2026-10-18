import {
  getClassificationBgColor,
  getClassificationColor,
  getProductBadgeFunctions,
  type ClassifiedProduct,
  type ProductClassification,
} from "./product-service";

export interface InventoryRegulatoryStatus {
  label: string;
  color: string;
  backgroundColor: string;
}

/**
 * Libellé court et immédiatement lisible dans les résultats d'ajout multiple.
 * Les teintes proviennent du système de classification déjà utilisé dans l'app.
 */
const LABELS: Record<ProductClassification, string> = {
  retire: "PPNU / retiré",
  homologue_toxique: "Toxique",
  homologue_cmr: "CMR",
  homologue: "Homologué",
  autorisation_urgence: "Autorisation 120 jours",
};

export function getInventoryRegulatoryStatus(
  product: Pick<ClassifiedProduct, "classification"> &
    Partial<Pick<ClassifiedProduct, "fonctions">>,
): InventoryRegulatoryStatus {
  const functionLabels =
    product.classification === "homologue"
      ? getProductBadgeFunctions(product.fonctions)
      : [];
  return {
    label:
      functionLabels.length > 0
        ? `${functionLabels.join(" / ")} non CMR, non toxique`
        : LABELS[product.classification],
    color: getClassificationColor(product.classification),
    backgroundColor: getClassificationBgColor(product.classification),
  };
}
