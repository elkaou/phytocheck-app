/**
 * Normalise la saisie numérique au fil de la frappe.
 * Le pavé numérique iOS français propose une virgule ; le stockage emploie
 * un point, compris de façon identique par iOS et Android.
 */
export function normalizeStockQuantityInput(value: string): string {
  return value.replace(/,/g, ".");
}

/**
 * Converts a user-entered stock quantity into a positive number.
 * Both French decimal commas and decimal points are accepted so the
 * same value works with iOS and Android numeric keyboards.
 */
export function parseStockQuantity(value: string, allowZero = false): number | null {
  const normalized = normalizeStockQuantityInput(value.trim().replace(/\s/g, ""));

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return null;
  }

  const quantity = Number(normalized);
  const isValid = allowZero ? quantity >= 0 : quantity > 0;
  return Number.isFinite(quantity) && isValid ? quantity : null;
}

/**
 * Formate une quantité pour l’affichage sans exposer les imprécisions binaires
 * (par exemple 0.19999999999999996 après un ancien incrément).
 */
export function formatStockQuantity(value: number): string {
  if (!Number.isFinite(value)) return "0";

  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 6 }).format(rounded);
}
