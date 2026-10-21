import type { Product } from "./product-service";

export type StockUnit = "L" | "Kg";

/**
 * Détermine l’unité de stock à partir de la formulation E‑Phy.
 * Les formulations solides sont suivies en kilogrammes ; les autres en litres.
 * Une formulation inconnue reste en litres par défaut pour préserver les
 * anciennes fiches et les autorisations Article 53 incomplètes.
 */
export function getProductQuantityUnit(
  product: Pick<Product, "formulation">,
): StockUnit {
  const formulation = (product.formulation ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const isSolid =
    /poudre|granul|microgranul|appat sur grains|appat granule|comprimes?|tablette|cristaux|batonnet|plaquette|cire|fumigene|fusee/.test(
      formulation,
    );

  return isSolid ? "Kg" : "L";
}
