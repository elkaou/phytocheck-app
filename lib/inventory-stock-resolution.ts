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
  /** Une AMM lue contredisait le nom commercial et a donc été écartée. */
  reason?: "not_found" | "identity_conflict";
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

/**
 * Retourne les formulations utiles issues de l'étiquette lue. Le nom commercial
 * est parfois suivi du dosage ou de la formulation (ex. « SWITCH 62,5 WG ») :
 * tester ses premiers mots conserve la détection sans accepter un mot isolé
 * interne à une description.
 */
function getSearchTerms(detectedName: string): string[] {
  const normalized = normalize(detectedName);
  if (!normalized) return [];

  const terms = new Set<string>([normalized]);
  const words = normalized.split(" ").filter(Boolean);
  for (let length = 1; length <= Math.min(words.length, 4); length += 1) {
    terms.add(words.slice(0, length).join(" "));
  }
  return Array.from(terms);
}

/**
 * Retourne un score de rapprochement conservateur. Cette fonction ne sert pas à
 * proposer des variantes : elle choisit une unique fiche quand elle est
 * suffisamment identifiable, ou retourne null quand l'image reste ambiguë.
 */
function getNameMatchScore(product: Product, detectedName: string): number {
  const detected = normalize(detectedName);
  if (!detected) return 0;

  const primaryName = normalize(product.nom);
  const secondaryNames = product.nomsSecondaires
    .split("|")
    .map((name) => normalize(name))
    .filter(Boolean);

  // Un nom commercial principal exact est plus fiable qu'un nom secondaire
  // identique. Cela évite par exemple de confondre SWITCH avec les spécialités
  // dont SWITCH est seulement un nom associé.
  if (primaryName === detected) return 120;
  if (secondaryNames.some((name) => name === detected)) return 110;

  let score = 0;
  if (primaryName.length >= 4 && detected.includes(primaryName)) score = Math.max(score, 94);
  else if (detected.length >= 4 && primaryName.includes(detected)) score = Math.max(score, 88);

  for (const name of secondaryNames) {
    if (name.length >= 4 && detected.includes(name)) score = Math.max(score, 84);
    else if (detected.length >= 4 && name.includes(detected)) score = Math.max(score, 80);
  }
  return score;
}

function hasSufficientNameMatch(product: Product, detectedName: string): boolean {
  return getNameMatchScore(product, detectedName) >= 80;
}

function getSingleBestProduct(
  detectedName: string,
  products: Product[],
  riskPhrases: Record<string, RiskPhrase[]>,
): ClassifiedProduct | null {
  const candidatesByAmm = new Map<string, ClassifiedProduct>();
  for (const term of getSearchTerms(detectedName)) {
    for (const candidate of searchProducts(term, 50, products, riskPhrases)) {
      // searchProducts peut retourner une même AMM pour le nom principal et un
      // nom secondaire. Une seule fiche réglementaire doit rester candidate.
      candidatesByAmm.set(candidate.amm, candidate);
    }
  }

  const matches = Array.from(candidatesByAmm.values())
    .map((product) => ({ product, score: getNameMatchScore(product, detectedName) }))
    .filter(({ score }) => score >= 80)
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

    // Une AMM ne peut être utilisée que si elle est lue sur la même étiquette
    // que le nom commercial. En cas de contradiction, l'ancienne logique
    // sélectionnait une fiche erronée (par exemple OMITE pour SWITCH). Le nom
    // et l'AMM peuvent tous deux avoir été lus sur des bidons voisins : aucun ne
    // doit donc être retenu automatiquement dans ce cas.
    const ammContradictsName = Boolean(
      exactAmmProduct &&
        detection.productName.trim() &&
        !hasSufficientNameMatch(exactAmmProduct, detection.productName),
    );
    if (ammContradictsName) {
      return {
        containerIndex: detection.containerIndex,
        detectedName: detection.productName,
        detectedAmm: amm,
        product: null,
        reason: "identity_conflict" as const,
      };
    }

    const product = exactAmmProduct
      ? classifyProductWithData(exactAmmProduct, riskPhrases)
      : detection.productName.trim()
        ? getSingleBestProduct(detection.productName, products, riskPhrases)
        : null;

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
