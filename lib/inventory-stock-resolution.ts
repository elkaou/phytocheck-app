import {
  ClassifiedProduct,
  Product,
  RiskPhrase,
  classifyProductWithData,
  createEmergencyAuthorizationProduct,
  searchProducts,
} from "./product-service";
import {
  EmergencyAuthorization,
  searchEmergencyAuthorizations,
} from "./emergency-authorizations";

/** Identité d'un seul bidon renvoyée par l'analyse de la photo. */
export interface InventoryOcrDetection {
  containerIndex: number;
  productName: string;
  amm: string;
}

export interface ResolvedInventoryDetection {
  containerIndex: number;
  detectedName: string;
  detectedAmm: string;
  product: ClassifiedProduct | null;
  /** Nom qui sera conservé dans le stock quand il s'agit d'un nom secondaire. */
  stockDisplayName?: string;
  reason?: "not_found";
}

function normalize(value: string): string {
  return value
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™©℠]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getKnownNames(product: ClassifiedProduct): string[] {
  return [product.nom, ...product.nomsSecondaires.split("|")]
    .map((name) => normalize(name))
    .filter(Boolean);
}

/**
 * Retourne un score de rapprochement conservateur. Cette fonction ne sert pas à
 * proposer des variantes : elle choisit une unique fiche quand elle est
 * suffisamment identifiable, ou retourne null quand l'image reste ambiguë.
 */
function getNameMatchScore(product: ClassifiedProduct, detectedName: string): number {
  const detected = normalize(detectedName);
  if (!detected) return 0;

  let score = 0;
  for (const name of getKnownNames(product)) {
    if (name === detected) score = Math.max(score, 100);
    else if (name.length >= 4 && detected.includes(name)) score = Math.max(score, 82);
    else if (detected.length >= 4 && name.includes(detected)) score = Math.max(score, 76);
  }
  return score;
}

function getSingleBestProduct(
  detectedName: string,
  products: Product[],
  riskPhrases: Record<string, RiskPhrase[]>,
): ClassifiedProduct | null {
  const matches = searchProducts(detectedName, 50, products, riskPhrases)
    .map((product) => ({ product, score: getNameMatchScore(product, detectedName) }))
    .filter(({ score }) => score >= 76)
    .sort((left, right) => right.score - left.score || left.product.nom.localeCompare(right.product.nom, "fr"));

  const bestMatch = matches[0];
  if (!bestMatch) return null;

  // Deux fiches réglementaires différentes avec le même score ne doivent pas
  // être départagées arbitrairement : le bidon restera « non identifié ».
  const isAmbiguous = matches
    .slice(1)
    .some((match) => match.score === bestMatch.score && match.product.amm !== bestMatch.product.amm);
  return isAmbiguous ? null : bestMatch.product;
}

/**
 * Convertit chaque bidon détecté en une unique fiche réglementaire.
 * Règle volontairement stricte : AMM exact > meilleur nom commercial/secondaire.
 * En cas de doute, le bidon est signalé comme non identifié, sans proposer une
 * liste de produits alternatifs qui pourrait conduire à une mauvaise saisie.
 */
export function resolveInventoryDetections(
  detections: InventoryOcrDetection[],
  products: Product[],
  riskPhrases: Record<string, RiskPhrase[]>,
  authorizations: EmergencyAuthorization[] = [],
  now: Date = new Date(),
): ResolvedInventoryDetection[] {
  return detections.map((detection) => {
    const amm = detection.amm.replace(/\D/g, "");
    const exactAmmProduct = amm
      ? products.find((product) => product.amm === amm)
      : undefined;

    const product = exactAmmProduct
      ? classifyProductWithData(exactAmmProduct, riskPhrases)
      : getSingleBestProduct(detection.productName, products, riskPhrases);

    if (product) {
      const detectedName = normalize(detection.productName);
      const secondaryName = product.nomsSecondaires
        .split("|")
        .map((name) => name.trim())
        .find((name) => normalize(name) === detectedName);

      return {
        containerIndex: detection.containerIndex,
        detectedName: detection.productName,
        detectedAmm: amm,
        product,
        stockDisplayName: secondaryName,
      };
    }

    const emergency = amm
      ? searchEmergencyAuthorizations(authorizations, amm, now)[0]
      : searchEmergencyAuthorizations(authorizations, detection.productName, now)[0];

    if (emergency) {
      return {
        containerIndex: detection.containerIndex,
        detectedName: detection.productName,
        detectedAmm: amm,
        product: createEmergencyAuthorizationProduct(emergency),
      };
    }

    return {
      containerIndex: detection.containerIndex,
      detectedName: detection.productName,
      detectedAmm: amm,
      product: null,
      reason: "not_found",
    };
  });
}
