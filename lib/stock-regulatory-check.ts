import { classifyProductWithData, Product, ProductClassification, RiskPhrase } from "./product-service";
import { StockItem } from "./store";

export interface StockRegulatoryChange {
  amm: string;
  productName: string;
  previousClassification: ProductClassification;
  currentClassification: ProductClassification;
  previousEtat: string;
  currentEtat: string;
  dateRetrait: string;
}

export interface StockRegulatoryCheckResult {
  changes: StockRegulatoryChange[];
  updatedStock: StockItem[];
}

function isClassification(value: string): value is ProductClassification {
  return value === "homologue" || value === "retire" || value === "homologue_cmr" || value === "homologue_toxique";
}

/**
 * Recalcule le statut réglementaire de chaque produit du stock à partir de
 * la base E‑Phy active. Seuls les changements réellement détectés sont retournés.
 */
export function checkStockRegulatoryStatus(
  stock: StockItem[],
  products: Product[],
  riskPhrases: Record<string, RiskPhrase[]>,
): StockRegulatoryCheckResult {
  const productsByAmm = new Map(products.map((product) => [product.amm, product]));
  const changes: StockRegulatoryChange[] = [];

  const updatedStock = stock.map((item) => {
    const currentProduct = productsByAmm.get(item.amm);
    if (!currentProduct) return item;

    const current = classifyProductWithData(currentProduct, riskPhrases);
    const previousClassification = isClassification(item.classification)
      ? item.classification
      : "homologue";
    const classificationChanged = previousClassification !== current.classification;
    const etatChanged = (item.etat || "") !== (current.etat || "");

    if (!classificationChanged && !etatChanged) return item;

    changes.push({
      amm: item.amm,
      productName: item.secondaryName || item.nom,
      previousClassification,
      currentClassification: current.classification,
      previousEtat: item.etat || "",
      currentEtat: current.etat || "",
      dateRetrait: current.dateRetrait || "",
    });

    return {
      ...item,
      classification: current.classification,
      etat: current.etat,
    };
  });

  return { changes, updatedStock };
}
