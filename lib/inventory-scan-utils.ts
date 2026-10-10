import type { ClassifiedProduct } from "./product-service";
import type { ResolvedInventoryDetection } from "./inventory-stock-resolution";

/** Ne compte que les fiches identifiées automatiquement avant toute correction manuelle. */
export function countAutomaticInventorySearches(
  detections: ResolvedInventoryDetection[],
): number {
  return detections.filter((detection) => Boolean(detection.product) && !detection.manuallyCorrected).length;
}

/**
 * Remplace une carte non identifiée par le choix explicite de l'utilisateur.
 * Cette correction est gratuite : elle ne participe jamais au décompte de la photo.
 */
export function applyManualInventoryCorrection(
  detections: ResolvedInventoryDetection[],
  containerIndex: number,
  product: ClassifiedProduct,
): ResolvedInventoryDetection[] {
  return detections.map((detection) => {
    if (detection.containerIndex !== containerIndex) return detection;

    return {
      ...detection,
      product,
      stockDisplayName: product.matchedName || undefined,
      namePreferredOverAmm: false,
      manuallyCorrected: true,
      reason: undefined,
    };
  });
}

export function getInventorySearchChargeNotice(
  remainingSearches: number,
  isPremium: boolean,
): string {
  const chargeRule = "Chaque bidon identifié automatiquement décompte une recherche. Les bidons non identifiés ou corrigés manuellement ne sont pas décomptés.";
  if (isPremium) return `${chargeRule}\n\nVotre abonnement Premium inclut les recherches illimitées.`;

  return `${chargeRule}\n\nIl vous reste ${remainingSearches} recherche${remainingSearches > 1 ? "s" : ""}. Si la photo identifie plus de bidons que votre solde, aucun résultat ne sera retenu et l’application vous proposera Premium.`;
}
